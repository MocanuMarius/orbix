// First Light, Edition 5 (18 November 2026): thirteen stops, eight short flights on real catalog
// courses and five paused screens that build the card Chain one card at a time.
// Each flight course is the game's own level (terrain polygons, scenery and exit). These hooks only calm
// it and place the one taught element where the lesson needs it. Lessons are returned as paused coach
// steps; this module never pauses, draws text or grants anything outside practice.
import {obstacleEdgeClearance} from './edging-pulse.mjs?v=rates-1';
import {formatGlow} from './vitality.mjs?v=rates-1';
import {FLASH_BASE_DURATION} from './pickups.mjs?v=rates-1';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
/** Free flight before the first in-flight stop, and between stops (simulated seconds). */
export const PRACTICE_STOP_SPACING=12;
/** The two Inscriptions the practice Scribe offers (the Scribe offers two): both change the card in their slot. */
export const PRACTICE_SCRIBE_OFFERS=Object.freeze(['gilded','twin-mark']);
/** Every card practice hands out, in the order it hands them out (practice only; they vanish with practice). */
export const PRACTICE_GIFTS=Object.freeze(['body-spark','echo','crescendo','harvest-common']);

/** The stop table (docs/tutorial-redesign-proposal.md, "Edition 5"). `give`: cards handed to the Deck on arrival
 * (at the Rest: after Add slot). `goal`: what the screen needs before the next flight. */
export const PRACTICE_STOPS=Object.freeze([
 {id:'practice-first-light',type:'flight',lesson:'course-lift',levelId:'moonruins-courtyard',terrain:'ruins',name:'First Light',duration:32,
  entry:'practice:lift',flight:['practice:sparks']},
 {id:'practice-collector',type:'flight',lesson:'course-collector',levelId:'marsh-reed-channel',terrain:'canopy',name:'Meet Collector',duration:34,
  entry:'practice:meet-collector',flight:['practice:collector-fetch']},
 {id:'practice-light',type:'flight',lesson:'course-light',levelId:'cemetery-grave-road',terrain:'ruins',name:'Luminance',duration:32,
  entry:'practice:luminance',flight:['practice:flash']},
 {id:'practice-chain',type:'support',kind:'camp',terrain:'canopy',name:'Your Chain',practiceChain:true,slots:3,give:['body-spark'],goal:'place',
  support:['practice:chain','practice:place','practice:preview']},
 {id:'practice-strip',type:'flight',lesson:'course-strip',levelId:'desert-dune-trough',terrain:'ruins',name:'Watch it fire',duration:26,
  entry:null,flight:['practice:strip']},
 {id:'practice-order',type:'support',kind:'camp',terrain:'canopy',name:'Order matters',practiceChain:true,give:['echo'],goal:'echo-left',
  support:['practice:echo','practice:order-wrong','practice:order']},
 {id:'practice-dark',type:'flight',lesson:'course-dark',levelId:'cloud-sky-islands',terrain:'storm',name:'Echo & Black Holes',duration:34,
  entry:null,flight:['practice:black-hole']},
 {id:'practice-rest',type:'support',kind:'camp',terrain:'canopy',name:'Rest',practiceChain:true,practiceRest:true,give:['crescendo'],goal:'boost-right',
  support:['practice:rest','practice:boost','practice:boost-wrong']},
 {id:'practice-boost',type:'flight',lesson:'course-boost',levelId:'pinewood-high-boughs',terrain:'canopy',name:'A doubled Chain',duration:24,
  entry:'practice:hearts',flight:[]},
 {id:'practice-pulse-camp',type:'support',kind:'camp',terrain:'canopy',name:'Pulse cards',practiceChain:true,give:['harvest-common'],goal:'harvest',
  support:['practice:roles','practice:pulse-card']},
 {id:'practice-pulse',type:'flight',lesson:'course-pulse',levelId:'coral-reef-pass',terrain:'ruins',name:'Pulses pay',duration:30,
  entry:null,flight:['practice:pulse-paid']},
 {id:'practice-scribe',type:'support',kind:'scribe',terrain:'ruins',name:'The Scribe',practiceChain:true,practiceScribe:true,goal:'inscribed',
  support:['practice:scribe','practice:scribe-slot','practice:brand']},
 {id:'practice-finale',type:'finale',lesson:'course-finale',levelId:'fungal-cap-canopy',terrain:'canopy',name:'Last Light',duration:28,
  entry:null,flight:['practice:inscription'],after:['practice:rearrange']},
].map(stop=>Object.freeze(stop)));
export const PRACTICE_COURSE_LESSONS=Object.freeze(PRACTICE_STOPS.filter(s=>s.lesson).map(s=>s.lesson));
export const isCourseLesson=id=>PRACTICE_COURSE_LESSONS.includes(id);
const stopFor=lesson=>PRACTICE_STOPS.find(stop=>stop.lesson===lesson)||null;
export const practiceStopById=id=>PRACTICE_STOPS.find(stop=>stop.id===id)||null;

