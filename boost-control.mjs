import { getCompanionAbility, normalizeCompanionFleet } from './companion-abilities.mjs?v=pixel-map-1';
import { companionArtSvg, companionPalette } from './companion-art.mjs?v=pixel-map-1';
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f;
const sparks=[[0,-54],[38,-38],[54,0],[38,38],[0,54],[-38,38],[-54,0],[-38,-38]];
export function boostControlMarkup(roleOrFleet='collector'){
  const roles=normalizeCompanionFleet(Array.isArray(roleOrFleet)?roleOrFleet:null,Array.isArray(roleOrFleet)?'collector':roleOrFleet);
  const active=roles.filter(id=>id!=='leveler'&&!getCompanionAbility(id).passive),passive=!active.length,role=active[0]||roles[0];
  const tag=passive?'div':'button';
  return `<${tag} ${passive?'role="status"':'type="button"'} id="boost-btn" class="flight-control boost-control boost-control-v2 power-fill-control ${passive?'flight-passive-indicator':''}" data-companion-role="${role}" data-companions="${roles.join(',')}" data-boost-state="waiting" aria-label="${passive?'Companion range and recovery':'Companion power'}"><span class="power-fill-window" aria-hidden="true"><i class="power-liquid"></i></span><span class="power-orbs" aria-hidden="true">${roles.map(id=>companionArtSvg(id,{className:'power-orb'})).join('')}</span><span class="power-release-glyph" aria-hidden="true">Ⅱ</span><span class="power-ready-sparks" aria-hidden="true">${sparks.map(([x,y],i)=>`<i style="--spark-x:${x}px;--spark-y:${y}px;--spark-delay:${i%3*35}ms"></i>`).join('')}</span></${tag}>`;
}
export function updateBoostControl(element,state={}){
  if(!element)return;
  const ability=state.ability||{},roles=normalizeCompanionFleet(ability.roles||element.dataset.companions?.split(','),ability.role||element.dataset.companionRole);
  const active=roles.filter(id=>id!=='leveler'&&!getCompanionAbility(id).passive),passive=!active.length;
  const ended=state.finished||state.alive===false||state.dying||state.completing,waiting=state.tutorialAwaitingLift,paused=state.paused;
  const disabled=!!(ended||waiting||paused),wisp=state.wisp||{},shield=state.shield||{};
  let charge=1,mode='passive',meaning='automatic',role=active[0]||roles[0];
  if(!passive){
    const total=Math.max(.001,finite(ability.cooldownTotal,finite(state.boostCooldownTotal,9)));
    charge=clamp(1-finite(ability.cooldown,finite(state.boostCooldown))/total);
    if(ability.ready&&!ability.release)charge=1;
    mode=ability.release?'release':ability.ready?'ready':ability.active?'active':'cooling';
    meaning=ability.release?'Tap to release Space Timer':ability.ready?'Ready to activate':'Power recovering';
  }else if(roles.includes('leveler')){
    role='leveler';charge=clamp(finite(state.leveler?.charge)/Math.max(.001,finite(state.leveler?.capacity,2.4)));
    mode=state.leveler?.active?'active':charge>=.999?'ready':'cooling';meaning='Hold flight area or Lift to levitate; release to glide';
  }else if(roles.includes('collector')){
    role='collector';charge=clamp(finite(wisp.currentRange,finite(wisp.radius)*finite(wisp.recovery,1))/Math.max(1,finite(wisp.radius,140)));
    mode=wisp.phase==='outbound'||wisp.phase==='returning'?'active':charge>=.999?'ready':'cooling';
    meaning=`Collector range ${Math.round(charge*100)} percent. Fetches automatically`;
  }else if(roles.includes('protector')){
    role='protector';charge=shield.charges>0?1:clamp(1-finite(shield.recovery)/Math.max(.001,finite(shield.recoveryTotal,14)));
    mode=charge>=.999?'ready':'cooling';meaning='Protector shield recovery';
  }else{
    const kindler=state.companions?.find(item=>item.role==='kindler');
    charge=clamp(1-finite(kindler?.purifyCooldown)/Math.max(1,finite(kindler?.purifyCooldownTotal,10)));mode=charge>=.999?'ready':'cooling';meaning='Kindler works automatically';
  }
  if(disabled)mode=ended?'ended':paused?'paused':'waiting';
  if(ended)charge=0;
  const tint=companionPalette(role);
  // Fill changes during recovery; palette, mode and enabled state usually do
  // not. Avoid rewriting inherited style properties over every SVG pixel.
  if(element._powerFill!==charge){element.style.setProperty('--power-fill',String(charge));element._powerFill=charge;}
  if(element._powerColor!==tint.mid){element.style.setProperty('--power-color',tint.mid);element._powerColor=tint.mid;}
  if(element.dataset.boostState!==mode)element.dataset.boostState=mode;
  const reducedMotion=state.reducedMotion===true;
  if(element._powerReducedMotion!==reducedMotion){element.classList.toggle('boost-motion-reduced',reducedMotion);element._powerReducedMotion=reducedMotion;}
  const full=charge>=.999&&!disabled;
  if(full&&!element._wasFull)element.classList.add('power-ready-burst');
  if(!full&&element._wasFull!==false)element.classList.remove('power-ready-burst');
  element._wasFull=full;
  if(element.tagName==='BUTTON'&&element.disabled!==disabled)element.disabled=disabled;
  const aria=ended?'Attempt ended':paused?'Flight paused':waiting?'Tap Lift to begin':`${meaning}. ${Math.round(charge*100)} percent.${passive?'':' Tap Power for Runner.'}`;
  if(element.getAttribute('aria-label')!==aria)element.setAttribute('aria-label',aria);
}
