export interface PageMatch {
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
}

export interface Tab {
  id: string; browser: { family: 'chromium'; variant: string; profileId: string };
  windowId: string; index: number; title: string; url: string;
  faviconUrl?: string; isActive: boolean; isPinned: boolean; isAudible: boolean; groupName?: string;
}
export interface PageSnapshot {
  url: string; title: string; readableText: string;
  html?: string; selection?: string;
  meta: { description?: string; ogImage?: string; lang?: string };
}
export type ServerReq = {
  type: 'req'; id: string;
  method: 'tabs.activate' | 'tabs.close' | 'tabs.open' | 'page.snapshot' | 'page.query' | 'page.action' | 'search.web';
  params: any;
};

export function buildHello(variant: string, profiles: string[]) {
  return { type: 'hello' as const, version: 1, browser: { family: 'chromium' as const, variant, profiles } };
}
export function buildTabsEvent(kind: 'snapshot' | 'changed', tabs: Tab[]) {
  return { type: 'event' as const, name: kind === 'snapshot' ? 'tabs.snapshot' : 'tabs.changed', payload: tabs };
}
export function buildPageChanged(tabId: string, page: PageSnapshot) {
  return { type: 'event' as const, name: 'page.changed', payload: { tabId, page } };
}
export function buildRes(id: string, result: unknown) {
  return { type: 'res' as const, id, ok: true as const, result };
}
export function buildErr(id: string, error: string) {
  return { type: 'res' as const, id, ok: false as const, error };
}

const METHODS = new Set(['tabs.activate', 'tabs.close', 'tabs.open', 'page.snapshot', 'page.query', 'page.action', 'search.web']);

export function parseServerMessage(raw: string): ServerReq | null {
  let v: any;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || v.type !== 'req' || typeof v.id !== 'string' || !METHODS.has(v.method)) return null;
  return v as ServerReq;
}