// One idea per lesson, two short sentences at most, in the game's own terms.
// `terms` are glossary keys (card-terms.mjs, several with a gameplay clip) offered as links on the card.
// `carry: false`: a lesson about the in-flight Chain strip is never repeated at a checkpoint, where no strip exists.
export const PRACTICE_LESSONS=Object.freeze({
 'practice:lift':{topic:'lift',title:'Lift and glide',text:'Tap to Lift your wisp. Let go to glide down.',target:'#flap-btn',terms:['lift']},
 'practice:sparks':{topic:null,title:'Sparks',text:'Touch Sparks to fill your Spark Meter. Each Lift costs {cost}.',target:'.glow-side-gauge',terms:['spark','meter']},
 'practice:meet-collector':{topic:'collector',title:'Meet Collector',text:'The green light circling you is Collector, your companion. It flies wherever you fly.',terms:['collector']},
 'practice:collector-fetch':{topic:'collector-recovery',title:'Delivery',text:'Collector caught a Spark you missed and reels it back. That is a Delivery: it counts when it reaches you.',terms:['collector','delivery']},
 'practice:luminance':{topic:'luminance',title:'Luminance',text:'The glow around your wisp is Luminance. It shows how far you can see.',terms:['luminance']},
 'practice:flash':{topic:'special-sparks',title:'Flare',text:`This white triangle is a Flare. Catch it: for ${FLASH_BASE_DURATION} seconds it sends a Pulse every 2 seconds and raises your Luminance very high.`,terms:['flash','wave']},
 // Camp 1: the Chain, a first card, the preview.
 'practice:chain':{topic:null,title:'Your Chain',text:'This row of slots is your Chain. When a Trigger happens, its cards fire from left to right.',target:'.practice-chain-slots',terms:['slot','trigger']},
 'practice:place':{topic:null,title:'A gift: Body Spark',text:'A gift: Body Spark, a Collect card. Tap Slot 2, then tap Body Spark in your Deck to place it.',target:'.dk2-station[data-slot="1"]',terms:['collect']},
 'practice:preview':{topic:null,title:'What it pays',text:'This number is what your Chain pays on every Collect. Press Done, then fly.',target:'#dk22-medal',terms:['collect']},
 // Flight 4: the strip.
 'practice:strip':{topic:null,title:'Your Chain in flight',text:'Each shape up here is a slot of your Chain. It flashes white each time its card fires.',target:'.chain-strip',terms:['slot'],carry:false},
 // Camp 2: order.
 'practice:echo':{topic:null,title:'A gift: Echo',text:'A gift: Echo, a Repeat card. It repeats the card to its right, so put it just left of Body Spark.',terms:['next']},
 'practice:order-wrong':{topic:null,title:'Nothing to repeat',text:'Echo repeats the card to its right. Body Spark is not there, so nothing changed: move Echo just left of it.',terms:['next']},
 'practice:order':{topic:null,title:'Order matters',text:'Order matters: now Echo repeats Body Spark, and every Collect pays twice as much.',target:'#dk22-medal',terms:['next']},
 'practice:black-hole':{topic:'black-hole',title:'Black Hole',text:'This Black Hole drains Sparks while you are near it. Fly wide around it.',terms:[]},
 // The Rest: Add slot, then a Boost.
 'practice:rest':{topic:null,title:'Rest',text:'At a Rest you choose one action. Add slot gives your Chain one more slot: take it now.',target:'[data-action="practice-add-slot"]',terms:['rest','slot']},
 'practice:boost':{topic:null,title:'A gift: Crescendo',text:'A gift: Crescendo, a Boost. It doubles the cards to its left, so put it right of Body Spark.',terms:['boost']},
 'practice:boost-wrong':{topic:null,title:'Nothing to boost',text:'Crescendo boosts only cards to its left, and Body Spark is not there. Move Crescendo to the right of Body Spark.',terms:['boost']},
 'practice:hearts':{topic:'hearts',title:'Hearts',text:'Hearts are your tries in a real run: a crash costs one. In practice a crash only restarts the passage.',target:'.flight-run-status .ascension-lives',terms:['heart']},
 // Camp 4: roles, then a Pulse card.
 'practice:roles':{topic:null,title:'Three roles',text:'Echo is a Repeat and Crescendo a Boost: roles, not Triggers. A Passive card needs no Trigger; it works all flight.',target:'.practice-chain-slots',terms:['next','boost','always-on']},
 'practice:pulse-card':{topic:null,title:'A gift: Resonant Harvest',text:'A gift: Resonant Harvest, a Pulse card: it pays when a Pulse crosses a Spark you have not taken. Put it in your Chain.',terms:['wave']},
 'practice:pulse-paid':{topic:null,title:'Harvest paid',text:'A Flare Pulse crossed a Spark you had not taken, so Resonant Harvest fired. Its shape flashed up here.',target:'.chain-strip',terms:['wave'],carry:false},
 // The Scribe.
 'practice:scribe':{topic:'artifacts',title:'The Scribe',text:'The Scribe writes one Inscription on a slot of your Chain. Pick an Inscription, then the slot to write it on, then Write.',target:'.iw-offers',terms:['inscription']},
 'practice:scribe-slot':{topic:null,title:'Choose a slot',text:'An Inscription stays on its slot, whatever card sits there. Try the slot that holds Body Spark.',target:'.scribe-slots',terms:['inscription','slot']},
 'practice:brand':{topic:null,title:'The brand',text:'This mark on the slot frame shows its Inscription. In flight, a bar under that slot’s shape shows it.',target:'.dk2-inscribed',terms:['inscription']},
 'practice:inscription':{topic:null,title:'Inscription in flight',text:'The bar under a shape marks your inscribed slot. It flashes when the Inscription acts.',target:'.chain-strip',terms:['inscription'],carry:false},
 // The finish.
 'practice:rearrange':{topic:null,title:'Your own Chain',text:'Between flights you can rearrange your Chain, so try different orders. Help has the glossary, and each departure shows a tip.',terms:['trigger','slot']},
});
/** Onboarding topics the real game should not repeat once practice taught them. */
export function practiceLessonTopics(guideSeen={}){
 return [...new Set(Object.entries(PRACTICE_LESSONS).filter(([id,l])=>l.topic&&guideSeen?.[id]).map(([,l])=>l.topic))];
}
const words=text=>String(text).trim().split(/\s+/).length;
export const lessonWords=id=>words(PRACTICE_LESSONS[id]?.text||'');

