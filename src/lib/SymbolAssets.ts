/**
 * SYMBOL ASSETS — Final fix for Android WebView icon caching.
 *
 * The WebView caches <img> data URIs when they share the same src string.
 * Fix: Generate a UNIQUE data URI for every single <img> instance by injecting
 * a unique comment into each SVG before encoding. This means no two <img> tags
 * ever have the same src attribute, making caching impossible.
 *
 * Uses encodeURIComponent (text mode) instead of btoa (binary mode) for
 * maximum WebView compatibility.
 */

const C = '#171717'; // neutral-900

const RAW_SVGS: Record<string, string> = {
  CircleFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${C}"/></svg>`,
  CircleEmpty: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${C}" stroke-width="2.5"/></svg>`,
  TriangleUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L22 20H2L12 2Z" fill="${C}"/></svg>`,
  TriangleDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 22L2 4H22L12 22Z" fill="${C}"/></svg>`,
  Mul2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="6"/><path d="M6 9.5L11 14.5M11 9.5L6 14.5" stroke-width="2"/><path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" stroke-width="2"/></svg>`,
  Div2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="6"/><path d="M7 16.5L10 7.5" stroke-width="2"/><path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" stroke-width="2"/></svg>`,
  Prev1: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M9.5 10L12 7.5v9" stroke-width="2"/></svg>`,
  Prev2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M9 10C9 6.5 15 6.5 15 10.5C15 13.5 9 14.5 9 16.5H15" stroke-width="2"/></svg>`,
  ReverseNext: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l-4-4 4-4"/><path d="M5 14h14"/><path d="M15 6l4 4-4 4"/><path d="M5 10h14"/></svg>`,
  Star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="${C}"/></svg>`,
  InvertAll: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M22 2L2 22"/><path d="M5 8h4" stroke-width="2"/><path d="M15 16h4M17 14v4" stroke-width="2"/></svg>`,
  Heart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${C}" stroke="${C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  Plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V19M5 12H19"/></svg>`,
};

// Global counter ensures every single call produces a unique string
let _uid = 0;

/**
 * Returns a UNIQUE data URI for the given symbol type.
 * Each call produces a different URI by injecting a unique XML comment.
 * This prevents Android WebView from caching/reusing icon renders.
 */
export const getSymbolSrc = (type: string): string => {
  const raw = RAW_SVGS[type];
  if (!raw) return '';
  // Inject a unique comment to make this URI one-of-a-kind
  const unique = raw.replace('</svg>', `<!--${++_uid}--></svg>`);
  return `data:image/svg+xml,${encodeURIComponent(unique)}`;
};
