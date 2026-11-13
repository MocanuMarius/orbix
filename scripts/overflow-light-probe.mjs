import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {lightAttenuation,lightVisibility} from '../dist/light-field.mjs';
import {getTutorialWorldFocus} from '../dist/tutorial.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const engines=[];let id=0;
function make(modifiers={},options={}){
 const bounds={width:900,height:340,left:0},gauge={width:38,right:options.gaugeRight||0};
 const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>bounds,
  ownerDocument:{querySelector:()=>gauge.right?{getBoundingClientRect:()=>gauge}:null}};
 const e=new WispFlight({canvas,seed:'overflow-light',duration:102,flame:100,companions:['collector'],...options,modifiers});
 e.running=true;e.render=()=>{};engines.push(e);return {e,bounds,gauge};
}
const pick=(e,kind='light',extra={})=>e.collect({id:++id,kind,x:e.distance+e.player.x,y:e.player.y,...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

const locked=make({overflowRecharge:.08},{afterglow:20}).e;assert.equal(locked.afterglow,0);
locked.wisp.cooldown=5;pick(locked);assert.equal(locked.afterglow,0);assert.equal(locked.blockedOverflow.amount,24);assert.equal(locked.blockedOverflow.reason,'locked');near(locked.wisp.cooldown,3.08);
const unlocked=make({afterglowUnlocked:true,afterglowCap:30,afterglowEfficiency:1.2,overflowRecharge:.08,rechargeSight:1.5,litLift:1}).e;
unlocked.wisp.cooldown=5;pick(unlocked);near(unlocked.afterglow,28.8);near(unlocked.wisp.cooldown,5);near(unlocked.reserveFlow.rawAmount,24);assert.equal(unlocked.artifactEffects.freeLift,false);
pick(unlocked);near(unlocked.afterglow,30);near(unlocked.reserveFlow.amount,1.2);near(unlocked.blockedOverflow.amount,23);near(unlocked.wisp.cooldown,3.16);assert.equal(unlocked.artifactEffects.freeLift,true);
near(unlocked.afterglowPickupRaw,48);near(unlocked.afterglowPickupStored,30);near(unlocked.afterglowPickupWasted,23);
const stored=unlocked.afterglow;unlocked.flap();near(unlocked.afterglow,stored);unlocked.flap();near(unlocked.afterglow,stored-unlocked.flapCost);
const fetched=make({afterglowUnlocked:true,afterglowCap:40}).e;pick(fetched,'light',{deliveredByWisp:true});near(fetched.afterglow,24);assert.equal(fetched.reserveFlow.count,1);
for(const [kind,extra] of [['light',{generated:true}],['dark',{}],['dusk',{}],['charge',{}],['embers',{}],['sight',{}]]){
 const e=make({afterglowUnlocked:true,afterglowCap:40,mainKindler:true,kindlerPurify:true,purifyFuel:12}).e;pick(e,kind,extra);
 assert.equal(e.afterglow,0,kind+' cannot manufacture reserve');assert.equal(e.reserveFlow.count,0);assert.equal(e.blockedOverflow.count,0);
}

const a=make(),b=make({}, {gaugeRight:112});assert.equal(a.e.player.x,155);assert.ok(b.e.player.x>155);
near(a.e.player.x+a.e.distance,98);near(b.e.player.x+b.e.distance,98);
near(a.e.totalDistance-a.e.distance,b.e.totalDistance-b.e.distance);assert.deepEqual(a.e.layout.embers,b.e.layout.embers);
assert.ok(b.e.player.x*b.bounds.width/b.e.width-b.e.player.radius*b.bounds.width/b.e.width>b.gauge.right+16);
for(const item of [a,b]){item.e.layout.obstacles=[];item.e.layout.embers=[];item.e.drafts.zones=[];}
for(let frame=0;frame<80;frame++){if(frame%40===0){a.e.flap();b.e.flap();}a.e.step(1/60);b.e.step(1/60);}
near(a.e.player.y,b.e.player.y);near(a.e.distance+a.e.player.x,b.e.distance+b.e.player.x);near(a.e.getState().progress,b.e.getState().progress);
const world=b.e.distance+b.e.player.x,remaining=b.e.totalDistance-b.e.distance;b.gauge.right+=24;b.e.resize();
near(b.e.distance+b.e.player.x,world);near(b.e.totalDistance-b.e.distance,remaining);

const e=a.e;e.player.y=215;const light=e.getLightState();assert.equal(light.radius,light.forwardRadius);assert.equal(light.horizon,undefined);
for(const r of [40,90,140,175,300]){const right=lightVisibility(e,light,e.player.x+r,e.player.y),up=lightVisibility(e,light,e.player.x,e.player.y-r);near(right,up);}
assert.equal(lightVisibility(e,light,e.player.x+176,e.player.y),0);assert.ok(lightAttenuation(.2)>lightAttenuation(.5));
e.mod.lightRadius=245;assert.ok(lightVisibility(e,e.getLightState(),e.player.x+176,e.player.y)>0,'A Light upgrade buys real range');
e.mod.lightRadius=175;e.mod.mainSeer=true;e.triggerMainSight();e.time+=.25;assert.ok(lightVisibility(e,e.getLightState(),e.player.x+240,e.player.y)>.5,'Timed forward light remains useful');
e.time+=3;e.layout.embers=[{kind:'cache',x:e.distance+e.player.x+172,y:e.player.y}];assert.equal(e.getNearbyPickup(),null);
e.tutorial={};e.tutorialAwaitingLift=false;assert.equal(getTutorialWorldFocus(e),null,'Tutorial never focuses a hidden pickup');
e.sightUntil=e.time+6;assert.ok(e.getNearbyPickup(),'Sight Bloom exposes the nearby cache');
for(const item of engines)item.destroy();
console.log('Overflow/light: natural-only capped reserve, conversion conservation, artifact leftovers, exact spending, circular visibility, earned scouting and notch-safe camera invariance passed.');
