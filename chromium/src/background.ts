import { detectVariant, readArcMarker, resolveVariant, type ChromiumVariant } from './variant';
import { discoverPort, DEFAULT_PORT_RANGE } from './discovery';
import { requestPairing, pollPairStatus } from './pairing';
import { connect } from './wsclient';
import { buildHello, buildTabsEvent, buildRes, buildErr, type ServerReq, type Tab } from './protocol';
import { chromeTabToProtocolTab } from './tabs';
import { Backoff, classifyClose } from './reconnect';

// Mutable: starts from UA detection (which can't see Arc) and is upgraded to
// 'arc' by resolveStartupVariant() before the first pairing/connect. Used for
// pairing, the WS URL, the hello message, and every tab snapshot, so resolving
// it up front keeps the browser identity consistent across all of them.
let variant: ChromiumVariant = detectVariant({
  userAgent: navigator.userAgent,
  brave: (navigator as { brave?: unknown }).brave,
});

/**
 * Probe an open page for Arc's marker CSS variable. Arc masks its User-Agent
 * as Chrome, so the only reliable signal is injecting readArcMarker() into a
 * real http(s) page. Returns false when no scriptable page exists yet or the
 * injection fails — callers fall back to the UA variant and retry next start.
 */
async function probeIsArc(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id == null) continue;
      try {
        const [res] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: readArcMarker,
          // MAIN world so getComputedStyle reads the page's own :root — Arc
          // injects its --arc-palette-* variables onto the page, and MAIN
          // guarantees CSSOM visibility regardless of isolated-world quirks.
          world: 'MAIN',
        });
        if (res?.result === true) return true;
      } catch {
        // Restricted page (e.g. the Web Store) — try the next tab.
      }
    }
  } catch {
    // tabs/scripting unavailable — treat as "not Arc" and retry later.
  }
  return false;
}

/**
 * Resolve the effective variant before pairing. Once Arc is confirmed the
 * result is cached in extension storage, so subsequent starts skip the probe
 * and the very first pairing is already keyed to 'arc' (no double prompt).
 */
async function resolveStartupVariant(): Promise<ChromiumVariant> {
  const uaVariant = detectVariant({
    userAgent: navigator.userAgent,
    brave: (navigator as { brave?: unknown }).brave,
  });
  const { isArc } = await chrome.storage.local.get('isArc');
  if (isArc === true) return resolveVariant(uaVariant, true);
  const detected = await probeIsArc();
  if (detected) await chrome.storage.local.set({ isArc: true });
  return resolveVariant(uaVariant, detected);
}

const backoff = new Backoff({ baseMs: 1000, maxMs: 30000, factor: 2 });
let ws: WebSocket | null = null;
// Guards against overlapping connection attempts. In an MV3 service worker,
// start() can be triggered concurrently by module load, the keepalive alarm,
// and the reconnect timer — without this, those stack into a connection storm.
let connecting = false;

async function getToken(): Promise<string | null> {
  const { token } = await chrome.storage.local.get('token');
  return token ?? null;
}

async function ensurePaired(port: number): Promise<string | null> {
  const existing = await getToken();
  if (existing) return existing;
  try {
    const pairingId = await requestPairing(port, variant, fetch);
    for (let i = 0; i < 5; i++) {
      const status = await pollPairStatus(port, pairingId, fetch);
      if (status.status === 'approved' && status.token) {
        await chrome.storage.local.set({ token: status.token });
        return status.token;
      }
      if (status.status === 'denied') return null;
      // timed_out / unknown → retry the poll
    }
    return null;
  } catch {
    // The pairing endpoints can reject — HTTP 429 while the launcher is
    // throttling, the launcher not being up yet, or a transient network
    // failure. Treat any of these as "not paired yet" so the caller backs off
    // and retries, rather than surfacing an uncaught promise rejection.
    return null;
  }
}

async function collectTabs(): Promise<Tab[]> {
  const raw = await chrome.tabs.query({});
  return raw.map((t) => chromeTabToProtocolTab(t, variant));
}

