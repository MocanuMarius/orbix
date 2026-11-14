import {condensedIconMarkup} from './afterglow-ui.mjs?v=guardian-currents-1';
// Small shared pixel silhouettes. Conditions retain words; basic resources do not.
const shapes={
 energy:'<path d="M8 1h6l-4 5h4L4 15l2-7H2z"/>',
 glow:'<path d="M6 1h4v1h2v2h2v2h1v4h-1v2h-2v2h-2v1H6v-1H4v-2H2v-2H1V6h1V4h2V2h2z" opacity=".35"/><path d="M6 4h4v2h2v4h-2v2H6v-2H4V6h2z"/>',
 packed:'<path d="M1 3h14v12H1zM3 1h10v2H3z" opacity=".4"/><path d="M2 4h12v1H2zm0 0h1v10H2zm11 0h1v10h-1zM2 13h12v1H2zM6 6h4v1h1v3h-1v1H6v-1H5V7h1z"/>',
 up:'<path d="M7 2h2v2h2v2h2v2h-3v6H6V8H3V6h2V4h2z"/>',
 down:'<path d="M6 2h4v6h3v2h-2v2H9v2H7v-2H5v-2H3V8h3z"/>',
 uses:'<path d="M1 5h4v6H1zm5-2h4v8H6zm5-2h4v10h-4z"/><path d="M1 13h14v1H1z" opacity=".5"/>',
 clock:'<path d="M4 1h8v2h2v2h1v7h-2v2h-2v1H4v-2H2v-2H1V5h2V3h1z" opacity=".35"/><path d="M7 3h2v5h3v2H7z"/>',
 auto:'<path d="M3 3h9V1l4 4-4 4V6H4v3H1V5h2zm10 10H4v2l-4-4 4-4v3h8V7h3v4h-2z"/>',
 music:'<path d="M6 2h8v9h-2V5H8v8H6v1H2v-1H1v-3h1V9h4zm4 8h4v1h1v3h-1v1h-4v-1H9v-3h1z"/>'
};
const labels={energy:'Energy',glow:'Energy',packed:'Packed Sparks',up:'Increase',down:'Decrease',uses:'Uses',clock:'Duration',auto:'Automatic',music:'Music'};
export function resourceSymbol(kind){if(kind==='glow')kind='energy';if(kind==='packed')return condensedIconMarkup().replace('class="ico condensed-icon"','class="resource-symbol resource-symbol-packed"').replace('aria-hidden="true"','role="img" aria-label="Packed Sparks"');return `<svg class="resource-symbol resource-symbol-${kind}" viewBox="0 0 16 16" role="img" aria-label="${labels[kind]||'Effect'}" shape-rendering="crispEdges" fill="currentColor">${shapes[kind]||shapes.glow}</svg>`;}
