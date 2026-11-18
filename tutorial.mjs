import {getCompanionAbility} from './companion-abilities.mjs?v=record-1';
import {pickupHandlingCue} from './pickup-handling-cue.mjs?v=record-1';
import {lightVisibility} from './light-field.mjs?v=record-1';
import {formatGlow} from './vitality.mjs?v=record-1';
import {isCourseLesson,shapePracticeCourse,updatePracticeCourse,practiceCollectorResting,practiceCourseEntryLesson,pendingCourseLesson} from './practice-course.mjs?v=record-1';
// Practice is an authored flight using the same controls, fuel and colliders.
// This module contains guidance and lesson scenery; it never grants rewards.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const collects = engine => engine.hasCompanion?.('collector') ?? getCompanionAbility(engine.companionRole).collects;

export function createTutorialState(node = {}) {
  const course = isCourseLesson(node.tutorialLesson);
  if (!course && !['glide', 'wind', 'hazards', 'proximity', 'black-hole', 'guardian', 'rhythm'].includes(node.tutorialLesson)) return null;
  return { lesson: node.tutorialLesson, course, practiceCards:node.practiceCards===true, directPickups: 0, carrierDeliveries: 0,
    firstDirectAt: null, firstDeliveryAt: null, glideSeconds: 0,
    sawWind: false, sawWindWarning: false, windRevealed: false, finishedWind: false,
    avoidedWind: false, sawCooldown: false, sawReel: false, toolObserved: false,
    darkSeen: false, darkAvoided: false, darkCollected: false, darkCleared: false };
}

function landform(width, scale, ceiling, variant) {
  const xs = [-.8, -.45, -.1, .23, .55, .9, 1.25, 1.65, 2.05, 2.45];
  const depths = ceiling
    ? [84, 62, 36, 18, 12, 19, 32, 45, 65, 88]
    : variant % 2 ? [78, 52, 30, 17, 13, 20, 28, 43, 66, 88]
      : [76, 49, 27, 14, 18, 26, 36, 52, 69, 88];
  const edge = [], sign = ceiling ? -1 : 1;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < 6; j++) {
    const t = j / 6, smooth = t * t * (3 - 2 * t);
    edge.push([(xs[i] + (xs[i + 1] - xs[i]) * t) * width,
      sign * (depths[i] + (depths[i + 1] - depths[i]) * smooth) * scale]);
  }
  edge.push([xs.at(-1) * width, sign * depths.at(-1) * scale]);
  return [[xs[0] * width, sign * 1000 * scale], [xs.at(-1) * width, sign * 1000 * scale], ...edge.reverse()];
}

