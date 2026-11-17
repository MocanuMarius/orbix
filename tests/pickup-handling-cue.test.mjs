import test from 'node:test';
import assert from 'node:assert/strict';
import {pickupHandlingCue,drawPickupHandlingCue,pickupHookAnchor,COLLECTOR_RING} from '../dist/pickup-handling-cue.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {drawGlowSense} from '../dist/glow-sense.mjs';
import {glowPoints} from '../dist/vitality.mjs';
import {drawCollectorGrip} from '../dist/capture-art.mjs';

function context(){
  const pixels=[],paths=[],strokes=[],stack=[];let points=[];
  const c=new Proxy({pixels,paths,strokes,globalAlpha:1,save(){stack.push({alpha:this.globalAlpha,ink:this.fillStyle,stroke:this.strokeStyle,width:this.lineWidth})},restore(){const s=stack.pop();this.globalAlpha=s.alpha;this.fillStyle=s.ink;this.strokeStyle=s.stroke;this.lineWidth=s.width;},fillRect(x,y,w,h){pixels.push({x,y,w,h,ink:this.fillStyle,alpha:this.globalAlpha})},beginPath(){points=[];},moveTo(x,y){points.push({x,y});},lineTo(x,y){points.push({x,y});},arc(x,y,r,start,end){points.push({x,y,r,start,end,circle:true});},stroke(){strokes.push({points:[...points],ink:this.strokeStyle,width:this.lineWidth,alpha:this.globalAlpha});},fill(){paths.push({points:[...points],ink:this.fillStyle,alpha:this.globalAlpha});}},
    {get:(o,k)=>o[k]??(()=>{})});
  return c;
}
const rings=c=>c.strokes.filter(p=>p.ink===COLLECTOR_RING.color&&p.points.some(p=>p.circle));
const make=(modifiers={},companions=['collector'])=>new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
  preflight:true,seed:'handling-cue',companions,modifiers});

