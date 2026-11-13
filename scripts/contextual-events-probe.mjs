import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {PILGRIM_VOW,contextualFlightNotice,isVowBodyPickup} from '../dist/contextual-events.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {WispFlight} from '../dist/flight.mjs';

function fixture(eventIndex){
 const state=M.newState(),r=state.run=M.createRun(state.profile,`contextual-${eventIndex}`);
 const base=r.map[0][0],first={...base,id:'marked-wind',row:1,type:'flight',kind:'normal',elite:false,terrain:'storm',name:'Stormglass Narrows'},second={...base,id:'marked-light',row:1,type:'flight',kind:'normal',elite:false,terrain:'ruins',encounterFamily:'stillwater-tunnel',name:'Rooted Arcade'};
 first.nextIds=second.nextIds=r.map[2].slice(0,2).map(n=>n.id);
 const event={...base,id:'context-event',row:0,type:'support',kind:'event',eventIndex,nextIds:[first.id,second.id]};
 r.map[0]=[event];r.map[1]=[first,second];r.current=event;r.phase='support';r.step=0;r.path=[event.id];r.flame=60;
 return state;
}
const accept=(s,id)=>{const choices=M.getSupportChoices(s.run,s.profile),index=choices.findIndex(choice=>choice.id===id);assert.ok(index>=0);assert.ok(M.resolveSupport(s.run,index,s.profile));return choices[index];};
const enter=s=>{const n=M.getChoices(s.run)[0];assert.ok(M.selectNode(s.run,n.id));assert.ok(M.beginFlightAttempt(s.run));return n;};
const complete=(s,bodyFuelCollected,success=true)=>{enter(s);assert.ok(M.finishFlight(s.run,{success,bodyFuelCollected,collected:bodyFuelCollected,flame:50}));};

for(let i=0;i<12;i++){
 const a=M.createRun(M.newState().profile,'event-deck-'+i),b=M.createRun(M.newState().profile,'event-deck-'+i);
 assert.deepEqual(a.map,b.map,'The authored event deck is seeded');
 const events=a.map.flat().filter(n=>n.kind==='event');
 assert.ok(events.some(n=>[2,4].includes(n.eventIndex)),'Every map includes a contextual decision');
 assert.equal(new Set(events.map(n=>n.eventIndex)).size,events.length,'Events do not repeat within a map');
}
const vow=fixture(2),start=vow.run.condensedGlow,offered=M.getSupportChoices(vow.run,vow.profile);
assert.equal(offered[0].effect.pilgrimVow.reward,8);assert.match(offered[0].description,/Collector deliveries do not count/);
assert.deepEqual(M.getSupportChoices(vow.run,vow.profile),offered,'Offers stay fixed on repeated inspection');
accept(vow,'pilgrim-vow');assert.equal(vow.run.condensedGlow,start);assert.equal(vow.run.flame,60);
assert.match(contextualFlightNotice(vow.run,M.getChoices(vow.run)[0]),/4 body fuel pickups/);
const memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)||null};
assert.ok(M.saveState(vow,storage));assert.deepEqual(M.loadState(storage).run.pilgrimVow,vow.run.pilgrimVow,'Accepted vow survives save/load');
complete(vow,PILGRIM_VOW.target);
assert.equal(vow.run.pilgrimVow,undefined);assert.equal(vow.run.lastFlight.vow.completed,true);
assert.equal(M.settleCheckpoint(vow),8);assert.equal(vow.run.condensedGlow,start+8);
assert.equal(M.settleCheckpoint(vow),0,'Vow pays exactly once');
assert.equal(M.finishFlight(vow.run,{success:true,bodyFuelCollected:99}),false);

