import {mapStopIconMarkup} from './map-guide.mjs?v=victory-rhythm-1';
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

export function guardianRitualMarkup(run){
 const conquered=Math.min(3,(run.mapIndex||0)+1);
 return `<section class="guardian-ritual" role="status" aria-label="Guardian ${conquered} conquered. Darkness is becoming light."><div class="ritual-orbs">${[0,1,2].map(i=>`<div class="ritual-orb ${i<conquered-1?'converted':''} ${i===conquered-1?'converting':''}"><div class="ritual-core"></div>${i===conquered-1?Array.from({length:24},(_,j)=>`<i class="ritual-light" style="--angle:${j*137.5}deg;--delay:${.8+(j%8)*.12}s;--reach:${110+j%4*20}px"></i>`).join(''):''}</div>`).join('')}</div></section>`;
}
