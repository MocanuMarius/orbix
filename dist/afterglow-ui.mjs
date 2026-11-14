import {sparkSymbolArt} from './spark-symbol.mjs?v=guardian-beat-2';

// The case and latch identify savings even when the icon is only 16 pixels wide.
export const formatCondensedGlow = value => String(Math.max(0, Math.floor(Number(value) || 0)));

export function condensedIconMarkup() {
  return `<svg class="ico condensed-icon" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">
    <path fill="#5a453d" d="M1 5h2V3h17v2h3v5h-1v10h-2v1H3v-1H2V10H1z"/>
    <path fill="#b98553" d="M3 9h17v9H3z"/>
    <path fill="#668488" d="M5 10h13v8H5z"/>
    <path fill="#273e4c" d="M6 10h11v7H6z"/>
    <path fill="#e6c490" d="M2 5h18v3H2zm2 5h2v8H4z"/>
    <path fill="#fff0bf" d="M4 4h14v1H4zm6 3h4v3h-4z"/>
    ${sparkSymbolArt(8, 10, 8)}
    <path fill="#88643e" d="M18 9h3v10H5v-1h13z"/>
  </svg>`;
}
