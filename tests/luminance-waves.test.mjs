import test from 'node:test';
import assert from 'node:assert/strict';
import {LuminanceWaves} from '../dist/luminance-waves.mjs';
import {GLOW_DISPLAY_SCALE} from '../dist/vitality.mjs';

function fixture(rank=1){
  const ordinary={x:100,y:50,kind:'light'},dark={x:100,y:50,kind:'dark'};
  const e={running:true,alive:true,mod:{resonantHarvest:rank},flame:0,maxFlame:100,resonanceStored:0,distance:0,player:{x:0,y:50},layout:{embers:[ordinary,dark]}};
  const waves=new LuminanceWaves(e);waves.addSource({id:'test',x:0,y:50,radius:300,duration:4});
  return {e,waves,ordinary,dark};
}

test('each new front can harvest the same ordinary Spark once without collecting it',()=>{
  const {e,waves,ordinary,dark}=fixture();
  waves.update(.1);assert.equal(e.flame,0);
  waves.update(.2);assert.equal(e.flame,1/GLOW_DISPLAY_SCALE);
  waves.update(.1);assert.equal(e.flame,1/GLOW_DISPLAY_SCALE);
  for(let i=0;i<10;i++)waves.update(.1);
  assert.ok(Math.abs(e.flame-2/GLOW_DISPLAY_SCALE)<1e-9);
  assert.ok(!ordinary.collected);assert.ok(!dark.collected);assert.equal(e.resonanceStored,0);
});

test('rank two purifies danger without fuel and rank three also awards Stored Sparks',()=>{
  const {e,waves,ordinary,dark}=fixture(2);
  ordinary.collected=true;waves.update(.4);
  assert.equal(e.flame,0);assert.equal(dark.collected,true);assert.equal(dark.purified,true);
  const other=fixture(3);other.e.flame=100;other.waves.update(.4);
  assert.equal(other.e.flame,100);assert.equal(other.e.resonanceStored,1);
  assert.ok(!other.ordinary.collected);
});

test('pause freezes waves, dream grants nothing, terminal flight clears all waves',()=>{
  const {e,waves,dark}=fixture(3);
  e.paused=true;waves.update(5);assert.equal(waves.state.clock,0);assert.equal(waves.state.waves,0);
  e.paused=false;e.dream={phase:'recording'};waves.update(.4);
  assert.equal(e.flame,0);assert.equal(e.resonanceStored,0);assert.ok(!dark.collected);
  e.dream.phase='done';waves.update(.5);assert.equal(e.flame,0);
  e.finished=true;waves.update(.5);assert.equal(waves.state.waves,0);assert.equal(waves.state.sources,0);
});

test('swept fronts catch contacts across large steps and ignore special or generated packets',()=>{
  const {e,waves}=fixture(3);
  e.layout.embers=[{x:130,y:50,kind:'light',generated:true},{x:130,y:50,kind:'sight'},{x:130,y:50,kind:'dusk'},
    {x:130,y:50,kind:'light',carried:true},{x:130,y:50,kind:'cache'}];
  waves.update(.7);
  assert.equal(e.flame,1/GLOW_DISPLAY_SCALE);assert.equal(e.resonanceStored,1);
});

test('following sources anchor emitted fronts and retain one-second cadence on upsert',()=>{
  const {e,waves}=fixture();waves.clear();
  waves.addSource({id:'follow',follow:'wisp',radius:1000,duration:4});waves.update(.1);
  assert.equal(waves.waves[0].x,0);
  e.distance=80;waves.addSource({id:'follow',radius:900});waves.update(.5);
  assert.equal(waves.waves.length,1);assert.equal(waves.waves[0].x,0);
  waves.update(.5);assert.equal(waves.waves.length,2);assert.equal(waves.waves[1].x,80);
});

test('waves do not harvest future offscreen pickups',()=>{
  const {e,waves}=fixture(3);e.width=100;e.height=100;
  e.layout.embers=[{x:180,y:50,kind:'light'},{x:80,y:180,kind:'light'}];
  waves.update(.7);assert.equal(e.flame,0);assert.equal(e.resonanceStored,0);
});

test('legacy waves without Harvest track physical crossings without harvest feedback or rewards',()=>{
  const {e,waves,ordinary,dark}=fixture(0),bursts=[],sounds=[];
  e.burst=(...args)=>bursts.push(args);e.sound=(...args)=>sounds.push(args);
  waves.update(.4);const wave=waves.waves[0];
  assert.equal(e.flame,0);assert.equal(e.resonanceStored,0);
  assert.equal(wave.naturalCrossings,1);assert.ok(wave.seen.has(ordinary));
  assert.equal(ordinary.collected,undefined);assert.equal(dark.collected,undefined);
  assert.deepEqual(bursts,[]);assert.deepEqual(sounds,[]);
});

test('book Harvest and dark purification keep feedback at a full meter',()=>{
  for(const [rank,kind,count] of [[1,'light',3],[2,'dark',5]]){
    const {e,waves}=fixture(rank),bursts=[],sounds=[];
    const packet={x:100,y:50,kind};e.layout.embers=[packet];e.flame=e.maxFlame;
    e.burst=(...args)=>bursts.push(args);e.sound=(...args)=>sounds.push(args);
    waves.update(.4);
    assert.equal(e.flame,e.maxFlame);assert.equal(bursts.length,1);assert.equal(bursts[0][2],count);
    assert.equal(sounds.length,1);assert.equal(sounds[0][0],'resonate');
    assert.equal(!!packet.purified,kind==='dark');assert.equal(!!packet.collected,kind==='dark');
  }
});
