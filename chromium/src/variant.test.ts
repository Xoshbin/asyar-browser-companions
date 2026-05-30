import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectVariant, readArcMarker, resolveVariant } from './variant';

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
  it('falls back to chrome (Arc also masks itself as Chrome here)', () => {
    expect(detectVariant({ userAgent: 'Mozilla/5.0 Chrome/120 Safari/537' } as any)).toBe('chrome');
  });
});

describe('resolveVariant', () => {
  it('upgrades the UA variant to arc when the Arc marker was found', () => {
    expect(resolveVariant('chrome', true)).toBe('arc');
  });
  it('keeps the UA variant when no Arc marker was found', () => {
    expect(resolveVariant('chrome', false)).toBe('chrome');
  });
  it('does not override a non-chrome UA variant when not Arc', () => {
    expect(resolveVariant('brave', false)).toBe('brave');
  });
});

describe('readArcMarker', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubRoot(props: Record<string, string>) {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => props[name] ?? '',
    }));
  }

  it('returns true when an Arc palette CSS variable is present', () => {
    stubRoot({ '--arc-palette-title': 'rgb(10, 20, 30)' });
    expect(readArcMarker()).toBe(true);
  });

  it('returns false on a plain Chrome page (no Arc variables)', () => {
    stubRoot({});
    expect(readArcMarker()).toBe(false);
  });

  it('treats whitespace-only values as absent', () => {
    stubRoot({ '--arc-palette-title': '   ' });
    expect(readArcMarker()).toBe(false);
  });
});
