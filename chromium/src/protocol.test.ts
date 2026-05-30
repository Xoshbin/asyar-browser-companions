import { describe, expect, it } from 'vitest';
import { buildHello, buildTabsEvent, buildPageChanged, buildRes, buildErr, parseServerMessage } from './protocol';

describe('protocol envelopes', () => {
  it('buildHello includes version and browser', () => {
    const m = buildHello('chrome', ['Default']);
    expect(m).toEqual({ type: 'hello', version: 1, browser: { family: 'chromium', variant: 'chrome', profiles: ['Default'] } });
  });
  it('buildTabsEvent uses tabs.snapshot or tabs.changed', () => {
    expect(buildTabsEvent('snapshot', []).name).toBe('tabs.snapshot');
    expect(buildTabsEvent('changed', []).name).toBe('tabs.changed');
  });
  it('buildPageChanged wraps tabId + page', () => {
    const m = buildPageChanged('t1', { url: 'u', title: 't', readableText: 'b', meta: {} } as any);
    expect(m).toEqual({ type: 'event', name: 'page.changed', payload: { tabId: 't1', page: { url: 'u', title: 't', readableText: 'b', meta: {} } } });
  });
  it('buildRes/buildErr shape', () => {
    expect(buildRes('r1', { ok: 1 })).toEqual({ type: 'res', id: 'r1', ok: true, result: { ok: 1 } });
    expect(buildErr('r2', 'nope')).toEqual({ type: 'res', id: 'r2', ok: false, error: 'nope' });
  });
  it('parseServerMessage recognises req', () => {
    const parsed = parseServerMessage(JSON.stringify({ type: 'req', id: 's1', method: 'tabs.activate', params: { tabId: '1' } }));
    expect(parsed).toEqual({ type: 'req', id: 's1', method: 'tabs.activate', params: { tabId: '1' } });
  });
  it('parseServerMessage returns null for garbage', () => {
    expect(parseServerMessage('not json')).toBeNull();
    expect(parseServerMessage(JSON.stringify({ type: 'whatever' }))).toBeNull();
  });
  it('parseServerMessage recognises search.web', () => {
    const parsed = parseServerMessage(JSON.stringify({ type: 'req', id: 's2', method: 'search.web', params: { text: 'react hooks' } }));
    expect(parsed).toEqual({ type: 'req', id: 's2', method: 'search.web', params: { text: 'react hooks' } });
  });
});