/** A paused coach step. Entry lessons are closed with "Got it"; the others with "Continue". */
export function practiceLessonStep(id,{engine=null,point=null,entry=false,actionLabel=null,target=undefined}={}){
 const lesson=PRACTICE_LESSONS[id];if(!lesson)return null;
 const cost=Number.isFinite(engine?.flapCost)?formatGlow(engine.flapCost):'3';
 const text=lesson.text.replace('{cost}',`${cost} ${cost==='1'?'Spark':'Sparks'}`);
 return {id,title:lesson.title,text,target:target===undefined?lesson.target||null:target,...(point?{point}:{}),terms:[...(lesson.terms||[])],
  contextual:true,allowTarget:false,focusAction:true,actionLabel:actionLabel||(entry?'Got it':'Continue'),skipLabel:false,
  ...(entry?{entry:true,teachesLift:id==='practice:lift'}:{}),practiceEdition:5};
}

// ── The Chain the player builds (pure reads of run.practiceCards) ─────────────
const chainIds=run=>(run?.practiceCards||[]).map(card=>card?.cardId||null);
const slotOf=(run,id)=>chainIds(run).indexOf(id);
/** Where the gift cards sit: -1 when not in the Chain. */
export function practiceChainPlaces(run){
 return {body:slotOf(run,'body-spark'),echo:slotOf(run,'echo'),boost:slotOf(run,'crescendo'),harvest:slotOf(run,'harvest-common'),
  slots:(run?.practiceCards||[]).length,inscribed:(run?.practiceInscriptions||[]).some(entry=>entry?.id)};
}
/** Whether a screen's goal is met. Every goal can always be reached: the Chain has a free slot for each gift. */
export function practiceGoalMet(run,goal){
 const p=practiceChainPlaces(run);
 switch(goal){
  case 'place':return p.body>=0;
  case 'echo-left':return p.body>0&&p.echo===p.body-1;
  case 'boost-right':return p.body>=0&&p.boost>p.body;
  case 'harvest':return p.harvest>=0;
  case 'inscribed':return p.inscribed;
  default:return true;
 }
}
/** One plain status line for the Chain screen and the camp screen: what to do, or what is now true. */
export function practiceChainAdvice(run,goal){
 const p=practiceChainPlaces(run),done=practiceGoalMet(run,goal);
 if(goal!=='inscribed'&&p.body<0&&goal!=='place')return {done:false,tone:'warn',text:'Put Body Spark back in your Chain first.'};
 switch(goal){
  case 'place':return done?{done,tone:'done',text:`Body Spark is in slot ${p.body+1}. It pays on every Collect.`}:{done,tone:'',text:'Put Body Spark in a slot of your Chain.'};
  case 'echo-left':
   if(done)return {done,tone:'done',text:'Echo repeats Body Spark: each Collect pays twice.'};
   if(p.echo>=0)return {done,tone:'warn',text:'Echo is not just left of Body Spark, so it repeats nothing.'};
   if(p.body===0)return {done,tone:'',text:'Body Spark is in Slot 1. Move it right, then put Echo to its left.'};
   return {done,tone:'',text:'Put Echo just left of Body Spark.'};
  case 'boost-right':
   if(done)return {done,tone:'done',text:'Crescendo doubles every card to its left.'};
   if(p.boost>=0)return {done,tone:'warn',text:'Crescendo is left of Body Spark, so it doubles nothing.'};
   return {done,tone:'',text:'Put Crescendo right of Body Spark.'};
  case 'harvest':return done?{done,tone:'done',text:'Resonant Harvest waits for a Pulse.'}:{done,tone:'',text:'Put Resonant Harvest in your empty slot.'};
  case 'inscribed':return done?{done,tone:'done',text:'Your Inscription is written.'}:{done,tone:'',text:'Choose an Inscription, then a slot.'};
  default:return {done:true,tone:'',text:''};
 }
}
const station=slot=>Number.isInteger(slot)&&slot>=0?`.dk2-station[data-slot="${slot}"]`:null;
/** Lessons that point at a slot point at the one that matters in this Chain. */
function supportTarget(id,run){
 const p=practiceChainPlaces(run),empty=(run?.practiceCards||[]).findIndex(card=>!card);
 if(id==='practice:echo')return station(p.body>0?p.body-1:p.body>=0?p.body:empty);
 if(id==='practice:order-wrong')return station(p.echo);
 if(id==='practice:boost')return station(p.body>=0&&p.body+1<p.slots?p.body+1:empty);
 if(id==='practice:boost-wrong')return station(p.boost);
 if(id==='practice:pulse-card')return station(empty>=0?empty:p.slots-1);
 return undefined;
}
// When each screen lesson may show, and where: 'screen' (the stop's own screen), 'chain' (the Chain screen),
// 'scribe' (the Scribe's offers), 'scribe-slot' (its slot step), 'result' (the practice result screen).
const SUPPORT_WHEN={
 'practice:chain':{where:'screen',when:()=>true,action:'Open the Chain'},
 'practice:place':{where:'chain',when:run=>!practiceGoalMet(run,'place'),action:'Try it'},
 'practice:preview':{where:'chain',when:run=>practiceGoalMet(run,'place')},
 'practice:echo':{where:'chain',when:run=>practiceChainPlaces(run).echo<0,action:'Try it'},
 'practice:order-wrong':{where:'chain',when:run=>{const p=practiceChainPlaces(run);return p.echo>=0&&p.body>=0&&p.echo!==p.body-1;},action:'Try again'},
 'practice:order':{where:'chain',when:run=>practiceGoalMet(run,'echo-left')},
 'practice:rest':{where:'screen',when:run=>!run?.practiceSlotAdded,action:'Got it'},
 'practice:boost':{where:'chain',when:run=>!!run?.practiceSlotAdded&&practiceChainPlaces(run).boost<0,action:'Try it'},
 'practice:boost-wrong':{where:'chain',when:run=>{const p=practiceChainPlaces(run);return p.boost>=0&&p.body>=0&&p.boost<p.body;},action:'Try again'},
 'practice:roles':{where:'screen',when:()=>true,action:'Open the Chain'},
 'practice:pulse-card':{where:'chain',when:run=>!practiceGoalMet(run,'harvest'),action:'Try it'},
 'practice:scribe':{where:'scribe',when:run=>!practiceGoalMet(run,'inscribed')},
 'practice:scribe-slot':{where:'scribe-slot',when:run=>!practiceGoalMet(run,'inscribed')},
 'practice:brand':{where:'chain',when:run=>practiceGoalMet(run,'inscribed')},
 'practice:rearrange':{where:'result',when:run=>run?.success===true},
};
export const practiceSupportWhere=id=>SUPPORT_WHEN[id]?.where||null;
/** The next paused screen lesson for this stop and place, or null. Screens are paused by nature. */
export function practiceSupportLesson(run,where='screen'){
 if(!run?.isTutorial||run.guideSkipped)return null;
 const stop=where==='result'?PRACTICE_STOPS.at(-1):practiceStopById(run.current?.id);
 if(!stop||(where!=='result'&&run.phase!=='support'))return null;
 for(const id of [...(stop.support||[]),...(stop.after||[])]){
  const rule=SUPPORT_WHEN[id];
  if(!rule||rule.where!==where||run.guideSeen?.[id]||!rule.when(run))continue;
  return practiceLessonStep(id,{actionLabel:rule.action||'Continue',target:supportTarget(id,run)});
 }
 return null;
}
/** Kept for the Edition 4 entry point: the camp screen's first lesson. */
export function practiceCampLesson(view,run={}){
 return view==='support'?practiceSupportLesson(run,'screen'):view==='result'?practiceSupportLesson(run,'result'):null;
}

