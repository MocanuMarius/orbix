import {fineTreasureObject,fineShape,cofferGrain} from './fine-treasure-art.mjs?v=words-1';
const palettes = {
  vessel: ['#203e39','#356e67','#65aa96','#a8dbc4','#ebf6d2','#c49c64'],
  lens:   ['#293c49','#466775','#7cb2ab','#b8e3c9','#e8edba','#c5a05f'],
  tithe:  ['#45342f','#8e5342','#c57f54','#ecbf78','#ffdd9a','#9eaa78'],
  wager:  ['#3c3546','#6d506e','#9e7992','#d4abbb','#f2d9b1','#c2a577'],
};

// Each sprite is the discoverable object rising out of a coffer. The same
// silhouettes work on a phone before the player can read the site's name.
const illustrations = Object.fromEntries(Object.entries(palettes).map(([id, palette]) => {
  const object = fineTreasureObject(id,palette);
  return [id, `<svg class="treasure-art" viewBox="0 0 76 48" shape-rendering="crispEdges" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <path fill="#172921" d="M3 39h7v-3h12v-3h33v2h10v3h8v3h-6v2H54v2H21v-2H8v-2H3z"/>
    <path fill="#364638" d="M9 38h10v-2h9v2h22v-3h9v2h7v2H54v2H20v-1H9z"/>
    ${fineShape([[17,28],[19,27],[19,18],[19.5,16.5],[21,14.5],[23,13],[49,13],[52,13.5],[54,15],[56,17],[57,20],[57,28],[61,25],[61,34],[58,37],[53,40],[50,42],[22,42],[19,40],[17,38]],palette[0],.5)}
    <path fill="#725d42" d="M20 18h3v-3h28v2h4v10H21z"/>
    <path fill="#28352d" d="M23 19h3v-2h23v2h3v5H24z"/>
    <path fill="#ac996f" d="M23 15h27v2H23zM20 18h2v7h-2z"/>
    <path fill="#101c1d" d="M17 26h34l7-3h3v11l-9 6H18z"/>
    <path fill="#68543e" d="M19 29h32v10H19z"/>
    <path fill="#463f34" d="M51 29l8-4v9l-8 5z"/>
    <path fill="#a3895e" d="M17 26h34v3H17zM20 31h30v1H20zM20 37h30v1H20zM51 26l9-4v3l-9 4z"/>
    <path fill="${palette[1]}" d="M22 28h4v12h-4zM44 28h4v12h-4z"/>
    <path fill="${palette[3]}" d="M23 28h2v5h-2zM45 28h2v5h-2zM33 29h5v3h-5z"/>
    <path fill="#304334" d="M9 37v-8h1v5h2v-7h1v7h2v2h-1v2zM61 37v-6h2v3h2v-6h1v7h2v2z"/>
    <path fill="${palette[2]}" opacity=".65" d="M16 11h1v2h-1zM56 8h1v2h-1zM61 16h2v1h-2zM9 23h2v1H9z"/>
    ${cofferGrain()}<g transform="translate(24 3) scale(.5)">${object}</g>
  </svg>`];
}));

export function treasureArt(kind) {
  return illustrations[kind] || illustrations.vessel;
}
