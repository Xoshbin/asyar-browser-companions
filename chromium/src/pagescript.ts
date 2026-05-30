import type { PageMatch } from './protocol';

export function stringifyAttrs(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

export function queryMatches(selector: string, attrFilter: string[] | undefined): PageMatch[] {
  const els = Array.from(document.querySelectorAll(selector));
  return els.map((el) => {
    const all: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) all[attr.name] = attr.value;
    const attrs = attrFilter === undefined
      ? all
      : Object.fromEntries(attrFilter.filter((k) => k in all).map((k) => [k, all[k]]));
    return { tag: el.tagName.toLowerCase(), attrs, textContent: (el.textContent ?? '').trim() };
  });
}

export function extractSnapshot(url: string) {
  const metaContent = (name: string) =>
    document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content') ?? undefined;
  return {
    url,
    title: document.title,
    readableText: (document.body?.innerText ?? document.body?.textContent ?? '').trim().slice(0, 200_000),
    selection: window.getSelection?.()?.toString() || undefined,
    meta: {
      description: metaContent('description'),
      ogImage: metaContent('og:image'),
      lang: document.documentElement.getAttribute('lang') ?? undefined,
    },
  };
}
