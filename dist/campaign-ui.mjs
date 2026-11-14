import {mapStopIconMarkup} from './map-guide.mjs?v=guardian-scenery-1';
const number = (n,min=0) => Math.max(min,Math.floor(Number(n)||0));
export function campaignStrip(run,profile={}) {
  if(run?.isTutorial)return '';
  const tier=number(run?.difficulty??profile.difficulty,1),map=number(run?.mapIndex);
  return `<div class="campaign-strip" aria-label="Ascension ${tier}, map ${Math.min(3,map+1)} of 3"><span>ASCENSION <b>${tier}</b></span><span>MAP <b>${Math.min(3,map+1)}/3</b></span></div>`;
}
export function bossSigil(id){return mapStopIconMarkup({boss:true,bossId:id}).replace('class="map-stop-icon','class="boss-sigil map-stop-icon');}

export function guardianProgressMarkup(run,{animate=false}={}){
 if(!run||run.isTutorial)return '';
 const currentCleared=run.phase==='map-clear'||run.success&&run.bossDefeated||run.victoryPending&&run.lastFlight?.boss;
 const cleared=Math.min(3,number(run.mapIndex)+(currentCleared?1:0));
 return `<span class="guardian-progress" role="img" aria-label="${cleared} of 3 guardians defeated">${[0,1,2].map(i=>`<i class="guardian-seal ${i<cleared?'is-lit':''} ${animate&&i===cleared-1?'just-lit':''}" aria-hidden="true"><span></span></i>`).join('')}</span>`;
}
