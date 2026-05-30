import { describe, expect, it } from 'vitest';
import { detectVariant } from './variant';

describe('detectVariant', () => {
  it('detects brave when navigator.brave exists', () => {
    expect(detectVariant({ brave: {}, userAgent: 'Mozilla/5.0 Chrome/120' } as any)).toBe('brave');
  });
  it('detects edge from UA token Edg/', () => {
    expect(detectVariant({ userAgent: 'Mozilla/5.0 Chrome/120 Edg/120' } as any)).toBe('edge');
  });
  it('detects vivaldi from UA token', () => {
    expect(detectVariant({ userAgent: 'Mozilla/5.0 Chrome/120 Vivaldi/6' } as any)).toBe('vivaldi');
  });
  it('detects opera from OPR token', () => {
    expect(detectVariant({ userAgent: 'Mozilla/5.0 Chrome/120 OPR/106' } as any)).toBe('opera');
  });
  it('falls back to chrome', () => {
    expect(detectVariant({ userAgent: 'Mozilla/5.0 Chrome/120 Safari/537' } as any)).toBe('chrome');
  });
});
