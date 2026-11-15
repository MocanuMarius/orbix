import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {fatalFlightPosition,lastGlimmerState,drawLastGlimmer} from '../dist/last-glimmer.mjs';
import {skillBookChapter} from '../dist/skill-chapters.mjs';
import {skillIcon} from '../dist/upgrade-icons.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function flight({node={id:'same'},seed='seed-same',modifiers={},companions=['collector'],width=900,height=405,onFinish=()=>{}}={}){
 const e=new WispFlight({canvas:{style:{},getContext:()=>context,getBoundingClientRect:()=>({width,height})},preflight:true,node,seed,modifiers,companions,onFinish});
 e.running=true;e.render=()=>{};e.layout.obstacles=[];e.stars=[];return e;
}
function state(seed='glimmer') {const s=M.newState();s.run=M.createRun(s.profile,seed);s.run.condensedGlow=500;return s;}
function enter(s){const n=M.getChoices(s.run).find(node=>node.type!=='support');assert.ok(M.selectNode(s.run,n.id));assert.ok(M.beginFlightAttempt(s.run));return n;}

test('Last Glimmer is a one-rank Flight skill after Momentum at 20 base Stored Sparks',()=>{
 const skill=M.SKILLS['main-last-glimmer'];assert.equal(skill.name,'Last Glimmer');assert.equal(skill.cost,20);assert.equal(skill.maxRank,1);assert.equal(skill.requires,'main-speed');assert.equal(skill.retired,false);assert.equal(skillBookChapter(skill),'wisp');
 const s=state();assert.equal(M.buyCheckpointSkill(s,'main-last-glimmer'),false);assert.ok(M.buyCheckpointSkill(s,'main-speed'));assert.ok(M.buyCheckpointSkill(s,'main-last-glimmer'));assert.equal(M.buyCheckpointSkill(s,'main-last-glimmer'),false);
 assert.match(skillIcon(skill),/data-skill-art="Last Glimmer"/);
});

test('a real fatal position survives same-node retry and reload, never another route or run',()=>{
 const s=state();s.run.skills['main-last-glimmer']=1;const n=enter(s),seed=`${s.run.seed}-${n.id}`;
 const e=flight({node:n,seed,onFinish:result=>assert.ok(M.finishFlight(s.run,result))});
 e.distance=1400;e.player.y=e.height*.63;const expected=fatalFlightPosition(e);e.beginDying('collision');e.finish(false);
 assert.deepEqual(s.run.lastFatal,expected);assert.equal(s.run.current,null);assert.equal(M.getRunModifiers(s.run).lastGlimmer,null);
 let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};M.saveState(s,storage);const loaded=M.loadState(storage);
 assert.deepEqual(loaded.run.lastFatal,expected);assert.ok(M.selectNode(loaded.run,n.id));assert.deepEqual(M.getRunModifiers(loaded.run).lastGlimmer,expected);
 loaded.run.current={...n,id:n.id+'-different'};assert.equal(M.getRunModifiers(loaded.run).lastGlimmer,null);
 const fresh=M.createRun(loaded.profile,s.run.seed);assert.equal(fresh.lastFatal,undefined);assert.equal(M.getRunModifiers(fresh).lastGlimmer,null);e.destroy();
});

test('only completed fatal attempts record, excluding shield saves, rehearsal, and interruption',()=>{
 const shield=flight({companions:['protector'],modifiers:{protectorCost:12}});shield.hit(null);assert.equal(shield.dying,false);assert.equal(shield.deathPosition,undefined);shield.destroy();
 const dream=flight();dream.dream={mode:'record',active:true};dream.beginDying();assert.equal(dream.deathPosition,null);dream.destroy();
 const replay=flight();replay.dream={mode:'replay',active:true};assert.equal(fatalFlightPosition(replay),null);replay.destroy();
 const s=state(),n=enter(s);assert.ok(M.finishFlight(s.run,{success:false}));assert.equal(s.run.lastFatal,undefined);
 const malformed=state('bad');const m=enter(malformed);assert.ok(M.finishFlight(malformed.run,{success:false,deathPosition:{nodeId:m.id,seed:'different-run',x:.2,y:.4}}));assert.equal(malformed.run.lastFatal,undefined);
});

test('normalized marker remains stationary across viewport resizing and fades after passing within Luminance',()=>{
 const marker={nodeId:'same',seed:'seed-same',x:.4,y:.3};
 const e=flight({modifiers:{lastGlimmer:marker}});e.player.y=e.height*.3;
 const worldX=marker.x*(e.totalDistance+e.player.x);e.distance=worldX-e.player.x-45;
 const light={radius:145,intensity:1},a=lastGlimmerState(e,{light,time:1});assert.ok(a&&a.alpha>0);assert.equal(a.worldX,worldX);assert.equal(a.y,e.height*.3);
 e.distance-=30;const b=lastGlimmerState(e,{light,time:1});assert.equal(b.worldX,a.worldX);assert.equal(b.x-a.x,30);
 let width=500,height=700;const before=e.totalDistance+e.player.x;e.canvas.getBoundingClientRect=()=>({width,height});e.paused=true;e.resize();e.paused=false;
 assert.equal(e.totalDistance+e.player.x,before);e.player.y=e.height*.3;e.distance=worldX-e.player.x-45;
 const resized=lastGlimmerState(e,{light,time:1});assert.equal(resized.worldX,worldX);assert.equal(resized.y,e.height*.3);
 e.distance=worldX-e.player.x+40;const passed=lastGlimmerState(e,{light,time:1});assert.ok(passed.alpha<resized.alpha);e.distance=worldX-e.player.x+73;assert.equal(lastGlimmerState(e,{light}),null);
 e.distance=worldX-e.player.x-146;assert.equal(lastGlimmerState(e,{light}),null);
 e.distance=worldX-e.player.x-45;e.reducedMotion=true;assert.equal(lastGlimmerState(e,{light,time:1}).alpha,lastGlimmerState(e,{light,time:2}).alpha);
 const fuel=e.flame,collisions=e.collisions;let pixels=0;drawLastGlimmer(new Proxy(context,{get:(o,k)=>k==='fillRect'?()=>{pixels++;}:o[k]}),e,{light});assert.ok(pixels>0);assert.equal(e.flame,fuel);assert.equal(e.collisions,collisions);e.destroy();
});
