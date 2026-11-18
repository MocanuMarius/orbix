import {CARD_SYSTEM,makeSkillCard,getCardModifiers,getMountedCards} from './skill-cards.mjs?v=polish-2';
import {getInscription,permanentOnSlot,writeInscription} from './inscriptions.mjs?v=polish-2';
import {practiceCourseLesson,practiceStopById,practiceGoalMet,PRACTICE_STOPS,PRACTICE_SCRIBE_OFFERS} from './practice-course.mjs?v=polish-2';

// Edition 5 (18 November 2026): thirteen stops; the card Chain is built one gift at a time on paused screens.
// A saved Edition 4 practice in progress is moved onto Edition 5 when it loads (migratePracticeRun).
// A saved Edition 3 practice in progress finishes as Edition 3.
export const PRACTICE_EDITION=5;
export const LEGACY_PRACTICE_EDITION=3;
export const PREVIOUS_COURSE_EDITION=4;
export const isPlayablePractice=run=>run?.isTutorial===true&&(run.tutorialEdition===PRACTICE_EDITION||run.tutorialEdition===LEGACY_PRACTICE_EDITION);
export const isPracticeCourseRun=run=>run?.isTutorial===true&&run.tutorialEdition===PRACTICE_EDITION;
export const isLegacyPracticeRun=run=>run?.isTutorial===true&&run.tutorialEdition===LEGACY_PRACTICE_EDITION;
/** The practice Chain seen as a card run: the gifts in their slots, the Deck (reserve), Inscriptions and NEW badges. */
export const practiceCardRun=run=>{
 const cards=run?.practiceCards||[],slots=isPracticeCourseRun(run)?Math.max(Number(run.practiceSlots)||0,cards.length):Math.max(3,cards.length);
 return {...run,isTutorial:false,skillSystem:CARD_SYSTEM,cardSlots:slots,mountedCards:Array.from({length:slots},(_,i)=>cards[i]||null),
  reserveCards:run?.practiceReserve||[],slotInscriptions:run?.practiceInscriptions||[],unseenCardIds:run?.practiceUnseen||[]};
};
export const practiceCardFaces=run=>getMountedCards(practiceCardRun(run)).filter(Boolean);
/** Edition 3: loaned cards fill the Chain directly. */
export function loanPracticeCards(run,ids){
 if(!isPlayablePractice(run))return;
 run.practiceCards=ids.map(id=>makeSkillCard(id,`${run.id}:practice:${id}`));
}
/** Edition 5: a gift goes to the Deck with a NEW badge; the player places it. Once per card id. */
export function givePracticeCards(run,ids){
 if(!isPracticeCourseRun(run))return [];
 const given=run.practiceGiven||=[],out=[];
 for(const id of ids||[]){
  if(given.includes(id))continue;
  const card=makeSkillCard(id,`${run.id}:practice:${id}`);
  (run.practiceReserve||=[]).push(card);(run.practiceUnseen||=[]).push(card.instanceId);given.push(id);out.push(card);
 }
 return out;
}
function setSlots(run,count){
 const cards=run.practiceCards||=[],ins=run.practiceInscriptions||=[];
 run.practiceSlots=Math.max(count,Number(run.practiceSlots)||0);
 while(cards.length<run.practiceSlots)cards.push(null);
 while(ins.length<run.practiceSlots)ins.push(null);
}
/** The Chain screen's one real change in practice: put a card in a slot. From the Deck, the card already
 * there goes back to the Deck; from another slot, the two trade places. `expectedUid` refuses a stale move. */