const miss=fixture(2);accept(miss,'pilgrim-vow');complete(miss,3);
assert.equal(miss.run.lastFlight.vow.reward,0);assert.equal(M.settleCheckpoint(miss),0);
assert.equal(miss.run.pilgrimVow,undefined,'Missing target consumes the promise');
const death=fixture(2);accept(death,'pilgrim-vow');const lives=death.run.lives;complete(death,99,false);
assert.equal(death.run.lives,lives-1);assert.equal(death.run.pilgrimVow,undefined);assert.equal(death.run.lastAttempt.vow.reward,0);
assert.equal(M.settleCheckpoint(death),0);complete(death,99);assert.equal(M.settleCheckpoint(death),0,'Retry cannot reuse the vow');
const immediate=fixture(2);accept(immediate,'pilgrim-offering');assert.equal(immediate.run.flame,80);assert.equal(immediate.run.pilgrimVow,undefined);

for(const [id,field,delta] of [['marked-wind','windSensitivity',.7],['marked-light','lightRadius',35]]){
 const s=fixture(4),choices=M.getSupportChoices(s.run,s.profile),offer=choices.find(c=>c.effect.routePreparation?.nodeId===id);
 assert.ok(offer);assert.match(offer.description,/first attempt/);accept(s,offer.id);
 assert.deepEqual(M.getChoices(s.run).map(n=>n.id),[id],'Taking preparation commits only its linked exit');
 assert.ok(M.selectNode(s.run,id));const base=M.getRunModifiers({...s.run,routePreparation:null}),prepared=M.getRunModifiers(s.run);
 assert.equal(prepared[field],field==='windSensitivity'?base[field]*delta:base[field]+delta);
 assert.ok(M.beginFlightAttempt(s.run));assert.ok(M.finishFlight(s.run,{success:false}));
 assert.equal(s.run.routePreparation,undefined);
 assert.deepEqual(M.getChoices(s.run).map(n=>n.id),['marked-wind','marked-light'],'Failure reopens the original legal fork');
 assert.equal(M.getRunModifiers(s.run)[field],base[field],'Consumed preparation no longer changes flight');
}
const open=fixture(4);accept(open,'survey-offering');assert.equal(open.run.routePreparation,undefined);assert.equal(M.getChoices(open.run).length,2);
const stale=fixture(4);M.getSupportChoices(stale.run,stale.profile);stale.run.current.nextIds=[];
assert.equal(M.resolveSupport(stale.run,0,stale.profile),false,'Stale offers cannot create a path that no longer exists');

// Production pickup accounting excludes delivery, harm, generated fuel and Dream.
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const context=new Proxy({}, {get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>context,getBoundingClientRect:()=>({width:956,height:430})};
let result;const engine=new WispFlight({canvas,seed:'vow-body',duration:30,flame:50,companions:[],onFinish:r=>{result=r;}});
engine.render=()=>{};engine.start();
for(const packet of [{kind:'light'},{kind:'cache'},{kind:'cluster'},{kind:'light',deliveredByWisp:true},{kind:'light',generated:true},{kind:'dusk'},{kind:'charge'}])engine.collect({...packet,x:engine.player.x,y:engine.player.y});
assert.equal(engine.bodyFuelCollected,3);
engine.dream={phase:'recording',active:true};engine.collect({kind:'light',x:0,y:0});assert.equal(engine.bodyFuelCollected,3);
engine.dream={phase:'done',active:false};engine.collect({kind:'light',x:0,y:0});assert.equal(engine.bodyFuelCollected,4);
assert.equal(isVowBodyPickup(engine,{kind:'dark'},getPickupSpec('dark')),false);
engine.finish(true);engine.completionAge=1.5;engine.finish(true);assert.equal(result.bodyFuelCollected,4,'Flight result carries real body pickups');engine.destroy();
console.log(JSON.stringify({seededUniqueEvents:true,contextualGuarantee:true,vowOnceOnly:true,bodyPickupAccounting:true,noFailurePenalty:true,realRouteCommitment:true,failureReopensFork:true,staleChoiceGuard:true,saveLoad:true}));
