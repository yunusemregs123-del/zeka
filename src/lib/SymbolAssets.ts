/**
 * SYMBOL ASSETS — Static file approach for Android WebView compatibility.
 *
 * Instead of data URIs or inline SVGs, symbols are served as actual static
 * SVG files from public/symbols/. The WebView loads them as standard HTTP
 * resources via Capacitor's local server, just like any normal web image.
 *
 * Cache busting: A version timestamp is appended to prevent stale caching.
 */

const CACHE_BUST = `?v=${Date.now()}`;

const SYMBOL_NAMES = [
  'CircleFilled', 'CircleEmpty', 'TriangleUp', 'TriangleDown',
  'Mul2', 'Div2', 'Prev1', 'Prev2', 'ReverseNext',
  'Star', 'InvertAll', 'Heart', 'Plus'
];

const SYMBOL_URLS: Record<string, string> = {};
for (const name of SYMBOL_NAMES) {
  SYMBOL_URLS[name] = `/symbols/${name}.svg${CACHE_BUST}`;
}

export const getSymbolSrc = (type: string): string => SYMBOL_URLS[type] || '';