// ── Geometry over the real course ─────────────────────────────────────────────
const speedOf=engine=>Number(engine.baseSpeed)||154;
/** World x the wisp reaches t simulated seconds after the flight starts. */
export const worldXAt=(engine,t)=>engine.distanceOrigin+engine.player.x+speedOf(engine)*t;
const timeAtX=(engine,x)=>(x-engine.distanceOrigin-engine.player.x)/speedOf(engine);
function nearObstacles(engine,x,r){
 return engine.layout.obstacles.filter(o=>!o.destroyed&&x+r>=o.x-o.width&&x-r<=o.x+o.width*2.5);
}
function clearanceAt(engine,x,y,r){
 let c=Infinity;for(const o of nearObstacles(engine,x,r+60))c=Math.min(c,obstacleEdgeClearance(x,y,r,o,0,Infinity,o.center));return c;
}
/** The widest free vertical band for a body of radius r at world x. */
export function freeBand(engine,x,r=(engine.player?.radius||9.35)+6){
 const h=engine.height,lo=r+30,hi=h-r-30,near=nearObstacles(engine,x,r);
 let best=null,cur=null;
 for(let y=lo;y<=hi;y+=4){
  const ok=near.every(o=>obstacleEdgeClearance(x,y,r,o,0,Infinity,o.center)>0);
  if(ok){cur??={top:y,bottom:y};cur.bottom=y;}
  else if(cur){if(!best||cur.bottom-cur.top>best.bottom-best.top)best=cur;cur=null;}
 }
 if(cur&&(!best||cur.bottom-cur.top>best.bottom-best.top))best=cur;
 return best?{...best,mid:(best.top+best.bottom)/2,size:best.bottom-best.top}:null;
}
function spark(engine,x,y,feature,extra={}){
 const p={id:`${feature}-${Math.round(x)}`,kind:'light',x,y,value:1,fuel:true,feature,collected:false,attracted:false,
  phase:(x*.013)%6.28,tutorialSpark:true,practiceCourse:true,...extra};
 engine.layout.embers.push(p);return p;
}
/** A line of Sparks along the free band between two arrival times. */
function sparkLine(engine,from,to,every,{feature='course-spark',lift=0,wave=0}={}){
 const h=engine.height,out=[];let y=null;
 for(let t=from;t<=to+1e-9;t+=every){
  const x=worldXAt(engine,t),band=freeBand(engine,x);if(!band||band.size<34)continue;
  const want=clamp(band.mid+lift*h+(wave?Math.sin(t*wave)*h*.07:0),band.top+16,band.bottom-16);
  y=y===null?want:clamp(want,y-h*.12,y+h*.12);y=clamp(y,band.top+14,band.bottom-14);
  out.push(spark(engine,x,y,feature));
 }
 return out;
}
function flash(engine,t,feature='course-flash'){
 const x=worldXAt(engine,t),band=freeBand(engine,x);if(!band)return null;
 const p={id:`${feature}-${Math.round(x)}`,kind:'sight',x,y:band.mid,value:0,fuel:false,feature,collected:false,attracted:false,phase:1,practiceCourse:true};
 engine.layout.embers.push(p);return p;
}
/** A real Black Hole (black-holes.mjs fields) with a wide, Spark-marked bypass. */
function blackHole(engine,t,index){
 const h=engine.height,influence=Math.round(h*.5),core=16;
 for(const shift of [0,.5,-.5,1,-1,1.5,2,-1.5,2.5]){
  const x=worldXAt(engine,t+shift),band=freeBand(engine,x,core+16),lane=freeBand(engine,x,engine.player.radius+10);
  if(!band||!lane||band.size<h*.5)continue;
  for(const top of [true,false]){
   const y=top?band.top+8:band.bottom-8,laneY=top?Math.min(lane.bottom-10,y+influence*.92):Math.max(lane.top+10,y-influence*.92);
   if(Math.abs(laneY-y)<h*.42)continue;
   let clear=true;for(let lx=x-270;lx<=x+270;lx+=45){const b=freeBand(engine,lx,engine.player.radius+8);if(!b||laneY<b.top||laneY>b.bottom){clear=false;break;}}
   if(!clear)continue;
   const hole={id:`practice-black-hole:${index}`,x,y,coreRadius:core,influence,seed:17+index,placement:'practice',
    bypass:{startX:x-270,endX:x+270,y:laneY},rate:0,potentialRate:0,frameDrained:0,drained:0,lastDrainAt:-Infinity,
    drainSequence:0,sourceX:null,sourceY:null};
   for(let lx=x-240;lx<=x+240;lx+=120)spark(engine,lx,laneY,'course-bypass',{blackHoleBypass:true});
   return hole;
  }
 }
 return null;
}
/** Gaps are widened before the lesson point; difficulty rises only after it. */
function calm(engine,lessonX,{before=.6,after=.48}={}){
 const h=engine.height;
 for(const o of engine.layout.obstacles){
  if(o.exitFoundation||o.id==='exit-landing'||!(o.gap>0))continue;
  const want=(o.x<lessonX?before:after)*h;
  if(o.gap<want)o.gap=want;
  o.motion=0;
 }
}

