import {condensedIconMarkup} from './afterglow-ui.mjs?v=reskin-1';
import {sparkGlyphArt} from './spark-symbol.mjs?v=reskin-1';
// Small shared pixel silhouettes. Conditions retain words; basic resources do not.
const shapes={
 up:'<path d="M7 2h2v2h2v2h2v2h-3v6H6V8H3V6h2V4h2z"/>',
 down:'<path d="M6 2h4v6h3v2h-2v2H9v2H7v-2H5v-2H3V8h3z"/>',
 uses:'<path d="M1 5h4v6H1zm5-2h4v8H6zm5-2h4v10h-4z"/><path d="M1 13h14v1H1z" opacity=".5"/>',
 clock:'<path d="M4 1h8v2h2v2h1v7h-2v2h-2v1H4v-2H2v-2H1V5h2V3h1z" opacity=".35"/><path d="M7 3h2v5h3v2H7z"/>',
 auto:'<path d="M3 3h9V1l4 4-4 4V6H4v3H1V5h2zm10 10H4v2l-4-4 4-4v3h8V7h3v4h-2z"/>',
 music:'<path d="M6 2h8v9h-2V5H8v8H6v1H2v-1H1v-3h1V9h4zm4 8h4v1h1v3h-1v1h-4v-1H9v-3h1z"/>'
};
const labels={energy:'Spark Meter',glow:'Spark Meter',packed:'Stored Sparks',lift:'Lift',up:'Increase',down:'Decrease',uses:'Uses',clock:'Duration',auto:'Automatic',music:'Music'};
export function resourceSymbol(kind){
  if(kind==='lock')return '<svg class="resource-symbol resource-symbol-lock" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="M4 0h4v2h2v4h2v8H0V6h2V2h2zm0 3v3h4V3zM5 8v3h2V8z"/></svg>';
  if(kind==='glow'||kind==='energy')return `<svg class="resource-symbol resource-symbol-energy" viewBox="0 0 20 20" role="img" aria-label="Spark Meter" shape-rendering="crispEdges">${sparkGlyphArt()}</svg>`;
  if(kind==='packed')return condensedIconMarkup().replace('class="ico condensed-icon"','class="resource-symbol resource-symbol-packed"').replace('aria-hidden="true"','role="img" aria-label="Stored Sparks"');
  if(kind==='lift')return `<svg class="resource-symbol resource-symbol-lift" viewBox="0 0 16 16" role="img" aria-label="Lift" shape-rendering="crispEdges"><path fill="#a16a31" d="M7 1h2v2h2v2h2v2h2v2h-4v6H5V9H1V7h2V5h2V3h2z"/><path fill="#ebc377" d="M7 3h2v2h2v2h2v1H9v6H7V8H3V7h2V5h2z"/><path fill="#fff0b8" d="M7 3h2v2H7zm0 3h2v6H7z"/></svg>`;
  const facets={
    up:'M7 2h2v2H7z', down:'M6 2h3v1H6z', uses:'M1 5h3v2H1zm5-2h3v1H6z', clock:'M7 3h2v4H7z',
    auto:'M3 3h5v1H3zm7 8h3v1h-3z', music:'M6 2h4v1H6zM2 10h1v1H2z'
  };
  const shape=shapes[kind];
  if(!shape)return resourceSymbol('energy');
  return `<svg class="resource-symbol resource-symbol-${kind}" viewBox="0 0 16 16" role="img" aria-label="${labels[kind]||'Effect'}" shape-rendering="crispEdges"><g fill="#646b58" transform="translate(0 1)">${shape}</g><g fill="#d6d7a5">${shape}</g><path class="resource-facet" fill="#fff3c3" d="${facets[kind]||''}"/></svg>`;
}
