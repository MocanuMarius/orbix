import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {LuminanceWaves} from '../dist/luminance-waves.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {GLOW_DISPLAY_SCALE} from '../dist/vitality.mjs';

function flight(modifiers={},options={}){
 const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
  preflight:true,seed:'light-wave-cadence',companions:['seer'],modifiers,...options});
 e.running=true;e.render=()=>{};e.layout.obstacles=[];e.layout.embers=[];Object.defineProperty(e,'baseSpeed',{get:()=>0});
 const emitted=[],emit=e.luminanceWaves.emit.bind(e.luminanceWaves);
 e.luminanceWaves.emit=settings=>{const wave=emit(settings);emitted.push(wave);return wave;};
 const step=dt=>{e.player.y=e.height*.5;e.player.vy=0;e.step(dt);};
 return {e,emitted,step};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const pickup=(e,settings={})=>{const p={kind:'light',x:e.distance+e.player.x,y:e.player.y,...settings};e.collect(p);return p;};

test('a real Flare pickup emits exactly once every two seconds at 30, 60 and 120 steps per second',()=>{
 for(const fps of [30,60,120])for(const longFlash of [false,true]){
  const {e,emitted,step}=flight({longFlash,resonantHarvest:3,cardHarvestStoredPerWave:1});
  pickup(e,{kind:'sight'});const end=e.flashTether.expires;
  const packet={kind:'light',x:e.player.x+100,y:e.player.y};e.layout.embers=[packet];e.flame=20;
  for(let i=0;i<Math.round((end+1)*fps);i++)step(1/fps);
  assert.equal(emitted.length,end/2,`${fps}fps / ${end}s`);
  emitted.forEach((wave,index)=>{near(wave.emittedAt,index*2);assert.equal(wave.reveal,true);});
  assert.equal(e.luminanceWaves.sources.size,0);assert.ok(!packet.collected);
  near(e.flame,20+emitted.length/GLOW_DISPLAY_SCALE);assert.equal(e.resonanceStored,emitted.length*2);
  e.destroy();
 }
});

test('Long Flare added mid-effect preserves the next beat, and rereading upgrade state never duplicates fronts',()=>{
 const {e,emitted,step}=flight();pickup(e,{kind:'sight'});
 for(let i=0;i<180;i++)step(1/60);
 e.applySkillUpgrade({longFlash:true},40);e.applySkillUpgrade({lightRadius:155},40);
 for(let i=0;i<22*60;i++)step(1/60);
 assert.equal(emitted.length,12);emitted.forEach((wave,index)=>near(wave.emittedAt,index*2));e.destroy();
});

test('one Proximity activation creates one reveal front through its entire active duration',()=>{
 const {e,emitted,step}=flight({proximityEnabled:true,edgingDuration:7});
 // Charge through the actual collider-clearance path, then leave the bank.
 e.mod.proximityUnlocked=true;e.mod.edgingEnabled=true;
 const rock={x:e.player.x-100,width:600,center:e.player.y+55,gap:0,motion:0,phase:0,bottom:true,bottomShape:[[-100,0],[1000,0],[1000,1000],[-100,1000]]};
 for(let i=0;i<150&&!e.edgingPulse.triggerCount;i++)e.edgingPulse.update(1/60,[rock]);
 assert.equal(e.edgingPulse.triggerCount,1);assert.equal(emitted.length,1);assert.equal(emitted[0].reveal,true);
 for(let i=0;i<9*60;i++)step(1/60);
 assert.equal(emitted.length,1);assert.equal(e.luminanceWaves.sources.size,0);e.destroy();
});

test('Flare has steady ambient fill between fronts while its icon retains the two-second local beat',()=>{
 const {e}=flight();pickup(e,{kind:'sight'});
 const samples=[2.2,2.8,3.2,3.8].map(time=>{e.time=time;return e.getLightState().tetherReveal;});
 assert.ok(samples.every(value=>value===samples[0]&&value>0));e.time=e.flashTether.expires;assert.equal(e.getLightState().tetherReveal,0);e.destroy();
});

test('the unrelated default temporary-source cadence stays at one second',()=>{
 const e={running:true,alive:true,player:{x:0,y:0},mod:{},time:0},m=new LuminanceWaves(e),emitted=[];
 const emit=m.emit.bind(m);m.emit=settings=>{const wave=emit(settings);emitted.push(wave);return wave;};
 m.addSource({id:'mushroom',duration:3,radius:800});
 for(let i=0;i<180;i++){e.time+=1/60;m.update(1/60);}
 assert.equal(emitted.length,3);emitted.forEach((wave,index)=>near(wave.emittedAt,index));
});

test('the card pilot emits only on distinct natural overfill pickups 3 and 6, with unchanged currency',()=>{
 const a=flight({}, {cardPilot:true}),b=flight();
 assert.equal(a.e.getState().overfillWave.charge,0);assert.equal(a.emitted.length,0);assert.equal(b.e.getState().overfillWave,null);
 const currency=e=>[e.condensedGlow,e.condensedRemainder,e.storageBonus,e.cardPackingBonus,e.pickupOverflow];
 for(let i=1;i<=6;i++){
  a.e.flame=a.e.maxFlame;b.e.flame=b.e.maxFlame;
  const p=pickup(a.e,{deliveredByWisp:i%2===0});pickup(b.e,{deliveredByWisp:i%2===0});a.e.collect(p);
  assert.equal(a.e.overfillWave.charge,i%3);assert.equal(a.emitted.length,Math.floor(i/3));assert.equal(b.emitted.length,0);
  assert.deepEqual(currency(a.e),currency(b.e));
 }
 assert.ok(a.emitted.every(wave=>wave.reveal));a.e.destroy();b.e.destroy();
 const fresh=flight({}, {cardPilot:true});assert.deepEqual(fresh.e.overfillWave,{charge:0,waves:0,every:3});fresh.e.destroy();
});

test('overfill excludes exact fill, generated, harmful, tutorial and Dream, but counts partial surplus without packed currency',()=>{
 const {e,emitted}=flight({packingLimit:0},{cardPilot:true});
 e.flame=e.maxFlame-getPickupSpec('light').fuel;pickup(e);assert.equal(e.overfillWave.charge,0);
 for(const settings of [{generated:true},{harmful:true},{fetchedInDream:true}]){e.flame=e.maxFlame;pickup(e,settings);}
 assert.equal(e.overfillWave.charge,0);
 e.tutorial={};e.flame=e.maxFlame;pickup(e);e.tutorial=null;
 e.dream={phase:'recording'};e.flame=e.maxFlame;pickup(e);e.dream=null;
 assert.equal(e.overfillWave.charge,0);
 for(let i=0;i<3;i++){e.flame=e.maxFlame-getPickupSpec('light').fuel+.1;pickup(e);}
 assert.equal(e.condensedGlow,0);assert.equal(emitted.length,1);e.destroy();
});

test('overfill fronts can apply Harvest once per crossing without ever charging another overfill wave',()=>{
 const {e,emitted}=flight({cardHarvestMeter:2,cardHarvestStoredPerWave:1},{cardPilot:true});
 for(let i=0;i<3;i++){e.flame=e.maxFlame;pickup(e);}
 const p={kind:'light',x:e.player.x+100,y:e.player.y};e.layout.embers=[p];e.flame=10;
 e.luminanceWaves.update(.5);e.luminanceWaves.update(.1);
 assert.equal(emitted.length,1);assert.equal(e.overfillWave.charge,0);assert.equal(e.overfillWave.waves,1);
 assert.equal(e.flame,12);assert.equal(e.resonanceStored,1);assert.ok(!p.collected);e.destroy();
});