/** Shape the real course for its lesson. Called once, after the course and its systems exist. */
export function shapePracticeCourse(engine){
 const state=engine.tutorial,lesson=state?.lesson;if(!state?.course)return;
 engine.drafts.zones=[];engine.biomeDynamics.items=[];engine.blackHoles.items=[];
 engine.layout.embers=[];engine.layout.riskChains=[];engine.layout.challenges=[];engine.layout.flightForks=[];
 const at=t=>worldXAt(engine,t),plan=state.plan={lesson};
 if(lesson==='course-lift'){
  calm(engine,at(18),{before:.62,after:.5});
  // Quiet opening: open courts only. The first Sparks arrive after a few Lifts.
  sparkLine(engine,7.2,10.4,.8);
  plan.lessonSparks=sparkLine(engine,15.4,18.6,.55);
  sparkLine(engine,20,25,.6,{wave:1.4});
 }else if(lesson==='course-collector'){
  calm(engine,at(19),{before:.62,after:.5});
  sparkLine(engine,3.5,11.6,.7);
  plan.collectorWakeX=at(12.2);
  for(const t of [14.2,17.4,20.6]){const x=at(t),b=freeBand(engine,x);if(b)spark(engine,x,b.mid,'course-miss',{stagedMiss:true});}
  sparkLine(engine,15.6,16.6,.5);sparkLine(engine,18.8,19.6,.4);
  sparkLine(engine,22.2,26.5,.7,{wave:1.1});
 }else if(lesson==='course-light'){
  calm(engine,at(17),{before:.62,after:.5});
  sparkLine(engine,3.5,11,.9);
  sparkLine(engine,12.4,14.4,.7);
  plan.flashes=[flash(engine,16.2),flash(engine,23.4)].filter(Boolean);
  sparkLine(engine,17.4,22.4,.7);sparkLine(engine,24.4,26,.6);
 }else if(lesson==='course-strip'){
  // Body Spark fires on every Spark touched; a dense line after the free stretch makes the first stop certain.
  calm(engine,at(12),{before:.62,after:.55});
  sparkLine(engine,3.5,10.5,.9);
  plan.stripSparks=sparkLine(engine,12.2,16.4,.45);
  sparkLine(engine,17.5,22.5,.6,{wave:1.2});
 }else if(lesson==='course-dark'){
  calm(engine,at(16),{before:.6,after:.5});
  sparkLine(engine,2.5,14,.75,{wave:1.2});
  for(const t of [6.4,10.8]){const x=at(t),b=freeBand(engine,x);if(b)spark(engine,x,b.mid,'course-miss',{stagedMiss:true});}
  plan.holes=[blackHole(engine,17.6,0),blackHole(engine,24,1)].filter(Boolean);
  engine.blackHoles.items=plan.holes;
  sparkLine(engine,26.2,27,.5);
 }else if(lesson==='course-boost'){
  // No in-flight lesson: free flying with the doubled Chain.
  calm(engine,at(12),{before:.6,after:.55});
  sparkLine(engine,2.5,9.5,.7);sparkLine(engine,10.5,15,.55,{wave:1.1});sparkLine(engine,16,20.5,.6);
 }else if(lesson==='course-pulse'){
  // Flares after the free stretch, with Sparks ahead of them for the Pulses to cross before the wisp takes them.
  calm(engine,at(14),{before:.62,after:.55});
  sparkLine(engine,3,10.5,.8);
  plan.flashes=[flash(engine,12.4),flash(engine,20.4)].filter(Boolean);
  sparkLine(engine,13.4,19.2,.5,{wave:1});sparkLine(engine,21.2,26,.5,{wave:1.3});
 }else if(lesson==='course-finale'){
  calm(engine,at(14),{before:.62,after:.55});
  sparkLine(engine,2.5,9,.75);
  plan.finaleSparks=sparkLine(engine,11.6,15.6,.45);
  sparkLine(engine,16.8,24,.6,{wave:1.2});
 }
 // Nothing may sit past the refuge.
 const end=engine.totalDistance+engine.player.x-24;
 engine.layout.embers=engine.layout.embers.filter(p=>p.x<=end).sort((a,b)=>a.x-b.x);
 engine.blackHoles.items=engine.blackHoles.items.filter(hole=>hole.x+hole.influence<end+engine.player.x);
 state.ready={};state.shieldSaved=false;
}