test('handling shapes track actual equipped Collector capability, with Cache and Flare learned separately',()=>{
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

test('one static open mint circle clears the shell, has a readable native rim and shares the grab point',()=>{
  for(const scale of [.615,1])for(const kind of ['light','sight']){
    const packet={kind},c=context(),options={collector:true,scale,alpha:.2};
    drawPickupHandlingCue(c,80,80,packet,{collectorFlashFetch:true},options);
    const hooks=rings(c);assert.equal(hooks.length,1);
    const ring=hooks[0],circle=ring.points[0],anchor=pickupHookAnchor(packet,80,80,scale);
    assert.equal(circle.x,anchor.x);assert.equal(circle.y,anchor.y);
    assert.equal(circle.end-circle.start,Math.PI*2,'one complete open circle');
    assert.ok(c.paths.every(p=>p.points.every(p=>p.y<=circle.y-circle.r)),'only the tapered neck is filled; eyelet center stays open');
    assert.ok(c.strokes.every(p=>p.alpha>0&&p.alpha<=.2));
    const bodyBottom=80+(kind==='sight'?20.8:12.8)*scale;
    assert.ok(circle.y-circle.r-COLLECTOR_RING.outline*scale/2>bodyBottom,'dark edge clears the pickup');
    if(scale===.615){assert.ok((circle.r*2+COLLECTOR_RING.outline*scale)>=8);assert.ok(ring.width>=1.2);}
    const quiet=context();drawPickupHandlingCue(quiet,80,80,packet,{collectorFlashFetch:true},{...options,reducedMotion:true,time:15,phase:9});
    assert.deepEqual(quiet.strokes,c.strokes,'no pulse, bob or reduced-motion difference');
    const before=c.strokes.length;
    for(const packet of [{kind:'cache'},{kind:'dark'},{kind:'dusk'},{kind:'light',carried:true}])drawPickupHandlingCue(c,120,80,packet,{},options);
    drawPickupHandlingCue(c,180,80,{kind:'light'},{},{...options,alpha:0});
    assert.equal(c.strokes.length,before,'locked, dangerous and absent pickups stay unmarked');
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
      assert.equal(rings(c).length,role==='collector'?(learned?4:2):0);
    }
    e.getLightState=()=>({radius:1,intensity:0});const hidden=context();e.drawEmbers(hidden,e.getLightState());assert.equal(rings(hidden).length,0);
    e.destroy();
  }
});

test('ring stays below an upper-screen pickup and fallback/native coordinates match without revealing unseen fog',()=>{
  const e=make({collectorFlashFetch:true});e.player.y=35;
  e.layout.embers=[{kind:'light',x:e.distance+e.player.x+30,y:5}];
  const lit={radius:200,intensity:1};e.getLightState=()=>lit;
  const fallback=context();e.drawEmbers(fallback,lit);
  const pixel=context(),view={scale:.615,buffer:{width:554},bufferContext:pixel,drawPacket:WispFlightView.prototype.drawPacket};
  WispFlightView.prototype.drawCollectibles.call(view,e,0,e.distance);
  assert.equal(rings(fallback).length,1);assert.equal(rings(pixel).length,1);
  const a=rings(fallback)[0].points[0],b=rings(pixel)[0].points[0];
  assert.ok(a.y-a.r>0,'upper pickup cannot hide the lower circle above the screen');
  assert.ok(Math.abs(a.x*.615-b.x)<1e-8&&Math.abs(a.y*.615-b.y)<1e-8);
  e.layout.embers[0].x=e.distance+e.player.x+500;e.getLightState=()=>({radius:80,intensity:1});
  const unseen=context();e.drawEmbers(unseen,e.getLightState());assert.equal(rings(unseen).length,0);
  view.bufferContext=context();WispFlightView.prototype.drawCollectibles.call(view,e,0,e.distance);assert.equal(rings(view.bufferContext).length,0);
  e.destroy();
});

test('Glow Sense cues keep the same capability shapes at the reveal strength and never leak outside its reach',()=>{
  const e=make({glowSense:true});e.layout.embers=[{kind:'cluster',x:e.distance+e.player.x+180,y:e.player.y}];e._nearbyPacketsUntil=-1;
  const c=context();drawGlowSense(c,e,{light:{radius:145,intensity:1}});
  assert.equal(rings(c).length,1);assert.ok(rings(c).every(p=>p.alpha>0&&p.alpha<=.33));
  e.layout.embers[0].x=e.distance+e.width-10;e._nearbyPacketsUntil=-1;const remote=context();drawGlowSense(remote,e,{light:{radius:145,intensity:1}});
  assert.equal(rings(remote).length,0);e.destroy();
});

test('the Spark loop owns the loaded filament; an approaching or rejoining Collector grows no limb',()=>{
  for(const phase of ['ready','outbound','rejoining']){
    const c=context();drawCollectorGrip(c,{x:50,y:50,phase,gripPose:{x:80,y:60,growth:1,attached:false}});
    assert.equal(c.paths.length+c.strokes.length,0);
  }
  const tow=context();tow.globalAlpha=.4;
  drawCollectorGrip(tow,{x:50,y:50,gripPose:{x:80,y:60,growth:1,attached:true}},1);
  assert.equal(tow.strokes.length,2);assert.equal(tow.paths.length,0,'taut line rather than a curling appendage');
  assert.deepEqual(tow.strokes[1].points,[{x:80,y:60},{x:50,y:50}],'filament begins in the Spark eyelet');
  assert.ok(tow.strokes.every(p=>p.alpha<=.4));assert.equal(tow.globalAlpha,.4);
});

test('unmarked pickup keeps direct collection, and capability remains while range recovers',()=>{
  const e=make();e.running=true;e.flame=0;e.wisp.phase='cooldown';e.wisp.cooldown=99;
  const cache={kind:'cache',sparkMass:3,x:e.distance+e.player.x,y:e.player.y};
  assert.equal(pickupHandlingCue({kind:'cluster'},e.mod,{collector:e.hasCompanion('collector')}),'collector');
  assert.equal(pickupHandlingCue(cache,e.mod,{collector:e.hasCompanion('collector')}),'body');
  e.collect(cache);assert.equal(glowPoints(e.flame),18);assert.equal(cache.collected,true);e.destroy();
});