export function buildTutorialLayout({ lesson, duration, height, speed = 154 }) {
  if (lesson === 'proximity') return buildProximityLesson({duration,height,speed});
  const scale = height / 620, obstacles = [], embers = [];
  const lastSolid = duration * speed - speed * 2.8;
  for (let x = 390, index = 0; x + 170 * 2.45 + 35 < lastSolid; x += 300, index++) {
    const width = 170, firstShelf = lesson === 'glide' && index === 0;
    const gap = height * (lesson==='rhythm' ? .84 : firstShelf ? .58 : lesson === 'black-hole' ? .74 : lesson === 'wind' ? .64 : .66);
    obstacles.push({ id: `practice-${index}`, x, width,
      center: height * (.5 + Math.sin(index * 1.2) * .022), gap,
      phase: 0, motion: 0, pattern: 'practice-terraces', variation: index % 4,
      landmark: lesson === 'wind' ? 'wind-saddle' : 'moon-terrace',
      soft: false, destroyed: false, hit: false, passed: false,
      topShape: lesson !== 'black-hole' && !firstShelf && index % 3 === 2 ? landform(width, scale, true, index) : null,
      bottomShape: landform(width, scale, false, index) });
  }
  const add = (x, y, feature) => {
    if (x > duration * speed - speed * 3.2) return;
    embers.push({ id: `practice-spark-${embers.length}`, kind: 'light', x, y: y * height,
      value: 1, fuel: true, feature, collected: false, attracted: false,
      phase: embers.length * 1.6, tutorialSpark: true });
  };
  if (lesson === 'glide') {
    // One initial Lift followed by a glide naturally approaches this low shelf.
    // The companion waits, so the first refill is visibly the player's action.
    add(345, .57, 'practice-direct');
    add(640, .64, 'practice-carrier');
    add(1110, .61, 'practice-refill');
    add(1550, .52, 'practice-refill');
    add(2010, .60, 'practice-refill');
    add(2470, .51, 'practice-refill');
  } else if(lesson==='black-hole'){
    // Recovery Sparks after the rim meet the safe glide arc. They must be
    // body-reachable while the Collector is still reeling a missed Spark.
    for(let x=350;x<duration*speed-speed*3.2;x+=330)add(x,x>=1670?.61:.69,'practice-bypass');
  } else {
    add(440, .54, 'practice-wind');
    add(870, .58, 'practice-wind');
    add(1310, .48, 'practice-wind');
    add(1750, .60, 'practice-wind');
    add(2210, .51, 'practice-wind');
    add(2670, .59, 'practice-wind');
    add(3110, .50, 'practice-wind');
    // A single optional Dark Spark sits high in the broad open room after
    // the puff. The central route stays clear; the following light can cleanse.
    if (2380 < duration * speed - speed * 3.2) embers.push({
      id: 'practice-dark', kind: 'dark', harmful: true, value: 0, fuel: false,
      x: 2380, y: height * .30, feature: 'practice-dark', tutorialDark: true,
      collected: false, attracted: false, phase: 3.1 });
  }
  // Extra quiet flying time has fuel along the open central route.
  const tailStart=lesson==='glide'?2910:3550;
  for(let x=tailStart,index=0;x<duration*speed-speed*3.2;x+=440,index++)
    add(x,index%2?.55:.50,'practice-refill');
  embers.sort((a, b) => a.x - b.x);
  return { obstacles, embers };
}

function buildProximityLesson({duration,height,speed}){
 const scale=height/620,width=(duration*speed-1050)/3.25,x=440+width*.8;
 const floor=[[-.8,40],[-.1,25],[.5,5],[1.1,-5],[1.7,15],[2.45,30]].map(([px,py])=>[px*width,py*scale]);
 const obstacle={id:'practice-bend',x,width,center:height*.5,gap:height*.32,phase:0,motion:0,
  pattern:'practice-terraces',variation:0,landmark:'moon-terrace',soft:false,destroyed:false,hit:false,passed:false,
  topShape:null,bottomShape:[[-width*.8,1000*scale],[width*2.45,1000*scale],...floor.toReversed()]};
 const floorAt=worldX=>{const local=worldX-x;for(let i=1;i<floor.length;i++){const a=floor[i-1],b=floor[i];if(local<=b[0])return height*.66+a[1]+(b[1]-a[1])*(local-a[0])/(b[0]-a[0]);}return height*.66+30*scale;};
 const embers=[];
 for(let px=340;px<duration*speed-speed*3.2;px+=260)embers.push({id:`practice-bend-spark-${embers.length}`,kind:'cluster',
  x:px,y:Math.min(height*.66,floorAt(Math.max(440,px))-height*.065),value:2,fuel:true,feature:'practice-bend',
  collected:false,attracted:false,phase:embers.length*1.6,tutorialSpark:true});
 return {obstacles:[obstacle],embers};
}

