import {sparkGlyphArt} from './spark-symbol.mjs?v=furnace-tow-1';

// The case and latch identify savings even when the icon is only 16 pixels wide.
export const formatCondensedGlow = value => String(Math.max(0, Math.floor(Number(value) || 0)));

export function condensedIconMarkup() {
  return `<svg class="ico condensed-icon" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">
    <path fill="#483b36" d="M3 6h2V4h22v1h2v3h1v5h-1v13h-2v2H5v-1H3V14H2V8h1z"/>
    <path fill="#825f47" d="M4 8h24v5H4zm1 5h22v12H5z"/>
    <path fill="#b98553" d="M5 8h22v3H5zm0 6h21v11H5z"/>
    <path fill="#e6c490" d="M4 7h23v1H4zm1 4h22v1H5zm1 3h1v10H6z"/>
    <path fill="#fff0bf" d="M7 5h18v1H7zm6 5h6v1h-6zm1 1h4v3h-4z"/>
    <path fill="#708f8e" d="M9 14h14v10H9z"/>
    <path fill="#314950" d="M10 15h12v8H10z"/>
    ${sparkGlyphArt(10, 13, 12)}
    <path fill="#684d3d" d="M26 13h2v13H7v-1h19z"/>
    <path fill="#ccd4b2" d="M5 15h1v1H5zm0 7h1v1H5zm19-7h1v1h-1zm0 7h1v1h-1z"/>
  </svg>`;
}
