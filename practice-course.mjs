// First Light, Edition 4: seven stops through real catalog courses.
// Each flight course is the game's own level (terrain polygons, scenery and
// exit). These hooks only calm it and place the one taught element where the
// lesson needs it. Lessons are returned as paused coach steps; this module
// never pauses, draws text or grants anything outside practice.
import {obstacleEdgeClearance} from './edging-pulse.mjs?v=deck-2';
import {formatGlow} from './vitality.mjs?v=deck-2';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
/** Free flight before the first in-flight stop, and between stops (simulated seconds). */
export const PRACTICE_STOP_SPACING=12;
export const PRACTICE_CHAIN_CARDS=Object.freeze(['crescendo','body-spark','courier-tip']);

/** The stop table as built (docs/tutorial-redesign-proposal.md, "Edition 4 — built design"). */
export const PRACTICE_STOPS=Object.freeze([
 {id:'practice-first-light',type:'flight',lesson:'course-lift',levelId:'moonruins-courtyard',terrain:'ruins',name:'First Light',duration:32,
  entry:'practice:lift',flight:['practice:sparks']},
 {id:'practice-collector',type:'flight',lesson:'course-collector',levelId:'marsh-reed-channel',terrain:'canopy',name:'Meet Collector',duration:34,
  entry:'practice:meet-collector',flight:['practice:collector-fetch']},
 {id:'practice-light',type:'flight',lesson:'course-light',levelId:'cemetery-grave-road',terrain:'ruins',name:'Luminance',duration:32,
  entry:'practice:luminance',flight:['practice:flash']},
 {id:'practice-edge',type:'flight',lesson:'course-edge',levelId:'desert-dune-trough',terrain:'ruins',name:'Skim the Dunes',duration:32,
  practiceProximity:true,entry:null,flight:['practice:proximity']},
 {id:'practice-camp',type:'support',kind:'camp',terrain:'canopy',name:'Arrange your Chain',practiceChain:true,practiceProximity:true,
  camp:['practice:chain','practice:boost']},
 {id:'practice-chain',type:'flight',lesson:'course-chain',levelId:'cloud-sky-islands',terrain:'storm',name:'Chain & Black Holes',duration:34,
  practiceProximity:true,entry:null,flight:['practice:black-hole']},
 {id:'practice-finale',type:'finale',lesson:'course-finale',levelId:'pinewood-high-boughs',terrain:'canopy',name:'Last Light',duration:34,
  practiceProximity:true,practiceShield:true,entry:'practice:hearts',flight:['practice:shield']},
].map(stop=>Object.freeze(stop)));
export const PRACTICE_COURSE_LESSONS=Object.freeze(PRACTICE_STOPS.filter(s=>s.lesson).map(s=>s.lesson));
export const isCourseLesson=id=>PRACTICE_COURSE_LESSONS.includes(id);
const stopFor=lesson=>PRACTICE_STOPS.find(stop=>stop.lesson===lesson)||null;

