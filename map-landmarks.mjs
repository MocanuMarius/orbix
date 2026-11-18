import {pixelPath} from './pixel-contour.mjs?v=detail-1';
// Route categories and guardian names. The stop icons themselves are the approved v2.0-icons set (ui-icons.mjs); only the muted ground layer is drawn here.
export const guardianNames=Object.freeze({'hollow-warden':'Hollow Warden',moonweaver:'Moonweaver','frost-matron':'Frost Matron','rootbound-heart':'Rootbound Heart','storm-shepherd':'Storm Shepherd','hollow-sun':'Hollow Sun'});
export function landmarkCategory(value){const n=typeof value==='string'?{kind:value}:value||{};if(n.boss||['boss','guardian','combat'].includes(n.kind)||n.type==='boss')return'boss';if(n.elite||n.kind==='elite')return'elite';if(['rest','camp'].includes(n.kind)||n.type==='camp')return'rest';if(n.kind==='treasure')return'treasure';if(n.kind==='scribe')return'scribe';if(['encounter','event','shrine','support'].includes(n.kind)||n.type==='support')return'encounter';return'flight';}

const groundArt={
 moonruins:'<path class="biome-fill" d="M-59 20V9h8v5h12v12ZM38 25V13h9V7h7v18Z"/><path class="biome-stroke" d="M-56 13h5m-1 8h11M41 18h11"/>',
 frost:'<path class="biome-fill" d="m-64 23 12-27 6 18 10 11Zm102 0L48-9l7 20 11 15Z"/><path class="biome-stroke" d="m-52-4 1 27M48-9l4 33"/>',
 pinewood:`<path class="biome-fill" d="${pixelPath([[-62,20],[-52,10],[-57,11],[-50,-1],[-43,11],[-47,10],[-37,22]])}${pixelPath([[33,22],[44,9],[38,10],[46,-6],[55,10],[49,9],[61,24]])}"/>`,
 marsh:'<path class="biome-stroke" d="M-57 24V2m-5 7 5 5 6-9m-4 19 7-8M45 25V4m-5 8 5 4 8-6M-40 30h27m18 2h24m8-3h19"/>',
 fungal:'<path class="biome-fill" d="M-55 9h6v16h-6ZM-65 9V3l6-6h15l7 7v5ZM45 12h6v15h-6ZM35 12V6l9-7h12l7 8v5Z"/>',
 basalt:'<path class="biome-fill" d="M-63 22V5l7-5 7 4v21ZM-49 24V13l8-4 7 6v12ZM41 26V8l7-5 7 5v17ZM55 25V15l8-5 6 6v12Z"/>',
 desert:'<path class="biome-fill" d="m-72 27 17-15 12-2 15 12 28 7Zm101-5 17-13 16 3 15 16-35 3Z"/><path class="biome-stroke" d="m-58 15 14-2 13 11m78-11 11 1 10 11"/>',
 coral:'<path class="biome-stroke" d="M-54 25V-1m0 13-9-7m9 13 11-9M47 27V3m0 10-8-6m8 13 14-13m-5 8v-9"/>',
 crystal:'<path class="biome-fill" d="m-62 24 6-30 11 13-2 20Zm16 1 10-15 1 18Zm82 0 10-32 10 17-4 18Zm18 1 10-14 5 14Z"/><path class="biome-stroke" d="m-56-6 5 30M46-7l1 32"/>',
 cloud:'<path class="biome-fill" d="m-68 17 12-5 9-9 11 6 9 14-15 8-17-4Zm100 5 9-14 12-4 10 11 12 8-19 9-17-2Z"/><path class="biome-stroke" d="M-66 32h24m78 3h22"/>',
 thorn:'<path class="biome-stroke" d="m-62 26 9-17-4-9m4 9 9-2m-14 14-9-6m108 12 9-13-2-13m2 13 12-5m-6 13 11 1"/>',
 cemetery:'<path class="biome-fill" d="M-60 24V7h11v18ZM-45 26l2-15 8 1-1 15ZM42 26V5h10v21ZM57 26V14h7v13Z"/><path class="biome-stroke" d="M-58 11h7M45 10h4m-2-3v7"/>'
};
const terrainBiome={ruins:'moonruins',canopy:'pinewood',storm:'frost'};
export function biomeGroundArt(node){const id=node.biomeId||terrainBiome[node.terrain]||'moonruins';return {id,art:groundArt[id]||groundArt.moonruins};}