/** Collector waits (orbiting, visible) until its lesson's staged stretch. */
export function practiceCollectorResting(engine){
 const state=engine?.tutorial,plan=state?.plan;if(!state?.course||!plan)return false;
 const x=engine.distance+engine.player.x;
 if(plan.lesson==='course-lift')return true;
 if(plan.lesson==='course-collector')return x<plan.collectorWakeX;
 return false;
}

const onScreen=(engine,x,margin=30)=>{const sx=x-engine.distance;return sx>engine.player.x+30&&sx<engine.width-margin;};
/** A lesson may point at a world object only when the player can actually see it: on screen with margin and inside the lit radius. */
export const litForPlayer=(engine,p,margin=30)=>{
 if(!p||!onScreen(engine,p.x,margin)||!(p.y>=0&&p.y<=engine.height))return false;
 const radius=Number(engine.getLightState?.()?.radius);
 return !Number.isFinite(radius)||Math.hypot(p.x-engine.distance-engine.player.x,p.y-engine.player.y)<=radius;
};
/** A card in the Chain fired this instant (flight.mjs records it): the strip shape is white right now. */
const firedNow=(state,t,window=.35)=>Number.isFinite(state.fireAt)&&t-state.fireAt<=window;
/** Per-step staging and trigger bookkeeping (no text, no pause). */
export function updatePracticeCourse(engine,dt){
 const state=engine?.tutorial,plan=state?.plan;if(!state?.course||!plan||!(dt>0))return;
 const t=engine.time,worldX=engine.distance+engine.player.x,ready=state.ready||={};
 const mark=id=>{if(ready[id]===undefined)ready[id]=t;};
 const wisp=engine.wisp,cargo=wisp?.cargo||wisp?.target;
 // A staged miss travels beside the wisp, out of body reach and inside Collector's.
 for(const p of engine.layout.embers){
  if(!p.stagedMiss||p.collected||p.carried||p.attracted||p.stagedDone)continue;
  const dx=p.x-worldX;
  if(dx>130||dx<-62)continue;
  if(practiceCollectorResting(engine))continue;
  const r=engine.player.radius;let placed=false;
  for(const side of p.stagedSide?[p.stagedSide]:[engine.player.y>engine.height*.5?-1:1,engine.player.y>engine.height*.5?1:-1]){
   const y=engine.player.y+side*44;
   if(y>r+30&&y<engine.height-r-30&&clearanceAt(engine,p.x,y,r)>4){p.y=y;p.stagedSide=side;placed=true;break;}
  }
  if(!placed)p.stagedSide=null;
 }
 for(const p of engine.layout.embers)if(p.stagedMiss&&(p.attracted||p.carried))p.stagedDone=true;
 if(t<PRACTICE_STOP_SPACING)return;
 if(plan.lesson==='course-lift'&&plan.lessonSparks?.some(p=>!p.collected&&litForPlayer(engine,p)))mark('practice:sparks');
 if(plan.lesson==='course-collector'&&['outbound','returning','reeling'].includes(wisp?.phase)&&cargo)mark('practice:collector-fetch');
 if(plan.lesson==='course-light'&&plan.flashes?.[0]&&!plan.flashes[0].collected&&litForPlayer(engine,plan.flashes[0]))mark('practice:flash');
 if(plan.lesson==='course-dark'&&plan.holes?.[0]&&onScreen(engine,plan.holes[0].x,40))mark('practice:black-hole');
 // Lessons about the Chain strip stop the flight the instant a card fires, while its shape is white.
 // They are not latched: a moment that passes without a safe stop waits for the next firing.
 const live=id=>{if(firedNow(state,t))ready[id]??=t;else if(ready[id]!==undefined&&!engine.paused)delete ready[id];};
 if(plan.lesson==='course-strip')live('practice:strip');
 if(plan.lesson==='course-pulse'&&Number.isFinite(state.pulsePaidAt)&&t-state.pulsePaidAt<=.35)ready['practice:pulse-paid']??=t;
 else if(plan.lesson==='course-pulse'&&!engine.paused)delete ready['practice:pulse-paid'];
 if(plan.lesson==='course-finale')live('practice:inscription');
}

