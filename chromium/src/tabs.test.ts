import { describe, expect, it } from 'vitest';
import { chromeTabToProtocolTab } from './tabs';

const raw = {
  id: 42, windowId: 7, index: 2, title: 'GitHub', url: 'https://github.com',
  favIconUrl: 'https://github.com/favicon.ico', active: true, pinned: false, audible: true, groupId: -1,
} as chrome.tabs.Tab;

describe('chromeTabToProtocolTab', () => {
  it('maps fields and stringifies the numeric id', () => {
    const t = chromeTabToProtocolTab(raw, 'chrome');
    expect(t.id).toBe('42');
    expect(t.windowId).toBe('7');
    expect(t.index).toBe(2);
    expect(t.title).toBe('GitHub');
    expect(t.url).toBe('https://github.com');
    expect(t.faviconUrl).toBe('https://github.com/favicon.ico');
    expect(t.isActive).toBe(true);
    expect(t.isPinned).toBe(false);
    expect(t.isAudible).toBe(true);
    expect(t.browser).toEqual({ family: 'chromium', variant: 'chrome', profileId: 'Default' });
  });
  it('omits faviconUrl/groupName when absent', () => {
    const t = chromeTabToProtocolTab({ ...raw, favIconUrl: undefined, groupId: -1 } as any, 'brave');
    expect(t.faviconUrl).toBeUndefined();
    expect(t.groupName).toBeUndefined();
    expect(t.browser.variant).toBe('brave');
  });
});
