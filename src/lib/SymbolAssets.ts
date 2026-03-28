/**
 * SYMBOL ASSETS — Nuclear fix for Android WebView SVG caching bug.
 *
 * Problem: Samsung/Android WebView aggressively caches SVG DOM nodes.
 * When multiple different SVGs are rendered in a list, the WebView reuses
 * cached SVG paths and renders the WRONG icon (e.g., x2 becomes a triangle).
 * This affects gameplay — players see wrong symbols and get wrong answers.
 *
 * Solution: Render all game symbols as <img> tags with base64-encoded SVG data URIs.
 * <img> tags are treated as raster images by the WebView, so each icon is
 * completely isolated and immune to SVG DOM caching/reuse.
 *
 * This file is THE SINGLE SOURCE OF TRUTH for all game symbol visuals.
 */

const C = '#171717'; // neutral-900 — main symbol color
const P = '#d4d4d4'; // neutral-300 — plus sign color

const svg = (content: string, fill = 'none', stroke = C, sw = '2.5') =>
  `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`)}`;

export const SYMBOL_DATA_URIS: Record<string, string> = {
  CircleFilled: svg(`<circle cx="12" cy="12" r="10"/>`, C, 'none', '0'),
  CircleEmpty: svg(`<circle cx="12" cy="12" r="9"/>`, 'none', C, '2.5'),
  TriangleUp: svg(`<path d="M12 2L22 20H2L12 2Z"/>`, C, 'none', '0'),
  TriangleDown: svg(`<path d="M12 22L2 4H22L12 22Z"/>`, C, 'none', '0'),
  Mul2: svg(`<rect x="2" y="2" width="20" height="20" rx="6"/><path d="M6 9.5L11 14.5M11 9.5L6 14.5" stroke-width="2"/><path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" stroke-width="2"/>`),
  Div2: svg(`<rect x="2" y="2" width="20" height="20" rx="6"/><path d="M7 16.5L10 7.5" stroke-width="2"/><path d="M13 10C13 6.5 18 6.5 18 10.5C18 13.5 13 14.5 13 16.5H18" stroke-width="2"/>`),
  Prev1: svg(`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M9.5 10L12 7.5v9" stroke-width="2"/>`),
  Prev2: svg(`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M9 10C9 6.5 15 6.5 15 10.5C15 13.5 9 14.5 9 16.5H15" stroke-width="2"/>`),
  ReverseNext: svg(`<path d="M9 18l-4-4 4-4"/><path d="M5 14h14"/><path d="M15 6l4 4-4 4"/><path d="M5 10h14"/>`),
  Star: svg(`<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>`, C, 'none', '0'),
  InvertAll: svg(`<rect x="2" y="2" width="20" height="20" rx="4"/><path d="M22 2L2 22"/><path d="M5 8h4" stroke-width="2"/><path d="M15 16h4M17 14v4" stroke-width="2"/>`),
  Heart: svg(`<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`, C, C, '2'),
  Plus: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${P}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V19M5 12H19"/></svg>`)}`,
};

export const getSymbolSrc = (type: string): string => SYMBOL_DATA_URIS[type] || '';
