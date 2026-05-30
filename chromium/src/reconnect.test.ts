import { describe, expect, it } from 'vitest';
import { Backoff, classifyClose } from './reconnect';

describe('classifyClose', () => {
  it('treats 1008 (policy violation) as a stale-token signal → re-auth', () => {
    expect(classifyClose(1008)).toBe('reauth');
  });
  it('treats legacy 4401 as re-auth too', () => {
    expect(classifyClose(4401)).toBe('reauth');
  });
  it('treats 1013 (try again later) as throttle → back off, keep token', () => {
    expect(classifyClose(1013)).toBe('backoff');
  });
  it('treats legacy 4429 as throttle too', () => {
    expect(classifyClose(4429)).toBe('backoff');
  });
  it('treats abnormal/normal closes (1006, 1000) as a plain reconnect', () => {
    expect(classifyClose(1006)).toBe('reconnect');
    expect(classifyClose(1000)).toBe('reconnect');
  });
});

describe('Backoff', () => {
  it('grows exponentially and caps', () => {
    const b = new Backoff({ baseMs: 1000, maxMs: 30000, factor: 2 });
    expect(b.next()).toBe(1000);
    expect(b.next()).toBe(2000);
    expect(b.next()).toBe(4000);
    for (let i = 0; i < 10; i++) b.next();
    expect(b.next()).toBe(30000);   // capped
  });
  it('reset returns to base', () => {
    const b = new Backoff({ baseMs: 1000, maxMs: 30000, factor: 2 });
    b.next(); b.next();
    b.reset();
    expect(b.next()).toBe(1000);
  });
});