// One idea per lesson, two short sentences at most, in the approved vocabulary.
// `terms` are glossary keys (card-terms.mjs) offered as links on the card.
export const PRACTICE_LESSONS=Object.freeze({
 'practice:lift':{topic:'lift',title:'Lift and glide',text:'Tap to Lift your wisp. Let go to glide down.',target:'#flap-btn',terms:['lift']},
 'practice:sparks':{topic:null,title:'Sparks',text:'Touch Sparks to fill your Spark Meter. Each Lift costs {cost}.',target:'.glow-side-gauge',terms:['spark','meter']},
 'practice:meet-collector':{topic:'collector',title:'Meet Collector',text:'The green light circling you is Collector, your companion. It flies wherever you fly.',terms:['collector']},
 'practice:collector-fetch':{topic:'collector-recovery',title:'Collector fetches',text:'Collector catches Sparks you miss and reels them back. They count when they reach you.',terms:['collector']},
 'practice:luminance':{topic:'luminance',title:'Luminance',text:'The glow around your wisp is Luminance. It shows how far you can see.',terms:['luminance']},
 'practice:flash':{topic:'special-sparks',title:'Flare',text:'This white triangle is a Flare. Catch it to light the way for a few seconds.',terms:['flash']},
 'practice:proximity':{topic:'edging',title:'Proximity',text:'Skim close to rock without touching it to fill this meter. Full, it sends a Pulse that lights the way.',target:'.edging-pulse-gauge',terms:['proximity','wave']},
 'practice:chain':{topic:null,title:'Your Chain',text:'These loaned cards are your Chain. When a card’s Trigger happens, the cards fire from left to right.',target:'.practice-stop-cards',terms:['trigger','collect','delivery']},
 'practice:boost':{topic:null,title:'Crescendo',text:'Crescendo doubles the cards to its left, so in Slot 1 it does nothing. Drag it to Slot 3, then press Play.',target:'.dk2-station[data-slot="0"]',terms:['boost','slot']},
 'practice:black-hole':{topic:'black-hole',title:'Black Hole',text:'This Black Hole drains Sparks while you are near it. Fly wide around it.',terms:[]},
 'practice:hearts':{topic:'hearts',title:'Hearts',text:'Hearts are your tries in a real run: a crash costs one. In practice a crash only restarts the passage.',target:'.flight-run-status .ascension-lives',terms:['heart']},
 'practice:shield':{topic:null,title:'Collector’s shield',text:'Collector shielded you from that crash. It can save you once, then needs time to recover.',terms:['collector','save']},
});
/** Onboarding topics the real game should not repeat once practice taught them. */
export function practiceLessonTopics(guideSeen={}){
 return [...new Set(Object.entries(PRACTICE_LESSONS).filter(([id,l])=>l.topic&&guideSeen?.[id]).map(([,l])=>l.topic))];
}
const words=text=>String(text).trim().split(/\s+/).length;
export const lessonWords=id=>words(PRACTICE_LESSONS[id]?.text||'');

