import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {LuminanceWaves,luminanceWaveCrossing} from '../dist/luminance-waves.mjs';
import {CARD_SYSTEM,CARD_UNIT,getCardModifiers,makeSkillCard} from '../dist/skill-cards.mjs';
import {updatePrismWick} from '../dist/card-standalone.mjs';

function flight(ids=['harvest-common'],extra={},options={}){
  const modifiers={...getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:ids.map((id,i)=>makeSkillCard(id,`pulse:${i}`))}),...extra};
  const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    preflight:true,seed:'pulse-source-proof',companions:['collector'],modifiers,...options});
  e.running=true;e.render=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];
  return e;
}
function crossings(e){
  const packet={x:e.distance+e.player.x+90,y:e.player.y,kind:'light'};
  e.layout.embers=[packet];e.getNearbyPickups=()=>[packet];e.flame=0;
  e.luminanceWaves.update(.3);
  assert.equal(e.flame,CARD_UNIT);assert.equal(packet.collected,undefined);
  assert.equal(e.cardRowTrace.event.kind,'wave-crossing');
  e.luminanceWaves.update(.05);assert.equal(e.flame,CARD_UNIT,'one crossing per target and front');
  return e.cardRowTrace.event;
}

test('Flash, active sight, map contacts and explicit relic flashes all dispatch the same crossing row',()=>{
  for(const kind of ['flash','seer','bubble','resonate','flash-stone','dawn-loom']){
    const e=flight(['harvest-common'],{mainSeer:kind==='seer',rechargeSight:kind==='dawn-loom'?1.5:0,artifactIds:[kind]});
    try{
      if(kind==='flash')e.collect({kind:'sight',x:e.distance+e.player.x,y:e.player.y});
      else if(kind==='seer')assert.equal(e.triggerMainSight(),true);
      else if(kind==='flash-stone')e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y});
      else if(kind==='dawn-loom')e.artifactEffects.onRecharge(1);
      else{
        const item={id:`map:${kind}`,kind,family:kind==='bubble'?'lift':'reveal',x:e.distance+e.player.x,y:e.player.y,
          baseY:e.player.y,radius:13,host:{phase:0,motion:0},phase:'idle',age:0,color:'#c8b9ee'};
        e.biomeDynamics.items=[item];e.biomeDynamics.update(1/60);assert.equal(item.spent,true);
      }
      const event=crossings(e);
      assert.equal(event.pulseSourceKind,kind==='flash'?'pickup':kind==='seer'?'ability':['flash-stone','dawn-loom'].includes(kind)?'relic':'map');
      assert.ok(e.luminanceWaves.waves.every(wave=>wave.reveal),'all real producers reveal their traversing front');
    }finally{e.destroy();}
  }
});

test('Rhythm, Wave Loom, Overfill and Prism Wick use the shared pulse dispatcher with card identity',()=>{
  for(const kind of ['rhythm','wave-loom','overfill','prism-wick']){
    const ids=['harvest-common',...(kind==='overfill'?[]:kind==='wave-loom'?['wave-loom','field-impulse']:[kind==='prism-wick'?'diving-bell':kind])];
    const e=flight(ids,{collectorFieldImpulse:kind==='wave-loom'},{cardPilot:kind==='overfill'});
    try{
      if(kind==='rhythm'){
        for(const at of [0,.6,1.2]){e.time=at;assert.equal(e.beginLiftInput(),true);e.endLiftInput();}
      }else if(kind==='wave-loom')assert.equal(e.activateFieldImpulse('right'),true);
      else if(kind==='overfill')for(let i=0;i<3;i++){e.flame=e.maxFlame;e.collect({kind:'light'});}
      else{
        e.collect({kind:'sight',x:e.distance+e.player.x,y:e.player.y});e.time=e.sightUntil;e.luminanceWaves.clear();
        updatePrismWick(e);
        assert.equal(e.luminanceWaves.waves[0].x,e.flashTether.x,'final wave starts at the expiring prism');
      }
      const event=crossings(e);assert.equal(event.pulseSourceKind,'card');
      assert.equal(event.pulseSource,`card-${kind}`);
    }finally{e.destroy();}
  }
});

test('the first crossing is physical shell arrival order even when layout order is reversed',()=>{
  const e=flight(['first-ripple','far-shore']);
  try{
    const far={x:e.distance+e.player.x+150,y:e.player.y,kind:'cache'},near={x:e.distance+e.player.x+50,y:e.player.y,kind:'light'};
    e.layout.embers=[far,near];e.getNearbyPickups=()=>[far,near];e.flame=0;
    const events=[],resolve=e.resolveCardRowEvent.bind(e);
    e.resolveCardRowEvent=(kind,detail)=>{if(kind==='wave-crossing')events.push({...detail});return resolve(kind,detail);};
    e.radiateLight({once:true,source:'test'});e.luminanceWaves.update(.5);
    assert.deepEqual(events.map(event=>[event.pickupKind,event.firstCrossing]),[['light',true],['cache',false]]);
    assert.equal(e.flame,9*CARD_UNIT);
  }finally{e.destroy();}
});

