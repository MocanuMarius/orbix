/** The forecast belongs to one map and modifies two named passages plus its guardian. */
export const ATLAS_FORECASTS = Object.freeze({
  bellwind: Object.freeze({
    id: 'bellwind',
    name: 'Bellwind',
    cue: 'A bell warns of a rising current. Ride it to the upper Sparks or pass beneath.',
    description: 'Ride a chiming updraft to an upper Spark. The lower lane stays calm.'
  }),
  'hollow-moon': Object.freeze({
    id: 'hollow-moon',
    name: 'Hollow Moon',
    cue: 'An eclipse lights the outer bypass. Take its Sparks while the pull there weakens.',
    description: 'During an eclipse, the outer bypass shines and drains less Sparks.'
  })
});

const motifs = {
  bellwind: '<path fill="#d0c69e" d="M7 2h9v2H7zM8 4h2v5H8z"/><path fill="#bd9065" d="M7 7h4v2h2v5h2v2H4v-2h2V9h1z"/><path fill="#ffe3a2" d="M8 9h2v4H8zM4 15h11v1H4zm4 2h3v2H8z"/><path fill="#93d0c8" d="M15 9h3V7h2v2h-1v2h-4zm0 4h5v-2h2v3h-2v1h-5z"/>',
  'hollow-moon': '<path fill="#9f9cce" d="M7 3h8v2h3v2h2v8h-2v3h-3v2H7v-2H4v-3H2V7h2V5h3z"/><path fill="#eae3c4" d="M6 6h2v8h3v2h6v2h-3v1H8v-2H5v-3H4V8h2z"/><path fill="#171d2e" d="M10 4h5v2h3v3h1v4h-2v2h-6v-2H8V7h2z"/><path fill="#edcfa1" d="M16 20h3v2h-3zm4-3h2v2h-2z"/>'
};
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function atlasGlyph(id) {
  return Object.hasOwn(motifs,id)
    ? `<svg class="atlas-glyph" aria-hidden="true" viewBox="0 0 24 24" shape-rendering="crispEdges">${motifs[id]}</svg>` : '';
}

function hasQuietRoute(map,first,second) {
 const sites=new Map(map.flat().map(site=>[site.id,site]));
 const canPass=site=>site.boss||(!site.elite && site!==first && site!==second &&
   site.nextIds.some(id=>canPass(sites.get(id))));
 return map[0].some(canPass);
}

/** Try the upper or lower opening and a connected follow-up, keeping a full quiet route. */
export function atlasBranches(map,id) {
 if (!Object.hasOwn(ATLAS_FORECASTS,id) || !map?.length) return [];
 const guardian=map.at(-1).find(site=>site.boss);
 const openings=map[0].filter(site=>site.type==='flight');
 if (id==='hollow-moon') openings.reverse();
 for (const first of openings) {
   const descendants=new Set(first.nextIds);
   const onward=[];
   for (const row of map.slice(1,-1)) {
     for (const site of row) {
       if (!descendants.has(site.id)) continue;
       for (const next of site.nextIds) descendants.add(next);
       if (site.type==='flight') onward.push(site);
     }
   }
   const score=site=>Math.abs(site.lane-first.lane)*4+Math.abs(site.row-3)+Number(site.elite);
   const later=onward.sort((a,b)=>score(a)-score(b)).find(site=>hasQuietRoute(map,first,site));
   if (later) return [first,later,guardian].filter(Boolean);
 }
 return [];
}

function forecastArt(id) {
  const marks = id==='bellwind'
    ? '<path fill="#8abfbd" d="M34 31h5v-3h4v-5h2v-6h2v7h-2v5h-5v4h-6zm10 3h4v-3h5v-7h3v8h-5v4h-7z"/><path fill="#f1d79c" d="M52 13h4v4h-4zm6 1h3v3h-3z"/>'
    : '<path fill="#b5b3d1" d="M14 28h4v2h-4zm8 3h4v2h-4zm11 1h5v2h-5zm11-2h5v2h-5zm8-4h4v2h-4z"/><path fill="#f5dfac" d="M23 29h3v3h-3zm19-1h3v3h-3z"/>';
  return `<svg class="atlas-scene" viewBox="0 0 72 41" aria-hidden="true" shape-rendering="crispEdges"><path fill="#25373d" d="M1 30h4v-8h6v-6h4v-4h4v6h5v7h7v9H1zm43-3h6v-7h5v-6h5V9h4v10h5v8h3v9H44z"/><path fill="#59716c" d="M1 35h8v-3h7v-3h4v5h8v3H1zm48 1h7v-6h6v-4h4v5h6v7H49z"/><g transform="translate(${id==='bellwind'?15:21} 0) scale(1.4)">${motifs[id]}</g>${marks}</svg>`;
}

export function forecastCheckpointMarkup(nextMap) {
  const guardian = nextMap.at(-1).find(site => site.boss);
  const choices = Object.values(ATLAS_FORECASTS).map(forecast => {
    const passages = atlasBranches(nextMap,forecast.id).filter(site=>!site.boss).map(site=>site.name);
    return `<button class="atlas-choice forecast-${forecast.id}" data-action="next-map" data-id="${forecast.id}">
      ${forecastArt(forecast.id)}<div><h2>${forecast.name}</h2><p>${forecast.description}</p></div>
      <span class="atlas-sites"><b>Passages</b> ${passages.map(esc).join(' · ')}</span>
    </button>`;
  });
  return `<section class="atlas-checkpoint"><header><h1>Choose Map 2’s forecast</h1><p>Both reach ${esc(guardian?.name || 'the guardian')}.</p></header><div class="atlas-choices">${choices.join('')}</div><footer><button class="secondary atlas-clear-choice" data-action="next-map" data-id="clear">Fly under clear skies</button></footer></section>`;
}