export function placePracticeCard(run,uid,slot,expectedUid=null){
 if(!isPracticeCourseRun(run)||!Array.isArray(run.practiceCards))return false;
 const cards=run.practiceCards,reserve=run.practiceReserve||=[];
 if(!Number.isInteger(slot)||slot<0||slot>=cards.length)return false;
 if(expectedUid!==null&&(cards[slot]?.instanceId||null)!==expectedUid)return false;
 const from=cards.findIndex(card=>card?.instanceId===uid);
 if(from===slot)return false;
 if(from>=0)[cards[from],cards[slot]]=[cards[slot],cards[from]];
 else{
  const at=reserve.findIndex(card=>card?.instanceId===uid);if(at<0)return false;
  const [card]=reserve.splice(at,1),out=cards[slot];cards[slot]=card;if(out)reserve.push(out);
 }
 run.practiceUnseen=(run.practiceUnseen||[]).filter(id=>id!==uid);
 run.practiceChainArranged=true;
 return true;
}
/** Kept name (Edition 4 callers and tests). */
export const reorderPracticeCards=placePracticeCard;
export function markPracticeCardsSeen(run,ids){
 if(!isPracticeCourseRun(run)||!ids?.length)return false;
 const drop=new Set(ids),before=(run.practiceUnseen||[]).length;run.practiceUnseen=(run.practiceUnseen||[]).filter(id=>!drop.has(id));
 return run.practiceUnseen.length!==before;
}
/** The practice Rest: Add slot is its one action (as at a real Rest, no refill). It hands out the next gift. */
export function practiceAddSlot(run){
 const stop=practiceStopById(run?.current?.id);
 if(!isPracticeCourseRun(run)||run.phase!=='support'||!stop?.practiceRest||run.practiceSlotAdded)return false;
 setSlots(run,(run.practiceCards||[]).length+1);run.practiceSlotAdded=true;
 givePracticeCards(run,stop.give);return true;
}
/** Arriving at a practice screen: its slots exist and its gift is in the Deck (the Rest gives after Add slot). */
export function preparePracticeStop(run,node){
 const stop=practiceStopById(node?.id);
 if(!isPracticeCourseRun(run)||!stop||stop.type!=='support')return false;
 if(stop.slots)setSlots(run,stop.slots);
 if(stop.practiceScribe)ensurePracticeScribe(run);
 if(!stop.practiceRest)givePracticeCards(run,stop.give);
 return true;
}
/** Whether this practice screen may lead on to the next flight. */
export function practiceStopReady(run){
 const stop=practiceStopById(run?.current?.id);
 return !stop?.goal||practiceGoalMet(run,stop.goal);
}
/** The practice Scribe: the same three offers every time, written on a practice slot. */
export function ensurePracticeScribe(run){
 if(!isPracticeCourseRun(run))return null;
 return run.practiceScribe||={kind:'inscription',nodeId:run.current?.id||'practice-scribe',source:'stop',sourceName:'The Scribe',offers:[...PRACTICE_SCRIBE_OFFERS],permanent:false,claimed:false};
}
/** Write an offered Inscription on a practice slot, with the real slot rules (inscriptions.mjs). */
export function practiceScribeWrite(run,id,slot,{confirm=false}={}){
 const reward=ensurePracticeScribe(run);
 if(!reward||reward.claimed||!reward.offers.includes(id)||!getInscription(id))return false;
 const cards=run.practiceCards||[];if(!Number.isInteger(slot)||slot<0||slot>=cards.length)return false;
 const view={mountedCards:cards,slotInscriptions:run.practiceInscriptions||[]};
 if(permanentOnSlot(view,slot)&&!confirm)return false;
 const replaced=writeInscription(view,slot,id);if(replaced===false)return false;
 run.practiceInscriptions=view.slotInscriptions;
 Object.assign(reward,{claimed:true,chosen:id,slot,replaced:replaced||null});return true;
}
export const FIRST_LIGHT_NAME=`First Light · ${PRACTICE_STOPS.length} stops`;
/** Old saves: an Edition 4 practice in progress continues on Edition 5. Its first three flights are the same courses
 * and lessons, so a player there stays at that stop; anyone further on resumes at Edition 5's first Chain screen.
 * Seen lessons, the suspended real run and the continuation are kept; Edition 4's loaned cards are dropped. */
export function migratePracticeRun(run,freshMap){
 if(run?.isTutorial!==true||run.tutorialEdition!==PREVIOUS_COURSE_EDITION||!Array.isArray(freshMap))return false;
 const ended=run.phase==='ended',step=ended?freshMap.length:Math.min(Number(run.step)||0,3);
 Object.assign(run,{tutorialEdition:PRACTICE_EDITION,map:freshMap,step,path:freshMap.slice(0,step).map(row=>row[0].id),current:null,
  phase:ended?'ended':'map',attemptActive:false,attemptEntry:null,practiceCards:[],practiceReserve:[],practiceUnseen:[],practiceGiven:[],
  practiceInscriptions:[],practiceSlots:0,practiceScribe:null,practiceSlotAdded:false,practiceChainArranged:false,mapName:FIRST_LIGHT_NAME});
 delete run.pendingPracticeHints;
 return true;
}
export function practiceModifiers(run){
 if(!isPlayablePractice(run))return {};
 const node=run.current||run.map?.[run.step]?.[0],extra={};
 if(isPracticeCourseRun(run)){
  // Edition 5 lends no abilities: everything in flight comes from the Chain the player built.
 }
 return {...getCardModifiers(practiceCardRun(run)),practiceCards:true,...extra};
}
export function practicePurpose(run){
 const node=run?.map?.[run.step]?.[0]||run?.current;
 return ({glide:'Lift · collect · glide',proximity:'Skim rock · catch Flare',rhythm:'Three even Lifts → Pulse → Harvest',
  'black-hole':'Keep your distance · restore light',guardian:'Read the warning · reach the waylight',
  treasure:'Borrow cards for the next passage',camp:isPracticeCourseRun(run)?'Build your Chain':'Recover · prepare a card combination',scribe:'Write an Inscription',
  'course-lift':'Lift · glide · Sparks','course-collector':'Collector · Delivery','course-light':'Luminance · Flare',
  'course-strip':'Watch your Chain fire','course-dark':'Echo · Black Holes','course-boost':'Hearts · a doubled Chain',
  'course-pulse':'Flare · Pulse card','course-finale':'Your Inscription'})[node?.tutorialLesson||node?.kind]||'Reach the next waylight';
}