// The guardian keeps its actual hands, phases, warning and collision geometry.
// Broad openings and slow sway make this a first encounter rather than a trial.
export function tuneTutorialGuardian(layout,height){
 for(const obstacle of layout.obstacles){obstacle.gap=Math.max(obstacle.gap,height*.64);obstacle.motion*=.35;}
 for(const spark of layout.embers){const obstacle=layout.obstacles.find(o=>o.id===spark.anchor);if(obstacle){spark.y=obstacle.center;spark.pocket=false;}spark.kind='cluster';spark.value=2;}
 for(const obstacle of layout.obstacles){
  const x=obstacle.x+obstacle.width*.51;
  if(layout.embers.some(p=>Math.abs(p.x-x)<220))continue;
  layout.embers.push({id:`practice-guardian-spark-${obstacle.id}`,kind:'cluster',x,y:obstacle.center,value:2,fuel:true,
   feature:'practice-guardian-refill',collected:false,attracted:false,phase:obstacle.id*.7,tutorialSpark:true});
 }
 layout.embers.sort((a,b)=>a.x-b.x);
 return layout;
}
export function configureTutorialScene(engine){
 if(engine.tutorial?.course)return shapePracticeCourse(engine);
 const lesson=engine.tutorial?.lesson;if(!['glide','proximity','black-hole','guardian','rhythm'].includes(lesson))return;
 engine.drafts.zones=[];engine.biomeDynamics.items=[];engine.blackHoles.items=[];
 if(['proximity','black-hole'].includes(lesson)){
  engine.layout.embers.push({id:`practice-${lesson}-flash`,kind:'sight',x:lesson==='proximity'?900:650,y:engine.height*.52,value:0,fuel:false,collected:false,attracted:false,phase:1});
  if(lesson==='black-hole')engine.layout.embers.push({id:'practice-dark-optional',kind:'dark',x:2450,y:engine.height*.30,value:0,fuel:false,harmful:true,tutorialDark:true,collected:false,attracted:false,phase:2});
  engine.layout.embers.sort((a,b)=>a.x-b.x);
 }
 if(lesson!=='black-hole')return;
 const y=engine.height*.24,bypassY=engine.height*.72,x=1380;
 engine.mod.lightRadius=Math.max(360,engine.mod.lightRadius||0);
 engine.blackHoles.items=[{id:'practice-black-hole',x,y,coreRadius:16,influence:220,seed:17,placement:'practice',
  bypass:{startX:x-270,endX:x+270,y:bypassY},rate:0,potentialRate:0,frameDrained:0,drained:0,lastDrainAt:-Infinity,
  drainSequence:0,sourceX:null,sourceY:null}];
}

export function demonstratedTutorialTopics(engine){
 const state=engine?.tutorial;if(!state)return [];
 const topics=[];
 if(engine.flaps>0&&state.directPickups>0)topics.push('lift');
 if(state.shownHints?.includes('luminance'))topics.push('luminance');
 if(state.carrierDeliveries>0)topics.push('collector');
 if(state.carrierDeliveries>0&&(state.sawReel||state.sawCooldown))topics.push('collector-recovery');
 if((engine.edgingPulse?.triggerCount||0)>0)topics.push('edging');
 if((engine.condensedGlow||0)>0)topics.push('packed');
 if((engine.blackHoles?.drained||0)>0)topics.push('black-hole');
 return topics;
}

export function recordTutorialPickup(engine, ember) {
  const state = engine.tutorial;
  if (!state || ember.generated || ember.harmful || ember.kind === 'dark') return;
  if (ember.deliveredByWisp) {
    state.carrierDeliveries++;
    if (state.firstDeliveryAt === null) state.firstDeliveryAt = engine.time;
  } else {
    state.directPickups++;
    if (state.firstDirectAt === null) state.firstDirectAt = engine.time;
  }
}

export function updateTutorial(engine, dt, gust) {
  const state = engine.tutorial;
  if (!state) return;
  if (engine.time - engine.lastFlapTime > .2) state.glideSeconds += dt;
  if (state.course) updatePracticeCourse(engine, dt);
  if (engine.wisp.phase === 'cooldown') state.sawCooldown = true;
  if (['returning','reeling'].includes(engine.wisp.phase) && engine.wisp.cargo) state.sawReel = true;
  const ability = getCompanionAbility(engine.companionRole || engine.options?.companionRole);
  state.toolObserved ||= engine.hasActiveCompanions ? engine.boosts > 0 : engine.isCompanionWorking?.() === true;
  const puffs = engine.getDraftPuffs?.() || [];
  if (puffs.length) state.windRevealed = true;
  if (gust.warning || puffs.some(puff => puff.phase === 'gather')) state.sawWindWarning = true;
  if (gust.active) state.sawWind = true;
  if (state.windRevealed && !puffs.length && !gust.active && !gust.warning) {
    state.finishedWind = true;
    state.avoidedWind = !state.sawWind;
  }
  const dark = engine.layout.embers.find(packet => packet.tutorialDark);
  if (dark) {
    const x = dark.x - engine.distance;
    if (x > 18 && x < engine.width - 18) state.darkSeen = true;
    if (dark.collected) state.darkCollected = true;
    else if (x < engine.player.x - 18) state.darkAvoided = true;
    if (state.darkCollected && !engine.lightPenalties?.length) state.darkCleared = true;
  }
}

