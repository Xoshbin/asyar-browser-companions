export type ChromiumVariant = 'chrome' | 'brave' | 'edge' | 'vivaldi' | 'opera';

interface NavLike {
  userAgent: string;
  brave?: unknown;
}

export function detectVariant(nav: NavLike): ChromiumVariant {
  if (nav.brave) return 'brave';
  const ua = nav.userAgent;
  if (/\bEdg\//.test(ua)) return 'edge';
  if (/\bVivaldi\//.test(ua)) return 'vivaldi';
  if (/\bOPR\//.test(ua)) return 'opera';
  return 'chrome';
}
