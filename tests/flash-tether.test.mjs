import assert from 'node:assert/strict';
import test from 'node:test';
import {WispFlight} from '../dist/flight.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {createFlashTether, drawFlashTether, flashLightPulse, FLASH_PUFF_DURATION, stepFlashTether} from '../dist/flash-tether.mjs';

const step = 1 / 60;
const duration = getPickupSpec('sight').sightDuration;
const makeTether = reducedMotion => createFlashTether({
  x:110, y:200, playerX:100, playerY:210, time:2, duration, reducedMotion
});

function canvasProbe(){
  const points = {translations:[], starts:[], rotations:[], fills:0, strokes:0};
  const ctx = {
    globalAlpha:1, save(){}, restore(){}, scale(){}, beginPath(){}, closePath(){},
    lineTo(){}, fillRect(){}, fill(){points.fills++}, stroke(){points.strokes++},
    moveTo(x,y){points.starts.push([x,y])},
    translate(x,y){points.translations.push([x,y])}, rotate(angle){points.rotations.push(angle)},
    createRadialGradient(){return {addColorStop(){}}}
  };
  return {ctx, points};
}

function render(tether,time,distance=0){
  const {ctx,points}=canvasProbe();
  drawFlashTether(ctx,tether,{time,distance,playerX:115,playerY:203});
  return points;
}

test('Flash follows the wisp with a bounded spring and renders between simulation steps',()=>{
  const t=makeTether(false);
  assert.deepEqual([t.x,t.y],[110,200]);
  stepFlashTether(t,115,203,2+step,step);
  const {translations,starts,strokes}=render(t,2+step*.5,40);
  assert.ok(Math.abs(translations[0][0]-((t.px+t.x)/2-40))<1e-8);
  assert.ok(Math.abs(translations[0][1]-(t.py+t.y)/2)<1e-8);
  assert.deepEqual(starts[0],[75,203]);
  assert.ok(strokes>0);
  stepFlashTether(t,210,95,2+2*step,step);
  assert.ok(Math.hypot(t.x-210,t.y-95)<=50+1e-8);
});

test('reduced motion steadies the Flash and expiration leaves a world-anchored fading puff',()=>{
  const full=makeTether(false), quiet=makeTether(true);
  assert.ok(flashLightPulse(full,2)>flashLightPulse(full,2.925));
  assert.equal(flashLightPulse(quiet,2),flashLightPulse(quiet,2.925));
  assert.equal(render(quiet,2.3).rotations[0],0);
  assert.notEqual(render(full,2.3).rotations[0],0);
  const end=quiet.expires;
  assert.equal(flashLightPulse(quiet,end),0);
  assert.ok(stepFlashTether(quiet,400,300,end,step));
  const a=render(quiet,end+.2,13), b=render(quiet,end+.2,29);
  assert.ok(a.fills>0);
  assert.equal(a.strokes,0);
  assert.deepEqual(a.translations,[]);
  assert.equal(a.starts[0][0]-b.starts[0][0],16);
  assert.equal(a.starts[0][1],b.starts[0][1]);
  assert.equal(stepFlashTether(quiet,400,300,end+FLASH_PUFF_DURATION,step),false);
  assert.equal(render(quiet,end+FLASH_PUFF_DURATION).fills,0);
});

function flight(){
  const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
  const game=new WispFlight({canvas,preflight:true,seed:'flash-handoff',terrain:'ruins',companions:['collector']});
  game.running=true;
  game.render=()=>{};
  return game;
}
const economy = g => [g.flame,g.flameRestored,g.bodyFuelCollected,g.condensedTotal,g.condensedRemainder,g.absorptionEffects.length];

test('body contact and Collector delivery attach the Flash at contact and award only its reveal',()=>{
  for(const delivery of ['body','collector']){
    const g=flight();
    const item={kind:'sight',id:'flash-test',x:g.distance+g.player.x+2,y:g.player.y};
    g.layout.embers=[item];
    let atContact;
    const collect=g.collect.bind(g);
    g.collect=(pickup,source)=>{
      const before=economy(g);
      atContact=[source?.worldX??pickup.x,source?.y??pickup.y];
      collect(pickup,source);
      assert.deepEqual(economy(g),before);
    };
    if(delivery==='body'){
      g.flame=g.maxFlame-10;
      g.step(step);
    } else {
      item.x+=64;
      item.y-=35;
      g.wisp.target=item;
      g.wisp.phase='outbound';
      for(let i=0; i<150&&!item.collected; i++){
        g.time+=step;
        g.previousDistance=g.distance;
        g.distance+=140*step;
        g.wisp.update(g,step);
      }
      assert.equal(item.deliveredByWisp,true);
      assert.notDeepEqual(atContact,[item.x,item.y]);
    }
    assert.equal(item.collected,true);
    assert.deepEqual([g.flashTether.x,g.flashTether.y],atContact);
    assert.equal(g.flashTether.expires,g.time+duration);
    assert.equal(g.sightUntil,g.flashTether.expires);
    assert.ok(g.getLightState().tetherReveal>0);
    g.destroy();
  }
});