export function updateTutorialCompanion(engine, dt) {
  // Follow the usual orbit without searching until the player has made a
  // direct pickup. The real item list and its collection state stay untouched.
  if (collects(engine)
    && (engine.tutorial?.lesson === 'glide' && !engine.tutorial.directPickups || practiceCollectorResting(engine))) {
    const view = Object.create(engine);
    view.layout = { ...engine.layout, embers: [] };
    view.getNearbyPickups = () => [];
    engine.wisp.update(view, dt);
  } else engine.wisp.update(engine, dt);
}

export function getTutorialHint(engine) {
  // Edition 4 courses have no live or queued hint text: only paused lessons.
  const state=engine?.tutorial;if(!state||state.course)return null;
  const collector=collects(engine),active=engine.hasActiveCompanions;
  const hint=(id,title,text,step)=>({id,title,text,step,total:4,waitingForLift:Boolean(engine.tutorialAwaitingLift),
    worldFocus:getTutorialWorldFocus(engine),observed:{directPickups:state.directPickups,carrierDeliveries:state.carrierDeliveries,
      carrierRest:state.sawReel||state.sawCooldown,tool:state.toolObserved,draft:state.finishedWind,darkAvoided:state.darkAvoided,darkCleared:state.darkCleared}});
  if(engine.tutorialAwaitingLift)return hint('launch','Tap Lift to begin',state.lesson==='glide'?(engine.options?.cardPilot?'Lift Guide is loaned here. The amber chevron opens for a good tap window. Tap Lift yourself; release to glide.':'Tap Lift or the scene to rise; release to glide. MENU pauses.'):state.lesson==='proximity'?'Follow the Sparks near the floor. Keep a little space from solid rock.':state.lesson==='rhythm'?'Tap three evenly spaced Lifts. Watch the Pulse cross an uncollected Spark.':state.lesson==='black-hole'?'The dark core ahead drains Sparks. Follow the lower, wider route.':'Watch the Warden’s warning, then fly through the wide opening.',1);
  if(engine.dying)return hint('last-spark','The light scatters','Try again from this entrance. Practice retries are unlimited; your entrance fuel and build return.',2);
  if(engine.flame<engine.flapCost*2)return hint('low-glow','Find a Spark','Without enough Sparks you cannot Lift, but you can still collect fuel while falling. Collector keeps searching.',2);
  const exit=engine.getExitLandmark?.();
  if(exit&&exit.x<engine.width-18)return hint('exit','Reach the refuge light','Fly to the waylight while keeping enough Sparks for your last Lift.',4);
  if(state.directPickups>0&&engine.edgingPulse?.state?.active)return hint('edge-pulse','Your close flight lit the way','The meter beside your wisp fills near solid edges. Full charge briefly reveals the passage.',4);
  if(state.lesson==='glide'){
    if(!state.directPickups)return hint('direct','Lift, then glide into a packet',collector
      ?'Touch this Spark yourself first. Its lower shell flows into a green circle that Collector catches to fetch a miss.'
      :'Touch this light yourself for immediate Sparks. Only an equipped Collector fetches misses.',2);
    if(collector&&!state.carrierDeliveries)return hint('carrier','Collector rescues a miss',['reeling','returning'].includes(engine.wisp.phase)
      ?'Collector reels the intact pickup along its tether to your moving wisp. Sparks arrive on contact; Collector is ready again immediately.'
      :'Your body gets first chance. Collector can catch a missed pickup within its orbit, then reels it to your wisp.',3);
    if(collector&&engine.wisp.phase==='cooldown')return hint('rest','Collector is recovering','Its orbit shows recovering reach after a Field Impulse. Green pickup circles still show the types it can fetch.',3);
    if(engine.time>12&&engine.time<16)return hint('luminance','Your reach is Luminance','Your light reveals nearby terrain. Collector’s orbit shows its separate fetching reach.',4);
    return hint('glide-ready','Small Lifts, long glides','Time your last Lift so gravity carries you into the next Spark. Direct pickups refill your meter immediately.',4);
  }
  if(state.lesson==='proximity'){
    if(engine.edgingPulse?.state?.active)return hint('pulse','Surface Pulse · revealed','Your real Proximity charge lit the passage. Keep clear of the solid edge.',3);
    if(engine.edgingPulse?.state?.charge>.02)return hint('charging','Close flight is charging','Keep a little space from the rock. Two seconds near solid terrain earns a revealing pulse.',2);
    if((engine.condensedGlow||0)>0)return hint('packed','Surplus packs automatically','The upper-left Stored Sparks counter holds surplus from a full meter. Clear to keep it in practice.',4);
    return hint('bend','Follow the bend','The Sparks trace a safe line near solid rock. Open sky does not charge Proximity.',2);
  }
  if(state.lesson==='black-hole'){
    const hole=engine.blackHoles?.items?.[0],x=hole?hole.x-engine.distance:Infinity;
    if((engine.blackHoles?.rate||0)>0)return hint('drain','The core is draining Sparks','Move farther from the dark core. Follow the lower Sparks to reduce the drain.',3);
    if(x>engine.player.x-60)return hint('bypass','Give the dark core space','Stay on the lower Spark route. Distance keeps the drain small; the core is not a pickup.',2);
    return hint('clear-core','The wide route is safer','Collect the recovery Sparks beyond the core, then reach the waylight.',4);
  }
  if(state.lesson==='rhythm')return hint('rhythm','Three even Lifts → a Pulse','Let the ring cross a Spark you have not collected. Resonant Harvest rewards the crossing.',2);
  if(state.lesson==='guardian')return hint('guardian','Read the Warden’s hands',engine.getBossState?.()?.warning||GUARDIAN_HINT_TEXT,2);
  const gust=engine.gustState();
  const dark=engine.layout.embers.find(packet=>packet.tutorialDark),darkX=dark?dark.x-engine.distance:Infinity;
  if(dark&&!dark.collected&&darkX>engine.player.x-18&&darkX<engine.width-18)return hint('dark-packet','Avoid the dark seed',
    'Dark Sparks reduce Luminance. Collector passes them by. Touch a fuel Spark to clear one dimming effect.',4);
  if(state.darkCollected&&!state.darkCleared)return hint('dark-recovery','Restore your light','A passage Spark clears one dimming effect and refills Sparks.',4);
  if(gust.warning||gust.active)return hint('wind',gust.warning?'Read the direction':'Inside the draft puff',
    'The curls show which way the draft pushes. Leave room to drift or pass above or below the puff.',3);
  if(active&&!state.toolObserved&&engine.time<6)return hint('power','One Power control',
    'POWER starts Runner. With Space Timer, hold the scene or Lift to levitate; release to glide and recharge.',2);
  if(!state.finishedWind)return hint('watch-wind','Watch for the local draft','Only the visible puff pushes you. Its warning gives you time to choose above or below.',3);
  return hint('ready','Keep fuel for the waylight','Glide, collect deliberately, and reach the refuge. MENU pauses whenever you need it.',4);
}

