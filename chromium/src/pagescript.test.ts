// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { stringifyAttrs, extractSnapshot, queryMatches } from './pagescript';

describe('stringifyAttrs', () => {
  it('coerces all values to strings', () => {
    expect(stringifyAttrs({ href: 'x', tabindex: 3, hidden: true })).toEqual({
      href: 'x', tabindex: '3', hidden: 'true',
    });
  });
});

describe('queryMatches', () => {
  it('maps elements to PageMatch with stringified attrs', () => {
    document.body.innerHTML = `<a href="https://x" data-n="5">Link</a><a href="https://y">Y</a>`;
    const matches = queryMatches('a[href]', undefined);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ tag: 'a', attrs: { href: 'https://x', 'data-n': '5' }, textContent: 'Link' });
  });
  it('filters attrs when a list is given', () => {
    document.body.innerHTML = `<a href="https://x" data-n="5">Link</a>`;
    const matches = queryMatches('a', ['href']);
    expect(matches[0].attrs).toEqual({ href: 'https://x' });
  });
  it('empty attrs array returns no attribute keys', () => {
    document.body.innerHTML = `<a href="https://x">Link</a>`;
    const matches = queryMatches('a', []);
    expect(matches[0].attrs).toEqual({});
  });
});

describe('extractSnapshot', () => {
  it('pulls title, readable text, and meta', () => {
    document.title = 'My Page';
    document.body.innerHTML = `<main>Hello world body text</main>`;
    const snap = extractSnapshot('https://example.com');
    expect(snap.url).toBe('https://example.com');
    expect(snap.title).toBe('My Page');
    expect(snap.readableText).toContain('Hello world');
  });
});
