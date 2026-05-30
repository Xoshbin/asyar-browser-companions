# Asyar Companion — Chromium (MV3)

Connects a Chromium-family browser (Chrome / Brave / Arc / Edge / Vivaldi) to the
Asyar launcher: it discovers the launcher on `127.0.0.1`, completes the pairing
handshake, holds an authenticated WebSocket open, streams live tab + page events,
and answers the six server-initiated RPCs (`tabs.activate` / `tabs.close` /
`tabs.open` / `page.snapshot` / `page.query` / `page.action`).

The wire contract is documented in the launcher repo at
`asyar-launcher/docs/architecture/browser-bridge-protocol.md`.

## Auth note (why no Authorization header)

Browser `WebSocket` cannot set request headers, so the token cannot travel in
`Authorization: Bearer …`. Instead the companion offers the token through the
WebSocket subprotocol channel:

```js
new WebSocket(url, ['asyar.v1', `bearer.${token}`]);
```

The launcher reads the `bearer.<token>` entry and echoes back `asyar.v1` as the
selected subprotocol.

## Build

```bash
pnpm install --ignore-workspace   # standalone project; do not use the monorepo workspace
pnpm test:run                     # run the unit suites
pnpm build                        # produces dist/ with background.js + manifest.json
```

## Manual smoke test

The end-to-end path (load unpacked → pair → live tabs) needs a real browser plus
a running launcher, so it cannot be automated headless. Run it by hand:

1. Build: `pnpm build` (produces `dist/` with `background.js` + `manifest.json`).
2. In Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.
3. Start the launcher: (from the monorepo) `cd asyar-launcher && pnpm tauri dev`.
4. The companion auto-discovers the port and requests pairing.
5. In Asyar → Settings → Browsers, an approval prompt for "chromium · chrome"
   appears. Approve it.
6. Install + open the asyar-browser extension in Asyar; type a few chars — your
   open Chrome tabs should appear as results.
7. Hit Enter on a tab result → Chrome switches to that tab.
8. Verify reconnect: quit + restart the launcher; within ~30s the companion
   re-pairs/reconnects (token persists, so no re-approval needed).
9. Verify keepalive: leave idle 2 minutes, then search tabs in Asyar — results
   still fresh (the service worker stayed alive / reconnected).

## Known v1 limitations

- **Arc** presents a plain Chrome user-agent with no JS signal, so it is reported
  as `chrome` (cosmetic — pairing and all features work).
- **`profileId`** is hardcoded `"Default"` — an MV3 extension cannot read its own
  profile directory name. The launcher keys connections by `(family, variant)`,
  not profile, so this is cosmetic in v1.
- **`groupName`** is left unset — resolving Chrome tab-group names needs the async
  `chrome.tabGroups` API (deferred).
- **`readableText`** uses `document.body.innerText`; a Readability.js upgrade is a
  follow-up.
- The page-injection closures in `background.ts` mirror the unit-tested logic in
  `src/pagescript.ts` inline (the injected function has no module graph). A bundled
  content script that imports the shared module would remove that duplication.
