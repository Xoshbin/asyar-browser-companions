import { describe, expect, it, vi } from 'vitest';
import { discoverPort } from './discovery';

describe('discoverPort', () => {
  it('returns the first port whose /discover says asyar', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes(':54301/')) return { ok: true, json: async () => ({ name: 'asyar', version: '1' }) } as any;
      return { ok: false } as any;
    });
    const port = await discoverPort([54300, 54301, 54302], fetchFn as any);
    expect(port).toBe(54301);
  });
  it('returns null when no port responds with asyar', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('refused'); });
    const port = await discoverPort([54300, 54301], fetchFn as any);
    expect(port).toBeNull();
  });
  it('ignores non-asyar servers on the port', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ name: 'something-else' }) } as any));
    expect(await discoverPort([54300], fetchFn as any)).toBeNull();
  });
});