// Return one short observation of the live world. The app gates it on the same
// collision projection and quiet input interval as every contextual flight hint.
export function nextPracticeLesson(engine,run,snapshot={}){
 if(!isPlayablePractice(run)||!engine?.tutorial||engine.tutorialAwaitingLift||run.guideSkipped)return null;
 if(engine.tutorial.course)return isPracticeCourseRun(run)?practiceCourseLesson(engine,run):null;
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
  add('collector',t>7&&(state.carrierDeliveries>0||state.sawReel||state.directPickups>0),'Meet Collector','Collector is the green companion. It fetches missed Sparks, then reels them to you. Fuel arrives when the shell touches your wisp.',null,collector?{x:collector.x,y:collector.y,radius:18}:null);
  add('luminance',t>11,'Luminance is your sight','The light around your wisp reveals nearby terrain. Collector’s green orbit shows its separate fetching reach.',null,{x:engine.player.x,y:engine.player.y,radius:34});
  add('packing',t>15&&(snapshot.condensedGlow||0)>0,'Surplus becomes Stored Sparks','Overfilling the Spark Meter packs surplus here. Clear this passage to keep it in your practice wallet.','.flight-condensed-counter');
 }
 if(kind==='proximity'){
  add('proximity',t>1.4,'Your borrowed Proximity card','Fly close to solid rock without touching it. Close flight charges a pulse that reveals the passage.','.edging-pulse-gauge');
  const flash=packet(p=>p.kind==='sight');
  add('flash',!!flash,'Catch the white Flare triangle','Touch this triangle. Its tethered pulses widen your light for eight seconds.',null,point(flash));
  add('pulse',t>7&&(snapshot.edgingPulse?.active||engine.edgingPulse?.triggerCount>0),'You earned a Surface Pulse','Your close flight filled Proximity. The pulse reveals terrain; keep a safe gap from the rock.','.edging-pulse-gauge');
 }
 if(kind==='rhythm'){
  add('rhythm',t>1.4,'Three Lifts make a Rhythm','Tap three evenly spaced Lifts. The third sends a revealing Pulse. Follow the beat marks.','#flap-btn');
  add('wave',engine.cardRhythm?.waves>0,'Rhythm sent a Pulse','Watch the bright ring cross a Spark you have not collected. Your borrowed Harvest card rewards that crossing.',null,{x:engine.player.x,y:engine.player.y,radius:38});
  add('harvest',state.harvestPaid===true,'Harvest paid for the crossing','The Pulse restored Sparks. The pickup remains for you to collect. Rhythm creates the Pulse; Harvest rewards its crossing.','.glow-side-gauge');
 }
 if(kind==='black-hole'){
  const hole=engine.blackHoles?.items?.[0],x=hole?hole.x-engine.distance:Infinity;
  add('black-hole',x>engine.player.x&&x<engine.width-20,'Give the Black Hole space','The black core drains Sparks nearby. Fly along the lower Spark route to reduce its pull.',null,hole?{x,y:hole.y,radius:30}:null);
  const flash=packet(p=>p.kind==='sight');
  add('dark-flash',!!flash,'Flare helps you see the bypass','Catch the white triangle to light the passage. Its light fades; leave room around the dark core.',null,point(flash));
  const dark=packet(p=>p.kind==='dark');
  add('dark-spark',!!dark,'A red ring warns of a cost','This Dark Spark dims your Luminance. Collector leaves it alone. Collect a fuel Spark to clear one dimming effect.',null,point(dark));
 }
 if(kind==='guardian'){
  add('guardian',t>1.5,'Read the Warden’s warning','Watch its hands and warning. Move through the broad opening, then use the quiet room to recover.','.boss-phase-hud');
  add('hearts',t>12,'Hearts are attempts','In the main game, a fatal collision spends one heart. Recover at Rest restores missing hearts. Practice retries are unlimited.','.flight-run-status .ascension-lives');
 }
 return candidates[0]||null;
}
