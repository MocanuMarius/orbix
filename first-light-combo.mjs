// Edition 3 only. First Light Edition 4 teaches cards at its camp (stop 5) and no longer
// lends this pair on the first flight; this module stays so an unfinished Edition 3
// practice save finishes as it began. It can be deleted once those saves are gone.
import {isPlayablePractice,loanPracticeCards,practiceModifiers} from './practice-route.mjs?v=triggers-1';
import {makeSkillCard} from './skill-cards.mjs?v=triggers-1';
import {cardArt} from './card-art.mjs?v=triggers-1';

export const FIRST_LIGHT_COMBO='practice:early-combo';
export const FIRST_LIGHT_COMBO_GAP=1.35;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const eligible=(engine,run)=>isPlayablePractice(run)&&run.tutorialEdition===3&&engine?.tutorial?.lesson==='glide';
export function firstLightComboLesson(engine,run){
 if(!eligible(engine,run)||run.guideSkipped||run.guideSeen?.[FIRST_LIGHT_COMBO]
   ||engine.flaps<1||!engine.tutorial.directPickups||!run.guideSeen?.['practice:sparks'])return null;
 // Wait for a central, descending arc. The normal safe-pause projection is also
 // required by the caller; neither input nor the world is moved for the lesson.
 if(engine.player.y<engine.height*.38||engine.player.y>engine.height*.74||engine.player.vy<0)return null;
 return {id:FIRST_LIGHT_COMBO,title:'Two borrowed cards work together',
  text:'Three evenly spaced Lifts send a Pulse. Let it cross the higher Spark: Common Resonant Harvest restores +1 without collecting it. The lower Spark is ordinary fuel. These cards are temporary.',
  target:'.first-light-combo',contextual:true,actionLabel:'Try it',skipLabel:false};
}

/** Author two real scrolling opportunities at the stopped teaching frame.
 * No Lift, wave, pickup, reward, clock or player motion is synthesized here. */
export function armFirstLightCombo(engine,run){
 if(!eligible(engine,run)||engine.tutorial.earlyCombo||!engine.paused||!engine.running)return false;
 loanPracticeCards(run,['lift-guide','rhythm','harvest-common']);
 if(!engine.reconcileCardLoadout({modifiers:practiceModifiers(run),condensedGlow:engine.condensedStart||0}))return false;
 const start=engine.distance+engine.player.x,speed=engine.baseSpeed,h=engine.height,y=engine.player.y;
 const gap=FIRST_LIGHT_COMBO_GAP,repeatAt=3*gap,span=speed*(6*gap+1.2),end=start+span;
 // Clear the actual collider shapes over both opportunities; keep the course's
 // entrance and refuge. No soft rails, fixed camera or invulnerability are used.
 engine.layout.obstacles=engine.layout.obstacles.filter(o=>o.exitFoundation||o.x+o.width*2.5<start-100||o.x-o.width>end);
 engine.layout.embers=engine.layout.embers.filter(p=>p.collected||p.carried||p.x<start-30||p.x>end);
 for(let i=0;i<2;i++){
  const offset=i*repeatAt;
  const bodyY=clamp(y+(-205*.85+150*.85*.85)*h/620+i*(-205*gap+150*gap*gap)*3*h/620,h*.18,h*.76);
  const targetY=clamp(y-h*.27,h*.12,h*.60);
  for(const [role,at,py]of [['direct',offset+.85,bodyY],['wave',offset+2*gap+.9,targetY]])engine.layout.embers.push({
   id:`first-light-combo-${i}-${role}`,feature:`first-light-combo-${role}`,kind:'light',fuel:true,value:1,
   x:start+speed*at,y:py,collected:false,attracted:false,phase:i*1.6,tutorialSpark:true});
 }
 engine.layout.embers.sort((a,b)=>a.x-b.x);
 // Late beginners retain both opportunities rather than meeting the refuge
 // halfway through the quiet room. Moving the existing refuge moves its solid
 // foundation by the same delta; it does not change any flight physics.
 const extra=Math.max(0,end+speed*2-(engine.totalDistance+engine.player.x));
 if(extra>0){
  engine.totalDistance+=extra;
  const exit=engine.layout.exitLandmark;
  if(exit){for(const key of ['entryX','worldX','courseEnd','finishDistance'])exit[key]+=extra;
   const foundation=engine.layout.obstacles.find(o=>o.id===exit.foundationId);if(foundation)foundation.x+=extra;}
 }
 engine.tutorial.earlyCombo={start,end,repeatAt,wavesAtStart:engine.cardRhythm?.waves||0};
 engine._nearbyPacketsUntil=-1;
 // A later passage offers practice, rather than introducing the same pair again.
 run.earlyComboIntroduced=true;
 for(const id of ['rhythm','wave','harvest']) (run.guideSeen||={})[`practice:${id}`]=true;
 run.guideSeen['practice-entry:rhythm']=true;
 run.guideSeen['practice-hint:rhythm']=true;
 return true;
}
export function firstLightComboQuiet(engine){
 const room=engine?.tutorial?.earlyCombo;
 return !!room&&engine.distance+engine.player.x<room.end;
}