test('card Proximity and Watchlight rescue emit one card-origin crossing front from the actual body pose',()=>{
  for(const kind of ['proximity','watchlight']){
    const e=flight(['harvest-common',kind==='proximity'?'slip-feather':'watchlight'],
      {proximityUnlocked:kind==='proximity'});
    try{
      if(kind==='watchlight'){
        e.player.y=e.height+20;e.hit(null);assert.equal(e.dying,false);assert.equal(e.cardWatchlightUsed,true);
      }else{
        const worldX=e.distance+e.player.x;
        const rock={x:worldX-100,width:600,center:e.player.y+55,gap:0,motion:0,phase:0,
          bottomShape:[[-100,0],[1000,0],[1000,1000],[-100,1000]]};
        e.edgingPulse.charge=1;e.edgingPulse.update(1/60,[rock]);assert.equal(e.edgingPulse.triggerCount,1);
      }
      const wave=e.luminanceWaves.waves[0];
      assert.equal(wave.x,e.distance+e.player.x);assert.equal(wave.y,e.player.y);
      assert.equal(wave.sourceKind,'card');assert.equal(crossings(e).pulseSourceKind,'card');
    }finally{e.destroy();}
  }
});

test('boundary sweep excludes old illuminated interiors and contacts beyond its maximum',()=>{
  const wave={x:0,y:0,previous:100,radius:140,maximum:150};
  assert.equal(luminanceWaveCrossing(wave,{x:20,y:0,kind:'light'}),null);
  assert.equal(luminanceWaveCrossing(wave,{x:200,y:0,kind:'light'}),null);
  assert.ok(luminanceWaveCrossing(wave,{x:130,y:0,kind:'light'})>=100);
});

test('periodic moving sources anchor each front at the interpolated emission pose',()=>{
  const e={running:true,alive:true,time:.5,distance:100,previousDistance:0,previousPlayerY:10,player:{x:20,y:30}};
  const m=new LuminanceWaves(e);m.addSource({id:'moving',follow:'wisp',radius:500,interval:.25,duration:1});m.update(.5);
  assert.deepEqual(m.waves.map(w=>[w.x,w.y,w.emittedAt]),[[20,10,0],[70,20,.25]]);
  e.flashTether={x:120,y:60,px:20,py:20,expires:2};m.clear();
  m.addSource({id:'flash',follow:'flash',radius:500,interval:.25,duration:1});m.update(.5);
  assert.deepEqual(m.waves.map(w=>[w.x,w.y,w.emittedAt]),[[20,20,0],[70,40,.25]]);
});

test('a long tick resolves completed periodic fronts before retiring their visual history',()=>{
  function run(steps){
    const packet={x:90,y:50,kind:'light'},e={running:true,alive:true,time:0,flame:0,maxFlame:100,
      mod:{cardHarvestMeter:1},layout:{embers:[packet]}};
    const waves=new LuminanceWaves(e);waves.addSource({id:'map',sourceKind:'map',x:0,y:50,radius:145,duration:.75,interval:.25});
    for(const dt of steps){e.time+=dt;waves.update(dt);}
    assert.equal(packet.collected,undefined);return e.flame;
  }
  assert.equal(run([.75]),run(Array(15).fill(.05)));
  assert.equal(run([.75]),3);
});

test('replacing a Flash restarts its local two-second beat; upgrades preserve the live beat',()=>{
  const e=flight([]),emitted=[],emit=e.luminanceWaves.emit.bind(e.luminanceWaves);
  e.luminanceWaves.emit=settings=>{const wave=emit(settings);emitted.push(wave);return wave;};
  const advance=dt=>{e.time+=dt;e.luminanceWaves.update(dt);};
  try{
    e.collect({kind:'sight',x:e.player.x,y:e.player.y});advance(.3);advance(.7);
    e.collect({kind:'sight',x:e.player.x+10,y:e.player.y});advance(.2);
    e.applySkillUpgrade({longFlash:true},0);advance(1.8);advance(.01);
    assert.deepEqual(emitted.map(w=>Math.round(w.emittedAt*1000)/1000),[0,1,3]);
  }finally{e.destroy();}
});

test('baseline, Sense and passive sight do not manufacture harvest pulses',()=>{
  const e=flight(['lantern-lens'],{lightRadius:300});
  try{
    e.artifactEffects.sightUntil=10;
    for(let i=0;i<30;i++){e.player.y=e.height/2;e.player.vy=0;e.step(1/60);}
    assert.equal(e.luminanceWaves.waves.length,0);assert.equal(e.luminanceWaves.sources.size,0);
  }finally{e.destroy();}
});

test('a lighting policy can suppress a card pulse reveal while its crossing mechanics still pay',()=>{
  const e=flight(['harvest-common']);
  try{
    e.pulseRevealsAllowed=({sourceKind})=>sourceKind!=='card';
    const wave=e.radiateLight({once:true,source:'card-test',sourceKind:'card'});
    assert.equal(wave.reveal,false);assert.equal(e.luminanceWaves.revealCount,0);
    assert.equal(crossings(e).pulseSourceKind,'card');
  }finally{e.destroy();}
});