// Never require reading during active play. Practice hint text is shown only in
// the paused coach: the entry hint before the first Lift (with its own button),
// and in-flight hints queued until the app's safe-pause check allows a stop.
const GUARDIAN_HINT_TEXT='Stone hands mark the solid edges. Use small Lifts through each broad opening; the quiet rooms give you time.';
export const PRACTICE_ENTRY_PREFIX='practice-entry:';
export const PRACTICE_HINT_PREFIX='practice-hint:';
// launch is the entry hint; last-spark plays during the death animation, when
// no pause is possible and the retry screen repeats it.
const UNQUEUED_HINTS=new Set(['launch','last-spark']);
// One stop per topic: these hints repeat a practice coach lesson, which is the one card kept.
const COACH_DUPLICATES={glide:new Set(['direct','carrier','luminance'])};
// The first flight already stops for Sparks, Collector and Luminance; other hints wait for the checkpoint.
const CHECKPOINT_ONLY_LESSONS=new Set(['glide']);
// Hints that refer to the flight they appear in and are meaningless afterwards.
const FLIGHT_ONLY_HINTS=new Set(['exit']);
const hintStep=(id,title,text,extra={})=>({id,title,text,contextual:true,allowTarget:false,focusAction:true,actionLabel:'Continue',skipLabel:false,...extra});