/** Two persistent portraits: real Rhythm state lights the first; the actual
 * Harvest resolver receipt lights the second and supplies its exact +1. */
export function createFirstLightComboFeedback(root){
 if(!root)return {update(){},destroy(){}};
 const doc=root.ownerDocument,node=doc.createElement('div');node.className='first-light-combo';node.hidden=true;
 node.setAttribute('aria-live','off');
 node.innerHTML=`${['rhythm','harvest-common'].map(id=>`<span data-combo-card="${id}" title="${id==='rhythm'?'Rhythm':'Common Resonant Harvest'}">${cardArt(makeSkillCard(id,`early:${id}`),{compact:true})}</span>`).join('<i aria-hidden="true">→</i>')}<b hidden></b>`;
 // Reserve the top HUD band between the wallet and hearts/menu. The bottom
 // effect dock is a different positioned coordinate system, not this HUD's host.
 root.append(node);
 const style=doc.createElement('style');style.textContent='.first-light-combo{position:absolute;top:max(8px,env(safe-area-inset-top,0px));right:140px;display:flex;align-items:center;gap:5px;pointer-events:none;z-index:5}.first-light-combo[hidden]{display:none}.first-light-combo>span{width:36px;height:43px;overflow:hidden;border:1px solid #778d79;border-radius:5px;background:#172c26}.first-light-combo>span>svg{width:100%;height:100%}.first-light-combo i{font-style:normal;color:#c3dab9}.first-light-combo b{font:20px/1 var(--pixel);color:#f2ffcf;text-shadow:0 2px 3px #102418}.first-light-combo [data-lit=true]{outline:2px solid #f0ffce;filter:brightness(1.5)}';node.append(style);
 let waves=0,sequence=-1,rhythmUntil=0,harvestUntil=0;
 const cards=node.querySelectorAll('[data-combo-card]'),bonus=node.querySelector('b');
 return {destroy(){node.remove();},update(snapshot,engine){
  const room=engine?.tutorial?.earlyCombo;node.hidden=!room;if(!room)return;
  const count=snapshot.cardRhythm?.waves||0;
  if(count>waves){waves=count;rhythmUntil=snapshot.time+1.4;}
  const trace=snapshot.cardRowTrace;
  if(snapshot.cardRowSequence!==sequence&&trace?.event?.kind==='wave-crossing'&&trace.restoredSparks>0){
   sequence=snapshot.cardRowSequence;harvestUntil=snapshot.time+1.4;bonus.textContent=`+${trace.restoredSparks}`;
  }
  const lit=[String(snapshot.time<rhythmUntil),String(snapshot.time<harvestUntil)];
  for(let i=0;i<2;i++)if(cards[i].dataset.lit!==lit[i])cards[i].dataset.lit=lit[i];
  if(bonus.hidden!==(snapshot.time>=harvestUntil))bonus.hidden=snapshot.time>=harvestUntil;
 }};
}
