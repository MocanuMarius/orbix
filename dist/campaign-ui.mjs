import {mapStopIconMarkup} from './map-guide.mjs?v=fixed-companion-1';
const number = (n,min=0) => Math.max(min,Math.floor(Number(n)||0));
export function campaignStrip(run,profile={}) {
  if(run?.isTutorial)return '';
  const tier=number(run?.difficulty??profile.difficulty,1),map=number(run?.mapIndex);
  return `<div class="campaign-strip" aria-label="Ascension ${tier}, map ${Math.min(3,map+1)} of 3"><span>ASCENSION <b>${tier}</b></span><span>MAP <b>${Math.min(3,map+1)}/3</b></span></div>`;
}
export function bossSigil(id){return mapStopIconMarkup({boss:true,bossId:id}).replace('class="map-stop-icon','class="boss-sigil map-stop-icon');}
