import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForFlightEntry,prepareFlightDeparture} from '../dist/flight-entry.mjs';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {WispFlight} from '../dist/flight.mjs';
import {drawProximityMeter} from '../dist/proximity-meter.mjs';

test('entry waits only for actual renderer readiness and propagates preparation failure',async()=>{
 let release,finished=false;
 const ready=new Promise(resolve=>{release=resolve;});
 const entry=waitForFlightEntry(ready).then(()=>{finished=true;});
 await Promise.resolve();assert.equal(finished,false);
 release();await entry;assert.equal(finished,true);
 const failure=new Error('Renderer preparation failed');
 await assert.rejects(waitForFlightEntry(Promise.reject(failure)),error=>error===failure);
});

function entryFixture(){
 const handlers={},label={textContent:'Preparing…'},button={disabled:true,querySelector:selector=>selector==='b'?label:null,addEventListener(type,callback){handlers[type]=callback;}},status={},note={};
 const element={dataset:{},setAttribute(){},querySelector(selector){return selector==='.entry-depart'?button:selector==='[data-entry-status]'?status:note;}};
 return {element,handlers,button,label,status,note};
}

test('readiness preserves the tip and requires a fresh departure gesture',()=>{
 const {element,handlers,button,label,status}=entryFixture();
 const accept=prepareFlightDeparture(element);
 assert.equal(element.dataset.ready,'true');assert.equal(button.disabled,false);assert.equal(status.textContent,'Ready to depart');assert.equal(label.textContent,'Tap to depart','the plaque keeps its one size, only the words change');
 assert.equal(accept({type:'click',detail:1,pointerId:7}),false,'a press begun while loading does not depart');
 handlers.pointerdown({pointerId:7,button:0});
 assert.equal(accept({type:'click',detail:1,pointerId:7}),true,'one fresh ready tap departs');
 assert.equal(accept({type:'click',detail:1,pointerId:7}),false,'the departure gesture is consumed');
 handlers.pointerdown({pointerId:8,button:0});handlers.pointercancel();
 assert.equal(accept({type:'click',detail:1,pointerId:8}),false,'cancelled taps never depart');
 assert.equal(accept({type:'keydown',code:'Space',repeat:true}),false,'holding a key through readiness never departs');
 assert.equal(accept({type:'keydown',code:'Space',repeat:false}),true);
 assert.equal(accept({type:'click',detail:0}),true,'keyboard and assistive activation remain supported');
});

test('entry lesson callbacks restore the same departure screen instead of auto-starting',()=>{
 const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function resumeFlight('),end=source.indexOf('function beginResumeCountdown(',start);
 const {element}=entryFixture(),layer={replaceChildren(node){this.child=node;}},scene={};let resumes=0;
 const ctx=createContext({engine:scene,flightLoading:false,pendingDeparture:{element,accept:null},paused:true,resumeArmed:false,
  document:{querySelector:()=>layer},closeSheet(){},hideLesson(){},finishDeckFlight(){},pauseFlight(){},
  prepareFlightDeparture,beginResumeCountdown(){resumes++;},resumeGateMarkup(){throw new Error('second generic gate');}});
 runInContext(source.slice(start,end),ctx);ctx.resumeFlight();
 assert.equal(layer.child,element,'the illustrated tip DOM is reused');assert.equal(resumes,0);assert.equal(ctx.resumeArmed,true);
});

test('departure starts once without lifting and cannot bypass a replacement pause menu',()=>{
 const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function wakeFlight('),end=source.indexOf('import {getCruisingSpeed',start);
 let resumes=0,attempts=0;const element={isConnected:false},layer={innerHTML:'pause menu'};
 const ctx=createContext({engine:{resume(){resumes++;}},flightLoading:false,resumeArmed:true,lesson:null,paused:true,
  pendingDeparture:{element,accept:()=>true},activeFlightEntry:{},state:{run:{}},document:{hidden:false,querySelector:()=>layer},
  stopCountdown(){},persist(){},markFlightAttemptStarted(){attempts++;return true;}});
 runInContext(source.slice(start,end),ctx);
 ctx.wakeFlight({type:'keydown',code:'Space'});assert.equal(resumes,0,'Space in the pause menu cannot depart');
 element.isConnected=true;ctx.wakeFlight({type:'keydown',code:'Space'});
 assert.equal(resumes,1);assert.equal(attempts,1);assert.equal(ctx.paused,false);assert.equal(ctx.pendingDeparture,null);assert.equal(layer.innerHTML,'');
 ctx.wakeFlight({type:'keydown',code:'Space'});assert.equal(resumes,1,'a consumed gate never starts twice');
});

test('Back remains available after readiness and restores unstarted attempt state',()=>{
 const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function cancelFlightEntry('),end=source.indexOf('async function launch(',start);
 const run={phase:'briefing',restReady:false,lastAttempt:{pending:true},stats:{attempts:4}},prior={saved:true},calls=[];
 const ctx=createContext({flightLoading:false,pendingDeparture:{},activeFlightEntry:{run,restReady:true,lastAttempt:prior,attempts:3,dream:false},
  state:{run},destroyFlight(){calls.push('destroy');},suspendRun(){calls.push('suspend');},backRoute(){calls.push('back');},persist(){},goToRun(){}});
 runInContext(source.slice(start,end),ctx);ctx.cancelFlightEntry();
 assert.deepEqual(calls,['destroy','suspend','back']);assert.equal(run.restReady,true);assert.equal(run.lastAttempt,prior);assert.equal(run.stats.attempts,3);
});

test('paused entry neither schedules physics nor spends fuel, resume itself never lifts',async()=>{
 const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;let frames=0;
 globalThis.requestAnimationFrame=()=>++frames;globalThis.cancelAnimationFrame=()=>{};
 const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas={style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})};
 let engine;
 try{
  engine=new WispFlight({canvas,terrain:'ruins',seed:'paused-entry',duration:30,flame:100});await engine.ready;
  const fuel=engine.flame;engine.start({paused:true});
  assert.equal(frames,0);assert.equal(engine.time,0);assert.equal(engine.flap(),false);assert.equal(engine.flame,fuel);
  engine.resume();assert.equal(frames,1);assert.equal(engine.flaps,0);assert.equal(engine.flame,fuel);assert.equal(engine.resumeScale,.1);
  assert.equal(engine.flap(),true);assert.equal(engine.flaps,1);assert.ok(engine.flame<fuel);
  engine.pause();const time=engine.time;engine.resume();assert.equal(engine.flaps,1);assert.equal(engine.time,time);assert.equal(engine.resumeScale,.1);
 }finally{engine?.destroy();globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
});

test('proximity indicator disappears at zero and moves above the orb near the floor',()=>{
 const rects=[],c={save(){},restore(){},fillRect(...args){rects.push(args);}},pulse={charge:0};
 const e={edgingPulse:{state:pulse},player:{x:170,y:182},height:220,time:1,layout:{obstacles:[]},distance:0,reducedMotion:true};
 drawProximityMeter(c,e);assert.equal(rects.length,0);
 pulse.charge=.6;pulse.nearEdge=true;drawProximityMeter(c,e);
 assert.ok(rects.length>0);assert.ok(rects.every(r=>r[1]<e.player.y),'meter must avoid the ground beneath the orb');
 pulse.charge=0;rects.length=0;drawProximityMeter(c,e);assert.equal(rects.length,0);
});