// Black holes are drawn hazards (own glow), not darkness-hidden pickups, so they keep the on-screen test.
const POINTS_AT_WORLD=new Set(['practice:sparks','practice:flash']);
/** The in-flight lesson that may stop the flight now, or null. Spacing is enforced here. */
export function practiceCourseLesson(engine,run={}){
 const state=engine?.tutorial;if(!state?.course||engine.tutorialAwaitingLift||run?.guideSkipped)return null;
 const t=engine.time;
 if(t<PRACTICE_STOP_SPACING||t-(engine.practiceCoachAt??-Infinity)<PRACTICE_STOP_SPACING)return null;
 const stop=stopFor(state.lesson);if(!stop)return null;
 for(const id of stop.flight||[]){
  if(run?.guideSeen?.[id]||state.ready?.[id]===undefined)continue;
  const point=lessonPoint(engine,id);
  // A lesson that points at a world object waits until that object is lit and on screen.
  if(!point&&POINTS_AT_WORLD.has(id))continue;
  return practiceLessonStep(id,{engine,point});
 }
 return null;
}
/** A lesson whose moment came but never found a safe stop waits for the next checkpoint (not the strip lessons). */
export function pendingCourseLesson(engine,run={}){
 const state=engine?.tutorial,stop=stopFor(state?.lesson);if(!state?.course||!stop)return null;
 const id=(stop.flight||[]).find(id=>PRACTICE_LESSONS[id]?.carry!==false&&!run?.guideSeen?.[id]&&state.ready?.[id]!==undefined);
 return id?practiceLessonStep(id,{engine}):null;
}
function lessonPoint(engine,id){
 const plan=engine.tutorial.plan||{},sx=x=>x-engine.distance;
 const first=list=>list?.find(p=>!p.collected&&litForPlayer(engine,p,12));
 if(id==='practice:sparks'){const p=first(plan.lessonSparks);return p?{x:sx(p.x),y:p.y,radius:22}:null;}
 if(id==='practice:flash'){const p=first(plan.flashes);return p?{x:sx(p.x),y:p.y,radius:24}:null;}
 if(id==='practice:black-hole'){const h=plan.holes?.find(h=>sx(h.x)>0&&sx(h.x)<engine.width);return h?{x:sx(h.x),y:h.y,radius:34}:null;}
 if(id==='practice:collector-fetch'){const w=engine.getWispState?.();return w?{x:w.x,y:w.y,radius:20}:null;}
 return null;
}
/** The entry lesson on the frozen first frame, once per practice run. */
export function practiceCourseEntryLesson(engine,run={}){
 const state=engine?.tutorial;if(!state?.course||!engine.tutorialAwaitingLift||run?.guideSkipped)return null;
 const id=stopFor(state.lesson)?.entry;if(!id||run?.guideSeen?.[id])return null;
 let point=null;
 if(id==='practice:meet-collector'){const w=engine.getWispState?.()||engine.wisp;if(w)point={x:w.x,y:w.y,radius:20};}
 if(id==='practice:luminance'){const r=engine.getLightState?.()?.radius||70;point={x:engine.player.x,y:engine.player.y,radius:Math.min(80,r*.45)};}
 return practiceLessonStep(id,{engine,point,entry:true});
}
