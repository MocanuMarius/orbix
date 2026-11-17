import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivationEvents,ActivationFeed,ACTIVATION_EVENT_LIMIT} from '../dist/activation-events.mjs';
import {activationPresentation} from '../dist/activation-feedback.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {getRunModifiers} from '../dist/model.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>context,getBoundingClientRect:()=>({width:844,height:390})};
function flight(artifacts=[],companions=['collector'],extra={}){
 const e=new WispFlight({canvas,preflight:true,seed:'activation',companions,modifiers:{...getRunModifiers({artifacts,companions}),...extra}});
 e.running=true;e.layout.obstacles=[];e.render=()=>{};return e;
}
const pick=(e,extra={})=>e.collect({kind:'light',x:e.distance+e.player.x,y:e.player.y,...extra});

test('receipts remain bounded, immutable and cached between actual events',()=>{
 const queue=new ActivationEvents();
 for(let i=0;i<100;i++)queue.emit(1,'same',{outcome:{fuel:2}});
 const first=queue.snapshot(1);assert.equal(first.length,ACTIVATION_EVENT_LIMIT);assert.equal(first.at(-1).sequence,100);
 assert.equal(queue.snapshot(1.2),first);assert.throws(()=>{first[0].outcome.fuel=99;});
 assert.deepEqual(queue.snapshot(4.1),[]);assert.equal(queue.sequence,100);
});

test('rapid repeats add real outcomes, distinct overlaps survive and rescues take a visible slot',()=>{
 const queue=new ActivationEvents(),feed=new ActivationFeed();
 queue.emit(1,'glow-wick',{kind:'artifact',outcome:{fuel:3}});
 queue.emit(1.1,'collector',{kind:'companion',outcome:{fuel:20}});
 queue.emit(1.2,'glow-wick',{kind:'artifact',outcome:{fuel:2}});
 const state=()=>({time:1.2,activationEvents:queue.snapshot(1.2),activationSequence:queue.sequence});
 let items=feed.update(state());assert.equal(items.length,2);assert.equal(items[0].count,2);assert.equal(items[0].outcome.fuel,5);
 assert.equal(feed.update(state()),items,'stationary frames do not allocate another presentation');
 for(let i=0;i<8;i++)queue.emit(1.2,'skill-'+i,{outcome:{lifts:1}});
 queue.emit(1.2,'collector-last-orbit',{priority:10,outcome:{saved:1}});
 items=feed.update(state());assert.equal(items.length,6);assert.equal(items[0].source,'collector-last-orbit');
 feed.update({...state(),paused:true});assert.deepEqual(feed.update(state()),[],'resume cannot replay consumed receipts');
 queue.emit(1.4,'collector',{kind:'companion',outcome:{fuel:1}});
 assert.equal(feed.update({...state(),time:1.4}).length,1);
 assert.deepEqual(feed.update({...state(),time:4}),[]);
});

// Retired (artifacts removed, docs/inscriptions.md): relic activation tested artifact effects, which no longer apply.
test.skip('repeated real relic procs are independent of once-only teaching notices and passive stats stay quiet',()=>{
 const e=flight(['glow-wick','silver-feather','quiet-cinder']);
 e.flame=0;pick(e);e.time=.2;e.flame=0;pick(e);
 const procs=e.getState().activationEvents.filter(event=>event.source==='glow-wick');
 assert.equal(procs.length,2);assert.ok(procs[1].sequence>procs[0].sequence);assert.equal(procs[0].outcome.fuel,10);
 assert.equal(e.artifactEffects.notices.filter(n=>n.artifactId==='glow-wick'&&n.phase==='triggered').length,1);
 assert.equal(e.getState().activationEvents.some(event=>event.source==='silver-feather'||event.source==='quiet-cinder'),false);
 e.destroy();
});

// Retired (artifacts removed, docs/inscriptions.md): relic activation tested artifact effects, which no longer apply.
test.skip('simultaneous source relics, Collector delivery, actual rescue and practice ability emit real receipts',()=>{
 const e=flight(['sunheart-engine','overflow-coil','dawn-loom','sunspool']);e.wisp.cooldown=5;pick(e,{kind:'cache'});
 let events=e.getState().activationEvents;assert.ok(events.some(event=>event.source==='sunheart-engine'&&event.outcome.recovery>0));
 assert.ok(events.some(event=>event.source==='overflow-coil'&&event.outcome.recovery>0));assert.ok(events.some(event=>event.source==='dawn-loom'&&event.outcome.reveal>0));
 e.flame=98;pick(e,{deliveredByWisp:true});events=e.getState().activationEvents;
 assert.equal(events.findLast(event=>event.source==='collector').outcome.fuel,2);e.destroy();
 const shield=flight([],['protector']);shield.hit(null);assert.ok(shield.getState().activationEvents.some(event=>event.source==='protector'&&event.priority===10&&event.outcome.saved===1));shield.destroy();
 const practice=new WispFlight({canvas,preflight:true,node:{tutorial:true,lesson:'swift'},companions:['swift']});
 practice.running=true;practice.tutorialAwaitingLift=false;practice.activateAbility();assert.ok(practice.getState().activationEvents.some(event=>event.source==='swift'));practice.destroy();
});

test('actual source art and capped zero restoration are explicit',()=>{
 const view=activationPresentation({source:'glow-wick',kind:'artifact',outcome:{fuel:0}});
 assert.match(view.icon,/data-artifact-art="glow-wick"/);assert.match(view.outcome,/\+0/);assert.match(view.outcome,/No Sparks restored/);
 const pulse=activationPresentation({source:'main-edging-regeneration',outcome:{fuel:10,reveal:5}});
 assert.match(pulse.icon,/Regenerative Pulse/);assert.match(pulse.outcome,/\+3/);
});