function send(obj: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

async function pushSnapshot(kind: 'snapshot' | 'changed') {
  send(buildTabsEvent(kind, await collectTabs()));
}

async function handleReq(req: ServerReq) {
  try {
    switch (req.method) {
      case 'tabs.activate': {
        const t = await chrome.tabs.update(Number(req.params.tabId), { active: true });
        // tabs.update only changes the active tab WITHIN Chrome. Focus the
        // window too so Chrome comes to the foreground — otherwise the switch
        // happens in a background window the user never sees.
        if (t?.windowId != null) {
          await chrome.windows.update(t.windowId, { focused: true });
        }
        send(buildRes(req.id, { activated: true }));
        break;
      }
      case 'tabs.close': {
        await chrome.tabs.remove(Number(req.params.tabId));
        send(buildRes(req.id, { closed: true }));
        break;
      }
      case 'tabs.open': {
        if (req.params.newWindow) {
          const win = await chrome.windows.create({ url: req.params.url, focused: true });
          const tab = win?.tabs?.[0];
          send(buildRes(req.id, { tabId: String(tab?.id ?? '') }));
        } else {
          const tab = await chrome.tabs.create({ url: req.params.url, active: true });
          if (tab?.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
          send(buildRes(req.id, { tabId: String(tab.id ?? '') }));
        }
        break;
      }
      case 'search.web': {
        // Uses the browser's configured default search engine.
        await chrome.search.query({ text: req.params.text, disposition: 'NEW_TAB' });
        send(buildRes(req.id, { searched: true }));
        break;
      }
      case 'page.snapshot': {
        // MIRRORS extractSnapshot() in pagescript.ts — keep in sync. Runs in page
        // context, so it is fully self-contained (no imports / outer-scope refs)
        // and uses location.href for the url instead of a passed-in argument.
        let result: unknown = null;
        try {
          const [res] = await chrome.scripting.executeScript({
            target: { tabId: Number(req.params.tabId) },
            func: () => {
              const metaContent = (name: string) =>
                document
                  .querySelector(`meta[name="${name}"], meta[property="${name}"]`)
                  ?.getAttribute('content') ?? undefined;
              return {
                url: location.href,
                title: document.title,
                readableText: (document.body?.innerText ?? document.body?.textContent ?? '')
                  .trim()
                  .slice(0, 200_000),
                selection: window.getSelection?.()?.toString() || undefined,
                meta: {
                  description: metaContent('description'),
                  ogImage: metaContent('og:image'),
                  lang: document.documentElement.getAttribute('lang') ?? undefined,
                },
              };
            },
          });
          result = res?.result ?? null;
        } catch {
          result = null;
        }
        send(buildRes(req.id, result));
        break;
      }
      case 'page.query': {
        // MIRRORS queryMatches() in pagescript.ts — keep in sync. Runs in page
        // context, so it is fully self-contained (no imports / outer-scope refs);
        // the attr-collection loop is inlined here.
        let result: unknown = [];
        try {
          const [res] = await chrome.scripting.executeScript({
            target: { tabId: Number(req.params.tabId) },
            func: (selector: string, attrFilter: string[] | undefined) => {
              const els = Array.from(document.querySelectorAll(selector));
              return els.map((el) => {
                const all: Record<string, string> = {};
                for (const attr of Array.from(el.attributes)) all[attr.name] = attr.value;
                const attrs =
                  attrFilter === undefined
                    ? all
                    : Object.fromEntries(attrFilter.filter((k) => k in all).map((k) => [k, all[k]]));
                return { tag: el.tagName.toLowerCase(), attrs, textContent: (el.textContent ?? '').trim() };
              });
            },
            args: [req.params.selector, req.params.attrs],
          });
          result = res?.result ?? [];
        } catch {
          result = [];
        }
        send(buildRes(req.id, result));
        break;
      }
      case 'page.action': {
        await chrome.scripting.executeScript({
          target: { tabId: Number(req.params.tabId) },
          func: (kind: string) => {
            if (kind === 'reload') location.reload();
            else if (kind === 'goBack') history.back();
            else if (kind === 'goForward') history.forward();
            else if (kind === 'scrollToTop') window.scrollTo(0, 0);
          },
          args: [req.params.action.kind],
        });
        send(buildRes(req.id, null));
        break;
      }
    }
  } catch (err) {
    send(buildErr(req.id, err instanceof Error ? err.message : String(err)));
  }
}

async function start() {
  // Only one attempt in flight, and never while a socket is already live or
  // mid-handshake (readyState CONNECTING/OPEN). Prevents overlapping discovery
  // + pairing storms from concurrent triggers.
  if (connecting || (ws && ws.readyState !== WebSocket.CLOSED)) return;
  connecting = true;
  try {
    // Correct the variant (Arc masks as Chrome) before pairing/connect so the
    // browser identity is consistent everywhere downstream.
    variant = await resolveStartupVariant();
    const port = await discoverPort(DEFAULT_PORT_RANGE, fetch);
    if (port === null) {
      scheduleReconnect();
      return;
    }
    const token = await ensurePaired(port);
    if (!token) {
      scheduleReconnect();
      return;
    }
    ws = connect(port, variant, token, {
      onOpen: () => {
        backoff.reset();
        send(buildHello(variant, ['Default']));
        void pushSnapshot('snapshot');
      },
      onReq: (req) => {
        void handleReq(req);
      },
      onClose: (code) => {
        ws = null;
        // The launcher signals WHY it closed via the close code. A stale/bad
        // token (1008) must be discarded so the next attempt re-pairs — otherwise
        // we loop forever against a token the launcher will never accept. A
        // throttle (1013) keeps the token and just lets the backoff grow.
        if (classifyClose(code) === 'reauth') {
          void chrome.storage.local.remove('token');
        }
        scheduleReconnect();
      },
    });
  } catch {
    // Defense in depth: no attempt path should ever reject unhandled. Any
    // unexpected failure schedules a backed-off retry like the other paths.
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

function scheduleReconnect() {
  const delay = backoff.next();
  setTimeout(() => {
    void start();
  }, delay);
}

for (const ev of [
  chrome.tabs.onCreated,
  chrome.tabs.onRemoved,
  chrome.tabs.onUpdated,
  chrome.tabs.onActivated,
  chrome.tabs.onMoved,
]) {
  ev.addListener(() => {
    void pushSnapshot('changed');
  });
}

chrome.windows.onFocusChanged.addListener((windowId) => {
  // WINDOW_ID_NONE (-1) means the browser lost focus — ignore; only report gains.
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    send({ type: 'event', name: 'window.focused', payload: {} });
  }
});

chrome.alarms.create('asyar-keepalive', { periodInMinutes: 0.4 }); // ~24s
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== 'asyar-keepalive') return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    void start();
  } else {
    send({ type: 'event', name: 'keepalive', payload: null });
  }
});

void start();
