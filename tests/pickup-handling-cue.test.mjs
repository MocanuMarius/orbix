import test from 'node:test';
import assert from 'node:assert/strict';
import {pickupHandlingCue,drawPickupHandlingCue,pickupHookAnchor} from '../dist/pickup-handling-cue.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {drawGlowSense} from '../dist/glow-sense.mjs';
import {glowPoints} from '../dist/vitality.mjs';
import {drawCollectorGrip} from '../dist/capture-art.mjs';

function context(){
  const pixels=[],paths=[],stack=[];let points=[];
  const c=new Proxy({pixels,paths,globalAlpha:1,save(){stack.push({alpha:this.globalAlpha,ink:this.fillStyle})},restore(){const s=stack.pop();this.globalAlpha=s.alpha;this.fillStyle=s.ink;},fillRect(x,y,w,h){pixels.push({x,y,w,h,ink:this.fillStyle,alpha:this.globalAlpha})},beginPath(){points=[];},moveTo(x,y){points.push({x,y});},lineTo(x,y){points.push({x,y});},fill(){paths.push({points:[...points],ink:this.fillStyle,alpha:this.globalAlpha});}},
    {get:(o,k)=>o[k]??(()=>{})});
  return c;
}
const curls=c=>c.paths;
const make=(modifiers={},companions=['collector'])=>new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
  preflight:true,seed:'handling-cue',companions,modifiers});

test('handling shapes track actual equipped Collector capability, with Cache and Flash learned separately',()=>{
  const capability={collector:true};
  for(const kind of ['light','cluster'])assert.equal(pickupHandlingCue({kind},{},capability),'collector');
  for(const kind of ['cache','sight'])assert.equal(pickupHandlingCue({kind},{},capability),'body');
  assert.equal(pickupHandlingCue({kind:'cache'},{collectorFetchMass:3},capability),'collector');
  assert.equal(pickupHandlingCue({kind:'sight'},{collectorFetchMass:3},capability),'body');
  assert.equal(pickupHandlingCue({kind:'sight'},{collectorFlashFetch:true},capability),'collector');
  assert.equal(pickupHandlingCue({kind:'cache'},{collectorFlashFetch:true},capability),'body');
  assert.equal(pickupHandlingCue({kind:'light'},{collectorFetchMass:3},{collector:false}),'body');
  for(const kind of ['dark','dusk'])assert.equal(pickupHandlingCue({kind},{collectorFetchMass:3,collectorFlashFetch:true},capability),'danger');
  assert.equal(pickupHandlingCue({kind:'light',collected:true},{},capability),null);
  assert.equal(pickupHandlingCue({kind:'light',carried:true},{},capability),null);
});

test('a tapered curl shares the shell color, begins inside its membrane and inherits visibility',()=>{
  for(const scale of [.615,1]){
    const c=context();drawPickupHandlingCue(c,80,80,{kind:'light'},{},{collector:true,scale,alpha:.2});
    const hooks=curls(c);assert.equal(hooks.length,2);assert.ok(hooks.every(p=>p.alpha>0&&p.alpha<=.2&&p.ink==='#f6edda'));
    const root=hooks[1].points[0];assert.ok(Math.hypot(root.x-80,root.y-80)<12.8*scale,'wide root lies inside the shell');
    assert.equal(c.pixels.length,0,'no outlined rectangular J stamp');
    const before=c.paths.length;
    drawPickupHandlingCue(c,120,80,{kind:'cache'},{},{collector:true,scale,alpha:.2});
    assert.equal(c.paths.length,before);
    const anchor=pickupHookAnchor({kind:'light'},80,80,scale);assert.ok(hooks[1].points.some(p=>p.y>anchor.y));
    drawPickupHandlingCue(c,160,80,{kind:'dark'},{},{collector:true,scale});assert.equal(c.paths.length,before);
    drawPickupHandlingCue(c,180,80,{kind:'light'},{},{collector:true,scale,alpha:0});assert.equal(c.paths.length,before);
  }
});

test('both production render paths show base and learned cues under fog; unavailable Collector is body-only',()=>{
  for(const learned of [false,true])for(const role of ['collector','protector']){
    const e=make(learned?{collectorFetchMass:3,collectorFlashFetch:true}:{},[role]);
    const light={radius:1000,intensity:1};e.getLightState=()=>light;
    e.layout.embers=['light','cluster','cache','sight','dark','dusk'].map((kind,i)=>({kind,x:e.distance+e.player.x+30+i*28,y:e.player.y}));
    const fallback=context();e.drawEmbers(fallback,light);
    const pixel=context(),view={scale:.615,buffer:{width:554},bufferContext:pixel,drawPacket:WispFlightView.prototype.drawPacket};
    WispFlightView.prototype.drawCollectibles.call(view,e,0,e.distance);
    for(const c of [fallback,pixel]){
      assert.equal(curls(c).length/2,role==='collector'?(learned?4:2):0);
    }
    e.getLightState=()=>({radius:1,intensity:0});const hidden=context();e.drawEmbers(hidden,e.getLightState());assert.equal(curls(hidden).length,0);
    e.destroy();
  }
});

test('Glow Sense cues keep the same capability shapes at the reveal strength and never leak outside its reach',()=>{
  const e=make({glowSense:true});e.layout.embers=[{kind:'cluster',x:e.distance+e.player.x+180,y:e.player.y}];e._nearbyPacketsUntil=-1;
  const c=context();drawGlowSense(c,e,{light:{radius:145,intensity:1}});
  assert.equal(curls(c).length,2);assert.ok(curls(c).every(p=>p.alpha>0&&p.alpha<=.33));
  e.layout.embers[0].x=e.distance+e.width-10;e._nearbyPacketsUntil=-1;const remote=context();drawGlowSense(remote,e,{light:{radius:145,intensity:1}});
  assert.equal(curls(remote).length,0);e.destroy();
});

test('Collector grows its own mint grip only during a visible reach or tow',()=>{
  const idle=context();drawCollectorGrip(idle,{x:50,y:50,phase:'ready'});assert.equal(idle.paths.length,0);
  const reach=context();reach.globalAlpha=.4;
  drawCollectorGrip(reach,{x:50,y:50,gripPose:{x:80,y:60,growth:1,attached:false}},1,6.5);
  assert.equal(reach.paths.length,2);assert.equal(reach.paths[1].ink,'#b4dcc0');
  const root=reach.paths[1].points[0];assert.ok(Math.hypot(root.x-50,root.y-50)<6.5,'strand root is buried in Collector');
  assert.ok(reach.paths.every(p=>p.alpha<=.4));assert.equal(reach.globalAlpha,.4);
  const hidden=context();drawCollectorGrip(hidden,{x:50,y:50,gripPose:{x:80,y:60,growth:0}});assert.equal(hidden.paths.length,0);
});

test('unmarked pickup keeps direct collection, and capability remains while range recovers',()=>{
  const e=make();e.running=true;e.flame=0;e.wisp.phase='cooldown';e.wisp.cooldown=99;
  const cache={kind:'cache',sparkMass:3,x:e.distance+e.player.x,y:e.player.y};
  assert.equal(pickupHandlingCue({kind:'cluster'},e.mod,{collector:e.hasCompanion('collector')}),'collector');
  assert.equal(pickupHandlingCue(cache,e.mod,{collector:e.hasCompanion('collector')}),'body');
  e.collect(cache);assert.equal(glowPoints(e.flame),18);assert.equal(cache.collected,true);e.destroy();
});