/** A paused coach step. Entry lessons are closed with "Got it"; in-flight ones with "Continue". */
export function practiceLessonStep(id,{engine=null,point=null,entry=false,actionLabel=null}={}){
 const lesson=PRACTICE_LESSONS[id];if(!lesson)return null;
 const cost=Number.isFinite(engine?.flapCost)?formatGlow(engine.flapCost):'3';
 const text=lesson.text.replace('{cost}',`${cost} ${cost==='1'?'Spark':'Sparks'}`);
 return {id,title:lesson.title,text,target:lesson.target||null,...(point?{point}:{}),terms:[...(lesson.terms||[])],
  contextual:true,allowTarget:false,focusAction:true,actionLabel:actionLabel||(entry?'Got it':'Continue'),skipLabel:false,
  ...(entry?{entry:true,teachesLift:id==='practice:lift'}:{}),practiceEdition:4};
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
/** Sparks that hug a real floor (or roof) of the course for a Proximity skim. */
function skimLane(engine,around,seconds){
 const r=engine.player.radius,speed=speedOf(engine),h=engine.height;
 const surfaceY=(x,side)=>{
  // side +1: floor below; -1: roof above. Find the y whose body clearance is ~20 px.
  for(let k=0;k<=h;k+=3){const y=side>0?h-r-30-k:r+30+k;if(y<r+30||y>h-r-30)break;const c=clearanceAt(engine,x,y,r);
   if(c>20&&c<34)return y;if(c>=34&&k>0)return null;}
  return null;
 };
 for(const shift of [0,.6,-.6,1.2,-1.2,1.8,2.4,-1.8,3,3.6]){
  // Floors only: a roof lane asks the player to Lift toward rock.
  for(const side of [1]){
   const start=worldXAt(engine,around+shift),points=[];
   // Short breaks are allowed: Proximity keeps its charge through gaps of up to 1.25 s.
   let gap=0;
   for(let x=start;x<=start+speed*seconds;x+=speed*.32){const y=surfaceY(x,side);if(y===null){if((gap+=.32)>.7)break;continue;}gap=0;points.push([x,y]);}
   if(points.length>=Math.ceil(seconds/.32*.8)&&points.at(-1)[0]-points[0][0]>=speed*seconds*.85){
    return points.map(([x,y],i)=>spark(engine,x,y,'course-skim',{skimLane:true,skimIndex:i}));
   }
  }
 }
 return [];
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
/** A biome actor in the shape biome-dynamics.mjs draws: a pine cone hanging from the real canopy. */
function stagedCone(engine,t){
 const x=worldXAt(engine,t),h=engine.height,band=freeBand(engine,x)||{top:40,bottom:h-40};
 const host=nearObstacles(engine,x,0).find(o=>o.topShape)||engine.layout.obstacles[0]||{phase:0,motion:0,center:h/2};
 const anchorY=Math.max(28,band.top-6),y=anchorY+9;
 return {id:'practice-staged-cone',x,y,baseY:y,anchorY,floorY:band.bottom-14,topY:band.top,radius:11,host,hostCenter:host.center??h/2,
  kind:'pinecone',family:'fall',color:'#c99563',instruction:'',phase:'idle',age:0,vy:0,spent:false,hinted:true,seed:23,practiceStaged:true};
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
 }else if(lesson==='course-edge'){
  calm(engine,at(14),{before:.6,after:.5});
  sparkLine(engine,3.5,11.5,.9);
  plan.lanes=[skimLane(engine,15.2,4.4),skimLane(engine,21.4,4)].filter(l=>l.length);
  // Ordinary fuel between and after the lanes, never on top of them.
  const busy=plan.lanes.flat().map(p=>timeAtX(engine,p.x));
  for(const p of sparkLine(engine,12,27,.8,{feature:'course-spark'}))
   if(busy.some(t=>Math.abs(t-timeAtX(engine,p.x))<.7))engine.layout.embers.splice(engine.layout.embers.indexOf(p),1);
 }else if(lesson==='course-chain'){
  calm(engine,at(16),{before:.6,after:.5});
  sparkLine(engine,2.5,14,.75,{wave:1.2});
  for(const t of [6.4,10.8]){const x=at(t),b=freeBand(engine,x);if(b)spark(engine,x,b.mid,'course-miss',{stagedMiss:true});}
  plan.holes=[blackHole(engine,17.6,0),blackHole(engine,24,1)].filter(Boolean);
  engine.blackHoles.items=plan.holes;
  sparkLine(engine,26.2,27,.5);
 }else if(lesson==='course-finale'){
  calm(engine,at(15),{before:.62,after:.5});
  sparkLine(engine,2.5,8.4,.8);
  sparkLine(engine,9.6,11.6,.7);
  plan.collectorRestX=at(8.6);plan.cone=stagedCone(engine,13.4);engine.biomeDynamics.items=[plan.cone];
  sparkLine(engine,16.2,19,.6);
  plan.lanes=[skimLane(engine,20,2.2)];if(!plan.lanes[0].length)sparkLine(engine,19.6,22,.6);
  plan.flashes=[flash(engine,23.2)].filter(Boolean);
  plan.holes=[blackHole(engine,25.4,0)].filter(Boolean);engine.blackHoles.items=plan.holes;
  sparkLine(engine,27,28,.5);
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
 if(plan.lesson==='course-finale')return x>=plan.collectorRestX&&!state.shieldSaved;
 return false;
}

const onScreen=(engine,x,margin=30)=>{const sx=x-engine.distance;return sx>engine.player.x+30&&sx<engine.width-margin;};
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
 if(plan.lesson==='course-lift'&&t>=PRACTICE_STOP_SPACING&&plan.lessonSparks?.some(p=>!p.collected&&onScreen(engine,p.x)))mark('practice:sparks');
 if(plan.lesson==='course-collector'&&t>=PRACTICE_STOP_SPACING&&['outbound','returning','reeling'].includes(wisp?.phase)&&cargo)mark('practice:collector-fetch');
 if(plan.lesson==='course-light'&&t>=PRACTICE_STOP_SPACING&&plan.flashes?.[0]&&!plan.flashes[0].collected&&onScreen(engine,plan.flashes[0].x))mark('practice:flash');
 if(plan.lesson==='course-edge'&&t>=PRACTICE_STOP_SPACING&&plan.lanes?.[0]?.some(p=>!p.collected&&onScreen(engine,p.x,60)))mark('practice:proximity');
 if(plan.lesson==='course-chain'&&t>=PRACTICE_STOP_SPACING&&plan.holes?.[0]&&onScreen(engine,plan.holes[0].x,40))mark('practice:black-hole');
 if(plan.lesson==='course-finale'){
  const cone=plan.cone;
  if(cone&&!cone.spent){
   const dx=cone.x-worldX;
   if(cone.phase==='idle'&&dx<330&&dx>0){cone.phase='warning';cone.age=0;}
   // The staged cone drifts over the wisp as it falls, so the save is certain.
   if(cone.phase==='falling')cone.x=worldX+speedOf(engine)*dt+(cone.x-worldX)*Math.exp(-dt*9);
  }
  if(!state.shieldSaved&&wisp?.phase==='guard-recovery'){state.shieldSaved=true;state.shieldAt=t;}
  if(state.shieldSaved&&t>=PRACTICE_STOP_SPACING)mark('practice:shield');
 }
}

/** The in-flight lesson that may stop the flight now, or null. Spacing is enforced here. */
export function practiceCourseLesson(engine,run={}){
 const state=engine?.tutorial;if(!state?.course||engine.tutorialAwaitingLift||run?.guideSkipped)return null;
 const t=engine.time;
 if(t<PRACTICE_STOP_SPACING||t-(engine.practiceCoachAt??-Infinity)<PRACTICE_STOP_SPACING)return null;
 const stop=stopFor(state.lesson);if(!stop)return null;
 for(const id of stop.flight||[]){
  if(run?.guideSeen?.[id]||state.ready?.[id]===undefined)continue;
  return practiceLessonStep(id,{engine,point:lessonPoint(engine,id)});
 }
 return null;
}
/** A lesson whose moment came but never found a safe stop waits for the next checkpoint. */
export function pendingCourseLesson(engine,run={}){
 const state=engine?.tutorial,stop=stopFor(state?.lesson);if(!state?.course||!stop)return null;
 const id=(stop.flight||[]).find(id=>!run?.guideSeen?.[id]&&state.ready?.[id]!==undefined);
 return id?practiceLessonStep(id,{engine}):null;
}
function lessonPoint(engine,id){
 const plan=engine.tutorial.plan||{},sx=x=>x-engine.distance;
 const first=list=>list?.find(p=>!p.collected&&sx(p.x)>engine.player.x&&sx(p.x)<engine.width-12);
 if(id==='practice:sparks'){const p=first(plan.lessonSparks);return p?{x:sx(p.x),y:p.y,radius:22}:null;}
 if(id==='practice:flash'){const p=first(plan.flashes);return p?{x:sx(p.x),y:p.y,radius:24}:null;}
 if(id==='practice:black-hole'){const h=plan.holes?.find(h=>sx(h.x)>0&&sx(h.x)<engine.width);return h?{x:sx(h.x),y:h.y,radius:34}:null;}
 if(id==='practice:collector-fetch'||id==='practice:shield'){const w=engine.getWispState?.();return w?{x:w.x,y:w.y,radius:20}:null;}
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
/** The camp's lessons (Chain screen work happens between them). */
export function practiceCampLesson(view,run={}){
 if(view!=='support'||run?.current?.kind!=='camp'||!run.current.practiceChain||run.guideSkipped)return null;
 if(!run.guideSeen?.['practice:chain'])return practiceLessonStep('practice:chain',{actionLabel:'Open the Chain'});
 return null;
}
