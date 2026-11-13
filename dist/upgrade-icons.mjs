const shapes={
 bond:'<path d="M2 10h6v6H2zM16 10h6v6h-6zM9 2h6v6H9zM8 13h8M12 8v5"/>',
 lift:'<path d="M4 20V10h4V6h4V2h4v4h4M8 20V12h4V8h4M13 20h7"/>',
 sight:'<path d="M2 10h3V7h4V5h6v2h4v3h3v4h-3v3h-4v2H9v-2H5v-3H2zM10 9h4v6h-4z"/>',
 reach:'<path d="M2 8V2h6M16 2h6v6M22 16v6h-6M8 22H2v-6M9 9h6v6H9z"/>',
 recovery:'<path d="M5 7V3m0 4h5M5 7l4-4h8l4 4v10l-4 4H7l-4-4M12 7v6h5"/>',
 ward:'<path d="M4 3h16v12l-3 3-5 4-5-4-3-3zM8 7h8M8 11h8"/>',
 layers:'<path d="M2 2h13v10l-3 3-4 3-4-3-2-3zM17 6h5v10l-3 3-4 3-3-2"/>',
 duration:'<path d="M5 2h14v4l-5 6 5 6v4H5v-4l5-6-5-6zM8 5h8M8 19h8"/>',
 level:'<path d="M2 11h5V8h4v6h4v-3h7M5 20h14M7 3h10"/>',
 dive:'<path d="M10 2h4v11h5l-7 9-7-9h5M3 4v6m18-6v6"/>',
 swift:'<path d="m3 3 8 9-8 9M12 3l8 9-8 9M2 8h3m-3 8h3"/>',
 wind:'<path d="M2 7h14V3h-4M2 12h20v5h-5M4 18h7v4H7"/>',
 fuel:'<path d="M9 3h6v3h3v3h3v6h-3v3h-3v3H9v-3H6v-3H3V9h3V6h3zM10 9h4v6h-4z"/>',
 purify:'<path d="M3 9h10v10H3zM6 12h4v4H6M17 2v8m-4-4h8M18 13v8m-4-4h8"/>',
 reserve:'<path d="M8 2h8v5l4 5v10H4V12l4-5zM8 7h8M5 15h14M10 11h4"/>',
 feather:'<path d="M3 22 19 2h3v7l-3 4h-4v4h-4v3H7M9 15l4 2m0-8 5 2"/>',
 seed:'<path d="M4 20v-5h5v-5h6V5h5V2M4 20h5v-5h6v-5h5V5M2 22l20-20"/>',
 bell:'<path d="M9 2h6v4h3v4h2v7H4v-7h2V6h3zM2 17h20M9 21h6M10 8h4v6h-4z"/>',
 dawn:'<path d="M2 18h20M6 15v-4h3V8h6v3h3v4M12 2v3M3 5l3 3m15-3-3 3M4 22h3m3 0h3m3 0h4"/>',
 moss:'<path d="M12 22V10M12 14H7V9H3V4h7v4h2m0 5h5V8h4V3h-7v5M6 22l6-4 6 4"/>'
};
const inks={main:'#e5e9cf',collector:'#b9dfa0',protector:'#8fbfe8',leveler:'#a7e8df',swift:'#f2d48e',seer:'#d3b1f2',kindler:'#e4a3b5',afterglow:'#b8d9ae'};
const svg=(shape,ink)=>`<svg class="upgrade-glyph" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges" aria-hidden="true">${shapes[shape]||shapes.fuel}</svg>`;
export function skillIcon(skill){const id=skill.id;const shape=id.includes('bond')?'bond':id.includes('efficiency')||id==='main-lift'?'lift':id.includes('purify')?'purify':id.includes('dive')?'dive':id.includes('layers')?'layers':id.includes('steadiness')?'level':id.includes('duration')?'duration':id.includes('recovery')?'recovery':id.includes('resistance')?'wind':id.includes('reach')?'reach':id.includes('sight')||id.includes('range')?'sight':id.startsWith('protector')?'ward':id.startsWith('afterglow')?'reserve':'fuel';return svg(shape,inks[skill.branch]||inks.main)}
export function artifactIcon(id){const shape={'ember-lens':'sight','quiet-cinder':'fuel','silver-feather':'feather','moss-heart':'moss','wayfinder-seed':'seed','iron-petal':'ward','storm-knot':'wind','hollow-bell':'bell','dawn-thread':'dawn'}[id];return svg(shape||'reserve','#d9c08e')}
