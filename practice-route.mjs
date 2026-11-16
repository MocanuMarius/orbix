import {CARD_SYSTEM,makeSkillCard,getCardModifiers,getMountedCards} from './skill-cards.mjs?v=collector-cards-1';

export const PRACTICE_EDITION=3;
export const isPlayablePractice=run=>run?.isTutorial===true&&run.tutorialEdition===PRACTICE_EDITION;
export const practiceCardRun=run=>({...run,isTutorial:false,skillSystem:CARD_SYSTEM,cardSlots:3,
 mountedCards:run?.practiceCards||[],reserveCards:[]});
export const practiceCardFaces=run=>getMountedCards(practiceCardRun(run)).filter(Boolean);
export function loanPracticeCards(run,ids){
 if(!isPlayablePractice(run))return;
 run.practiceCards=ids.map(id=>makeSkillCard(id,`${run.id}:practice:${id}`));
}
export function practiceModifiers(run){
 return isPlayablePractice(run)?{...getCardModifiers(practiceCardRun(run)),practiceCards:true}:{};
}
export function practicePurpose(run){
 const node=run?.map?.[run.step]?.[0]||run?.current;
 return ({glide:'Lift · collect · glide',proximity:'Skim rock · catch Flash',rhythm:'Three even Lifts → wave → Harvest',
  'black-hole':'Keep your distance · restore light',guardian:'Read the warning · reach the waylight',
  treasure:'Borrow cards for the next passage',camp:'Recover · prepare a card combination'})[node?.tutorialLesson||node?.kind]||'Reach the next waylight';
}

// Return one short observation of the live world. The app gates it on the same
// collision projection and quiet input interval as every contextual flight hint.
export function nextPracticeLesson(engine,run,snapshot={}){
 if(!isPlayablePractice(run)||!engine?.tutorial||engine.tutorialAwaitingLift||run.guideSkipped)return null;
 const t=engine.time,state=engine.tutorial,seen=run.guideSeen||{},kind=state.lesson;
 const candidates=[],add=(id,when,title,text,target,point)=>{
  if(when&&!seen[`practice:${id}`])candidates.push({id:`practice:${id}`,title,text,target,point,contextual:true,actionLabel:'Try it',skipLabel:'Continue'});
 };
 const packet=(predicate)=>engine.layout.embers.find(p=>!p.collected&&!p.carried&&predicate(p)&&p.x-engine.distance>engine.player.x+12&&p.x-engine.distance<engine.width-20);
 const point=p=>p?{x:p.x-engine.distance,y:p.y,radius:22}:null;
 if(kind==='glide'){
  add('lift',t>1.2,'Lift, then glide','Tap Lift to rise. Release to fall. Each ordinary Lift spends 3 Sparks.','#flap-btn');
  add('sparks',t>4,'Sparks refill your meter','Touch a bright Spark for fuel. Watch the meter on the left refill.','.glow-side-gauge',point(packet(p=>p.fuel)));
  const collector=engine.getWispState?.();
  add('collector',t>7&&(state.carrierDeliveries>0||state.sawReel||state.directPickups>0),'Collector fetches a miss','The green orb reels a missed Spark to you. Fuel arrives when its shell reaches your wisp.',null,collector?{x:collector.x,y:collector.y,radius:18}:null);
  add('luminance',t>11,'Luminance is your sight','The light around your wisp reveals nearby terrain. Collector’s green orbit shows its separate fetching reach.',null,{x:engine.player.x,y:engine.player.y,radius:34});
  add('packing',t>15&&(snapshot.condensedGlow||0)>0,'Surplus becomes Stored Sparks','Overfilling the Spark Meter packs surplus here. Clear this passage to keep it in your practice wallet.','.flight-condensed-counter');
 }
 if(kind==='proximity'){
  add('proximity',t>1.4,'Your borrowed Proximity card','Fly close to solid rock without touching it. Close flight charges a pulse that reveals the passage.','.edging-pulse-gauge');
  const flash=packet(p=>p.kind==='sight');
  add('flash',!!flash,'Catch the white Flash triangle','Touch this triangle. Its tethered pulses widen your light for eight seconds.',null,point(flash));
  add('pulse',t>7&&(snapshot.edgingPulse?.active||engine.edgingPulse?.triggerCount>0),'You earned a Surface Pulse','Your close flight filled Proximity. The pulse reveals terrain; keep a safe gap from the rock.','.edging-pulse-gauge');
 }
 if(kind==='rhythm'){
  add('rhythm',t>1.4,'Three Lifts make a Rhythm','Tap three evenly spaced Lifts. The third sends a revealing wave. Follow the beat marks.','#flap-btn');
  add('wave',engine.cardRhythm?.waves>0,'Rhythm sent a wave','Watch the bright ring cross a Spark you have not collected. Your borrowed Harvest card rewards that crossing.',null,{x:engine.player.x,y:engine.player.y,radius:38});
  add('harvest',state.harvestPaid===true,'Harvest paid for the crossing','The wave restored Sparks. The pickup remains for you to collect. Rhythm creates the wave; Harvest rewards its crossing.','.glow-side-gauge');
 }
 if(kind==='black-hole'){
  const hole=engine.blackHoles?.items?.[0],x=hole?hole.x-engine.distance:Infinity;
  add('black-hole',x>engine.player.x&&x<engine.width-20,'Give the Black Hole space','The black core drains Sparks nearby. Fly along the lower Spark route to reduce its pull.',null,hole?{x,y:hole.y,radius:30}:null);
  const flash=packet(p=>p.kind==='sight');
  add('dark-flash',!!flash,'Flash helps you see the bypass','Catch the white triangle to light the passage. Its light fades; leave room around the dark core.',null,point(flash));
  const dark=packet(p=>p.kind==='dark');
  add('dark-spark',!!dark,'A red ring warns of a cost','This Dark Spark dims your Luminance. Collector leaves it alone. Collect a fuel Spark to clear one dimming effect.',null,point(dark));
 }
 if(kind==='guardian'){
  add('guardian',t>1.5,'Read the Warden’s warning','Watch its hands and warning. Move through the broad opening, then use the quiet room to recover.','.boss-phase-hud');
  add('hearts',t>12,'Hearts are attempts','In the main game, a fatal collision spends one heart. Recover at Rest restores missing hearts. Practice retries are unlimited.','.flight-run-status .ascension-lives');
 }
 return candidates[0]||null;
}
