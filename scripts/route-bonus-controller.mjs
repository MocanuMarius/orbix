import {WispFlight} from '../dist/flight.mjs';
import {getRunModifiers} from '../dist/model.mjs';
import {onboardingFlightPlan} from '../dist/onboarding.mjs';
import {observeFlight} from './human-flight-perception.mjs';
import {humanProfile,planHumanLift,queueHumanLift} from './human-flight-planner.mjs';

// A first encounter, with no visible-information advantage over the player.
// Golden objective corners are painted over fog; their observed position can
// be used only after the same approach cutoff as drawObjectiveMarks.
function visibleMarks(engine) {
 const objective=engine.routeObjective;
 if(!objective?.eligible||objective.failed||objective.complete)return [];
 const sequence=objective.id==='constellation';
 const lead=engine.baseSpeed*(engine.hasCompanion('swift')?1.48:1)*(sequence?2.8:1.9);
 const marks=[];
 for(const t of objective.targets){
  if(sequence&&t.stage!==objective.progress)continue;
  if(objective.seen.has(t)||t.object?.collected||t.object?.carried)continue;
  const points=t.type==='edge'?t.ribbon:[t];
  for(const p of points){
   const x=p.x-engine.distance,y=t.type==='prop'?t.object.y:p.y;
   if(x<engine.player.x-4||x>engine.width||x-engine.player.x>lead)continue;
   marks.push({id:t,x:Math.round(x/4)*4,y:Math.round(y/4)*4});
   break;
  }
 }
 return marks.sort((a,b)=>a.x-b.x);
}

export function playRouteWitness({run,node,profile,width,height},style,random) {
 const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width,height,left:0})};
 const e=new WispFlight({canvas,preflight:true,seed:run.seed+'-'+node.id,node,terrain:node.terrain,
  elite:node.elite,duration:node.duration,companions:run.companions,skills:run.skills,flame:run.flame,
  modifiers:{...getRunModifiers({...run,current:node}),onboardingPlan:onboardingFlightPlan(profile,run)}});
 e.render=()=>{};e.notify=()=>{};e.running=true;e.artifactEffects.onStart();
 const human=humanProfile(style),noticed=new Map();
 const memory={human,random,pending:null,lastLift:-2,inputSamples:0};
 let next=0,aimed=0,holdUntil=0,burstAt=null,lastTouch=-1;
 const bound=Math.ceil(node.duration*60*2)+300;
 for(let frame=0;frame<bound&&!e.finished;frame++){
  if(!e.dying&&!e.completing&&e.time>=next){
   next=e.time+human.cadence*(.9+random()*.2);
   const view=observeFlight(e);
   const marks=visibleMarks(e).filter(mark=>{
    if(!noticed.has(mark.id))noticed.set(mark.id,random()>=human.drop);
    return noticed.get(mark.id);
   });
   const aim=marks[0]||view.sparks.find(spark=>!spark.dim&&view.energy<view.maxEnergy*.85);
   if(marks[0])aimed++;
   queueHumanLift(memory,e.time,planHumanLift(view,aim,memory));
   const straight=aim&&Math.abs(aim.y-view.player.y)<32&&aim.x-view.player.x>view.speed*.75;
   if(e.hasCompanion('swift')&&straight&&memory.pending===null&&burstAt===null&&e.getAbilityState().ready&&random()>=human.drop)burstAt=e.time+human.reaction;
  }
  if(e.liftHeld&&holdUntil<=e.time)e.endLiftInput(false);
  if(memory.pending!==null&&e.time>=memory.pending&&e.time-lastTouch>=.12){
   if(e.liftHeld)e.endLiftInput(false);
   const hold=e.hasCompanion('leveler')&&e.levelCharge>.7&&random()>.4;
   if(hold?e.beginLiftInput():e.flap())memory.lastLift=e.time;
   if(hold)holdUntil=e.time+.3+random()*.7;
   memory.pending=null;
   lastTouch=e.time;
  }else if(burstAt!==null&&burstAt<=e.time&&e.time-lastTouch>=.12){
   if(memory.pending===null||memory.pending-e.time>.12){e.activateAbility();lastTouch=e.time;}
   burstAt=null;
  }
  e.step(1/60);
 }
 const result=e.routeObjective?.state;
 return {id:node.bonusId,role:run.companionRole,style,level:node.levelId,clear:e.finished&&e.alive,
  paid:e.finished&&e.alive&&!!result?.complete,progress:result?.progress||0,target:result?.target||0,
  timeout:!e.finished,death:e.deathCause||null,lookedAtMark:aimed>0};
}
