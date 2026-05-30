import type { Tab } from './protocol';

export function chromeTabToProtocolTab(raw: chrome.tabs.Tab, variant: string): Tab {
  const t: Tab = {
    id: String(raw.id ?? ''),
    browser: { family: 'chromium', variant, profileId: 'Default' },
    windowId: String(raw.windowId ?? ''),
    index: raw.index ?? 0,
    title: raw.title ?? '',
    url: raw.url ?? raw.pendingUrl ?? '',
    isActive: raw.active ?? false,
    isPinned: raw.pinned ?? false,
    isAudible: raw.audible ?? false,
  };
  if (raw.favIconUrl) t.faviconUrl = raw.favIconUrl;
  // groupId >= 0 means grouped; resolving the group name needs chrome.tabGroups (async),
  // out of scope for v1 — leave groupName unset.
  return t;
}