/** The entry hint as a paused coach step, once per lesson per practice run. */
export function tutorialEntryLesson(engine,run={}){
  const state=engine?.tutorial;if(!state||!engine.tutorialAwaitingLift||run?.guideSkipped)return null;
  if(state.course)return practiceCourseEntryLesson(engine,run);
  const id=PRACTICE_ENTRY_PREFIX+state.lesson;if(run?.guideSeen?.[id])return null;
  const hint=getTutorialHint(engine);if(hint?.id!=='launch')return null;
  const teachesLift=state.lesson==='glide';
  // The cost comes from the live Lift cost, the same value the Lift button shows.
  const cost=Number.isFinite(engine.flapCost)?formatGlow(engine.flapCost):null;
  const text=teachesLift&&cost?`${hint.text} Each Lift spends ${cost} ${cost==='1'?'Spark':'Sparks'}.`:hint.text;
  return hintStep(id,hint.title,text,{actionLabel:'Got it',entry:true,teachesLift});
}

/** Remember a newly relevant in-flight hint; it is shown only at a safe pause. */
export function notePracticeHint(engine,run={},hint){
  const state=engine?.tutorial;if(!state||!hint?.id||UNQUEUED_HINTS.has(hint.id)||run?.guideSkipped)return false;
  if(run?.guideSeen?.[PRACTICE_HINT_PREFIX+hint.id]||COACH_DUPLICATES[state.lesson]?.has(hint.id))return false;
  state.hintQueue||=[];if(state.hintQueue.some(item=>item.id===hint.id))return false;
  state.hintQueue.push({id:hint.id,title:hint.title,text:hint.id==='guardian'?GUARDIAN_HINT_TEXT:hint.text});
  return true;
}
const keyOf=item=>item.key||PRACTICE_HINT_PREFIX+item.id;
const unseen=(queue,run)=>{while(queue?.length&&run?.guideSeen?.[keyOf(queue[0])])queue.shift();return queue?.[0]||null;};
const inFlight=engine=>!CHECKPOINT_ONLY_LESSONS.has(engine?.tutorial?.lesson);
export function hasPracticeHint(engine,run={}){return inFlight(engine)&&!!unseen(engine?.tutorial?.hintQueue,run);}
/** Take the oldest queued hint as a paused coach step. */
export function takePracticeHint(engine,run={}){
  if(!inFlight(engine))return null;
  const queue=engine?.tutorial?.hintQueue,item=unseen(queue,run);if(!item)return null;queue.shift();
  (engine.tutorial.shownHints||=[]).includes(item.id)||engine.tutorial.shownHints.push(item.id);
  return hintStep(PRACTICE_HINT_PREFIX+item.id,item.title,item.text);
}
/** Hints still queued when a flight ends wait for the next checkpoint. */
export function carryPracticeHints(engine,run){
  if(engine?.tutorial?.course){const step=pendingCourseLesson(engine,run);if(step)deferPracticeLesson(run,step);return;}
  const queue=engine?.tutorial?.hintQueue;if(!run||!queue?.length)return;
  const carried=run.pendingPracticeHints||=[];
  for(const item of queue)if(!FLIGHT_ONLY_HINTS.has(item.id)&&!run.guideSeen?.[keyOf(item)]&&!carried.some(c=>keyOf(c)===keyOf(item)))carried.push(item);
  queue.length=0;
}
/** Defer a practice coach lesson (its own guideSeen key) to the next checkpoint. */
export function deferPracticeLesson(run,step){
  if(!run||!step?.id||run.guideSeen?.[step.id])return false;
  const carried=run.pendingPracticeHints||=[];if(carried.some(c=>keyOf(c)===step.id))return false;
  carried.push({id:step.id,key:step.id,title:step.title,text:step.text});return true;
}
export function takeCarriedPracticeHint(run){
  const item=unseen(run?.pendingPracticeHints,run);if(!item)return null;run.pendingPracticeHints.shift();
  return hintStep(keyOf(item),item.title,item.text);
}
/** Coach lessons allowed to stop the first practice flight; any other waits for the checkpoint. */
export const FIRST_FLIGHT_STOPS=new Set(['practice:sparks','practice:collector','practice:luminance']);

