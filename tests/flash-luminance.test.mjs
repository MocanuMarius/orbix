import assert from 'node:assert/strict';
import test from 'node:test';
import {WispFlight} from '../dist/flight.mjs';
import {FLASH_LUMINANCE_BONUS,FLASH_BASE_DURATION,flashPowerupDuration} from '../dist/pickups.mjs';
import {FLASH_PULSE_INTERVAL} from '../dist/flash-tether.mjs';
import {LIGHT_PACKET_TUNING} from '../dist/vitality.mjs';

const BASE=LIGHT_PACKET_TUNING.baseRadius;
function flight(modifiers={}){
  const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
  const g=new WispFlight({canvas,preflight:true,seed:'flash-lum',terrain:'ruins',companions:['collector'],modifiers});
  g.running=true;g.render=()=>{};return g;
}
const flash=g=>g.collect({kind:'sight',x:g.distance+g.player.x,y:g.player.y});

test('plain Flare reaches as far as the old +120 px sight bonus',()=>{
  const g=flight();const before=g.getLightState().radius;
  flash(g);g.time=4;
  const ls=g.getLightState();
  assert.ok(Math.abs(ls.radius-before-120)<3,`${before} -> ${ls.radius}`);
  assert.ok(Math.abs(ls.sightBonus-120)<3);
  assert.ok(Math.abs(FLASH_LUMINANCE_BONUS/100*BASE-120)<1);
  g.destroy();
});

test('card and Momentum Luminance stack additively with the Flare and return after it',()=>{
  const g=flight();g.mod.cardLuminancePercent=20;g.cardEngineLuminance=20;
  const normal=g.getLightState().radius;
  assert.ok(Math.abs(normal-BASE*1.4)<.01);
  flash(g);g.time=4;
  const during=g.getLightState().radius;
  assert.ok(Math.abs(during-BASE*(1.4+FLASH_LUMINANCE_BONUS/100))<.01,`${during}`);
  g.time=g.sightUntil;
  assert.ok(Math.abs(g.getLightState().radius-normal)<.01);
  assert.equal(g.getLightState().sightBonus,0);
  g.destroy();
});

test('Pulses and the Luminance bonus share one duration, Long Flare lengthens both',()=>{
  for(const longFlash of [false,true]){
    const g=flight({longFlash});flash(g);
    const n=flashPowerupDuration(g.mod);
    assert.equal(n,FLASH_BASE_DURATION*(longFlash?3:1));
    assert.equal(g.sightUntil,n);assert.equal(g.flashTether.expires,n);
    const src=g.luminanceWaves.sources.get('flash');
    assert.ok(src,'flash Pulse source runs');
    assert.equal(src.interval,FLASH_PULSE_INTERVAL);
    assert.ok(Math.abs(src.remaining-n)<1e-6,'Pulse source lasts the same time');
    g.time=n-.5;assert.ok(g.getLightState().sightBonus>0);
    g.time=n;assert.equal(g.getLightState().sightBonus,0,'bonus ends on the frame the Flare ends');
    g.destroy();
  }
  assert.equal(FLASH_BASE_DURATION/FLASH_PULSE_INTERVAL,4,'a base Flare sends 4 Pulses (every 2 s over 8 s)');
});

test('Closed Eye still blocks card light but not the Flare; Dusk dimming still applies to it',()=>{
  const g=flight({closedEye:true,lightRadius:BASE*.38,cardLuminancePercent:50});
  const before=g.getLightState().radius;
  flash(g);g.time=4;
  assert.ok(Math.abs(g.getLightState().radius-before-120)<3);
  g.time=0;g.time=4;g.lightDimming=.2;
  assert.ok(g.getLightState().radius<before+120);
  g.destroy();
});

test('crystal and artifact reveal (sightUntil of artifactEffects) is not a Flare Luminance',()=>{
  const g=flight();const before=g.getLightState();
  g.artifactEffects.sightUntil=g.time+2;g.artifactEffects.sightStartedAt=g.time-.5;
  const ls=g.getLightState();
  assert.equal(ls.baseRadius,before.baseRadius);assert.equal(ls.sightBonus,0);
  assert.ok(ls.forwardLight.active);
  g.destroy();
});
