import { describe, expect, it, vi } from 'vitest';
import { requestPairing, pollPairStatus } from './pairing';

describe('pairing', () => {
  it('requestPairing posts family+variant and returns pairing_id', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ pairing_id: 'p1' }) } as any));
    const id = await requestPairing(54300, 'chrome', fetchFn as any);
    expect(id).toBe('p1');
    expect(fetchFn).toHaveBeenCalledWith(
      'http://127.0.0.1:54300/pair-request',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it('pollPairStatus returns token on approved', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'approved', token: 'TOK' }) } as any));
    const r = await pollPairStatus(54300, 'p1', fetchFn as any);
    expect(r).toEqual({ status: 'approved', token: 'TOK' });
  });
  it('pollPairStatus surfaces denied', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'denied' }) } as any));
    const r = await pollPairStatus(54300, 'p1', fetchFn as any);
    expect(r.status).toBe('denied');
  });
});
