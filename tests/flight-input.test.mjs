import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFlightPointerControls,localGestureVector,classifyFieldGesture} from '../dist/flight-input.mjs';

class Target extends EventTarget {
 constructor(){super();this.clientWidth=844;this.clientHeight=300;this.parentElement=null;this.captures=[];}
 setPointerCapture(id){this.captures.push(id);}
}
function fixture({owns=true,tutorial=false}={}){
 const doc=new Target(),view=new Target(),lift=new Target(),playfield=new Target();doc.defaultView=view;playfield.ownerDocument=lift.ownerDocument=doc;
 const calls=[],scene={running:true,mod:{collectorFieldImpulse:owns},hasCompanion:id=>id==='collector',tutorial:tutorial?{}:null,
  beginLiftInput(){calls.push('begin');},endLiftInput(cancelled){calls.push(['end',cancelled]);},flap(){calls.push('flap');},activateFieldImpulse(direction){calls.push(direction);}};
 let blocked=false,current=scene;
 const binding=bindFlightPointerControls({lift,playfield,getEngine:()=>current,blocked:()=>blocked});
 const fire=(target,type,{id=1,x=100,y=100,time=0,...extra}={})=>{
  const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,button:0,isPrimary:true,...extra});Object.defineProperty(e,'timeStamp',{value:time});
  if(['pointerdown','pointerup','pointercancel'].includes(type))doc.dispatchEvent(e);target.dispatchEvent(e);
 };
 return {scene,calls,lift,playfield,doc,view,binding,fire,setBlocked:v=>blocked=v,replace:()=>current={...scene}};
}

test('owner playfield tap lifts once on release while dedicated Lift and nonowner scene taps stay instant',()=>{
 for(const owns of [true,false]){
  const f=fixture({owns});try{
   f.fire(f.playfield,'pointerdown');assert.deepEqual(f.calls,owns?[]:['begin']);
   f.fire(f.playfield,'pointerup',{x:102,y:103,time:100});assert.deepEqual(f.calls,owns?['flap']:['begin',['end',false]]);
   f.calls.length=0;f.fire(f.lift,'pointerdown',{time:200});assert.deepEqual(f.calls,['begin']);f.fire(f.lift,'pointerup',{time:260});assert.deepEqual(f.calls,['begin',['end',false]]);
  }finally{f.binding.destroy();}
 }
});

test('up/down/right swipe act once with no Lift; left, diagonal and out-and-back paths are ignored',()=>{
 for(const [x,y,expected]of [[100,30,'up'],[100,170,'down'],[180,100,'right'],[30,100,null],[145,145,null],[115,100,null]]){
  const f=fixture();try{f.fire(f.playfield,'pointerdown');f.fire(f.playfield,'pointermove',{x,y,time:70});f.fire(f.playfield,'pointerup',{x,y,time:140});f.fire(f.playfield,'lostpointercapture',{x,y,time:141});assert.deepEqual(f.calls,expected?[expected]:[]);}finally{f.binding.destroy();}
 }
 const f=fixture();try{f.fire(f.playfield,'pointerdown');f.fire(f.playfield,'pointermove',{y:20,time:60});f.fire(f.playfield,'pointerup',{time:160});assert.deepEqual(f.calls,[]);}finally{f.binding.destroy();}
});

test('cancel, two fingers, pause/epoch change, overlays, tutorial, replay and engine replacement cannot leave a phantom action',()=>{
 for(const type of ['pointercancel','lostpointercapture']){const f=fixture();try{f.fire(f.playfield,'pointerdown');f.fire(f.playfield,type,{y:20,time:100});f.fire(f.playfield,'pointerup',{y:20,time:110});assert.deepEqual(f.calls,[]);}finally{f.binding.destroy();}}
 for(const invalidate of [f=>f.scene.paused=true,f=>f.scene.inputEpoch=1,f=>f.setBlocked(true),f=>f.scene.dream={phase:'replay'},f=>f.replace(),f=>f.view.dispatchEvent(new Event('blur'))]){
  const f=fixture();try{f.fire(f.playfield,'pointerdown');invalidate(f);f.fire(f.playfield,'pointerup',{time:100});assert.deepEqual(f.calls,[]);}finally{f.binding.destroy();}
 }
 const f=fixture();try{f.fire(f.playfield,'pointerdown');f.fire(f.playfield,'pointerdown',{id:2,isPrimary:false});f.fire(f.playfield,'pointerup',{y:20,time:100});f.fire(f.playfield,'pointerup',{id:2,time:110});assert.deepEqual(f.calls,[]);}finally{f.binding.destroy();}
 const paused=fixture();try{paused.setBlocked(true);paused.fire(paused.playfield,'pointerdown');paused.setBlocked(false);paused.fire(paused.playfield,'pointerup',{time:100});assert.deepEqual(paused.calls,[]);}finally{paused.binding.destroy();}
 const tutorial=fixture({tutorial:true});try{tutorial.fire(tutorial.playfield,'pointerdown');assert.deepEqual(tutorial.calls,['begin']);}finally{tutorial.binding.destroy();}
});

test('inverse coordinate mapping preserves landscape swipe meaning under rotation and scale',()=>{
 const vector=localGestureVector(70,0,{a:0,b:1.5,c:-1.5,d:0});
 assert.deepEqual(vector,{x:0,y:-70/1.5});
 assert.equal(classifyFieldGesture({...vector,peak:47,elapsed:100}),'up');
 assert.equal(classifyFieldGesture({x:60,y:0,peak:60,elapsed:701}),null);
 const f=fixture();let layouts=0;f.view.getComputedStyle=()=>{layouts++;return {transform:'none'};};try{f.fire(f.lift,'pointerdown');assert.equal(layouts,0,'instant Lift does not measure ancestor transforms');}finally{f.binding.destroy();}
});
