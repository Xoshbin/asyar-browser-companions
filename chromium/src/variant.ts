export type ChromiumVariant = 'chrome' | 'brave' | 'edge' | 'vivaldi' | 'opera' | 'arc';

interface NavLike {
  userAgent: string;
  brave?: unknown;
}

export function detectVariant(nav: NavLike): ChromiumVariant {
  // UA-only detection. Arc deliberately uses Chrome's exact User-Agent, so it
  // is NOT distinguishable here — it falls through to 'chrome' and is later
  // corrected by resolveVariant() once readArcMarker() probes a page. See
  // background.ts:resolveStartupVariant().
  if (nav.brave) return 'brave';
  const ua = nav.userAgent;
  if (/\bEdg\//.test(ua)) return 'edge';
  if (/\bVivaldi\//.test(ua)) return 'vivaldi';
  if (/\bOPR\//.test(ua)) return 'opera';
  return 'chrome';
}

/**
 * Combine the UA-derived variant with an Arc probe result. The UA variant is
 * the default; a positive Arc probe upgrades it to 'arc'. Pure, so the policy
 * is unit-testable without any chrome.* APIs.
 */
export function resolveVariant(uaVariant: ChromiumVariant, isArc: boolean): ChromiumVariant {
  return isArc ? 'arc' : uaVariant;
}

/**
 * Runs IN PAGE CONTEXT — injected via chrome.scripting.executeScript, so it
 * must be fully self-contained (no imports / outer-scope references). Returns
 * true when the document root carries an Arc-specific CSS custom property.
 * Arc injects `--arc-palette-*` variables onto :root of every page; this is
 * the only reliable runtime signal that the host browser is Arc.
 */
export function readArcMarker(): boolean {
  const style = getComputedStyle(document.documentElement);
  return ['--arc-palette-title', '--arc-palette-background'].some(
    (prop) => style.getPropertyValue(prop).trim() !== '',
  );
}