/** A semantic focus over a real visible world object; reading it never pauses or advances play. */
export function getTutorialWorldFocus(engine, seenIds = null) {
  const state = engine?.tutorial;
  if (!state || engine.tutorialAwaitingLift || engine.finished || engine.dying) return null;
  const width = engine.width || 390, height = engine.height || 620;
  const lightState=engine.getLightState?.()||{};
  const visible = (x, y) => Number.isFinite(x) && Number.isFinite(y)
    && x >= 18 && x <= width - 18 && y >= 18 && y <= height - 18
    && lightVisibility(engine,lightState,x,y)>=.28;
  const focus = (id, title, text, x, y, radius) => visible(x, y)
    ? { id, title, text, x, y, radius: Math.min(radius, x - 4, width - x - 4, y - 4, height - y - 4) } : null;
  const candidates = [];
  if(engine.time>10)candidates.push(focus('luminance','Luminance','Luminance is how far your wisp lights the passage. Open the Luminance chapter to see farther. Collector’s orbit shows its fetching reach.',engine.player.x,engine.player.y,lightState.radius||70));
  const hasCollector = collects(engine);
  if(state.lesson==='hazards')for(const hole of engine.blackHoles?.items||[])candidates.push(focus('black-hole','Black Hole','This dark core steals Sparks nearby. It is not a pickup. Fly farther away to reduce the drain; shields cannot block it.',hole.x-engine.distance,hole.y,35));
  const packets = (engine.layout?.embers || []).filter(packet => !packet.collected && !packet.carried)
    .map(packet => ({ packet, x: packet.x - engine.distance }))
    .filter(({ packet, x }) => visible(x, packet.y) && x >= engine.player.x - 18);
  const dark = packets.find(({ packet }) => packet.harmful || packet.kind === 'dark');
  if (dark) candidates.push(focus('dark-packet', 'Dark Spark',
    'Avoid this Dark Spark: it reduces your Luminance. A Spark clears one effect.', dark.x, dark.packet.y, 20));
  const light = packets.filter(({ packet }) => !packet.harmful && packet.kind !== 'dark')
    .sort((a, b) => Math.abs(a.x - engine.player.x) - Math.abs(b.x - engine.player.x))[0];
  if (light) candidates.push(focus('light-packet', 'Refill the Spark Meter',
    hasCollector ? (pickupHandlingCue(light.packet,engine.mod,{collector:true})==='collector'?'The small green circle below this pickup lets Collector fetch it after you pass, then reel it to your main wisp. Touching it yourself refills immediately.':'Touch it yourself. Cache Handling or Flare Handling adds the green circle for Collector.')
      : 'Touch this bright packet yourself to refill Sparks. Your selected companion does not fetch.', light.x, light.packet.y, 20));
  for (const puff of engine.getDraftPuffs?.() || []) candidates.push(focus('draft', 'Local draft puff',
    'Only these curls push you. Fly above or below their boundary.',
    puff.x - engine.distance, puff.y, Math.min(puff.rx, puff.ry, 48)));
  const carrier = engine.getWispState?.();
  if (['reeling','returning'].includes(carrier?.phase) && carrier.carrying) candidates.push(focus('carrier-return', 'Collector delivery',
    'Collector is reeling the intact pickup along its tether. Your meter refills when the shell touches your moving wisp.', carrier.x, carrier.y, 21));
  if (carrier?.phase === 'cooldown' && state.carrierDeliveries > 0) candidates.push(focus('carrier-rest', 'Collector recovery',
    'After a Field Impulse, its smaller orbit grows as reach recovers. A normal reel ends ready on pickup contact.', carrier.x, carrier.y, 21));
  const exit = engine.getExitLandmark?.();
  if (exit) candidates.push(focus('exit', 'Refuge light', 'Fly to this waylight to finish the passage.', exit.x, exit.y, 25));
  const seen = id => seenIds?.has?.(id) === true || Array.isArray(seenIds) && seenIds.includes(id);
  return candidates.find(candidate => candidate && !seen(candidate.id)) || null;
}
