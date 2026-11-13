import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {normalizeCompanionFleet} from '../dist/companion-abilities.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {mainWispTreeMarkup} from '../dist/wisp-tree.mjs';

function engine(options={}){
 const context=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 return new WispFlight({canvas:{style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})},seed:'single-companion-onboarding',terrain:'canopy',duration:40,flame:100,...options});
}

test('normal, TEST and saved rosters contain exactly one companion; swaps preserve one slot',()=>{
 assert.deepEqual(normalizeCompanionFleet(['swift','protector','collector']),['swift']);
 assert.deepEqual(normalizeCompanionFleet(['invalid','runner','collector']),['swift']);
 assert.deepEqual(normalizeCompanionFleet([], 'space-timer'),['leveler']);
 const state=M.newState();state.profile.difficulty=4;state.run=M.createRun(state.profile,'one-companion',1);
 const run=state.run;run.testMode=true;run.skills['main-bond']=2;
 assert.equal(M.getCompanionCapacity(run),1);
 assert.equal(M.setCompanions(run,['protector','collector']),false);
 for(const id of ['protector','swift','leveler','collector']){
  assert.equal(M.setCompanions(run,[id]),true);assert.deepEqual(run.companions,[id]);assert.equal(run.companionRole,id);
 }
 assert.equal(M.SKILLS['main-bond'],undefined);
 assert.equal(M.SKILLS['main-artifact-slot-1'],undefined,'artifact slot upgrades are retired');
 let key,saved;const storage={setItem(k,v){key=k;saved=v;},getItem(){return saved;}};
 M.saveState(state,storage);let legacy=JSON.parse(saved);
 legacy.run.companions=['protector','swift','collector'];legacy.run.companionRole='protector';legacy.run.skills['main-bond']=2;
 legacy.settings.companions=['leveler','collector'];saved=JSON.stringify(legacy);
 const restored=M.loadState(storage);assert.ok(key);assert.deepEqual(restored.run.companions,['protector']);
 assert.deepEqual(restored.settings.companions,['leveler']);assert.equal(restored.run.skills['main-bond'],undefined);
});

test('only the equipped companion contributes companion skills or earns companion-specific offers',()=>{
 const skills={'collector-reach':1,'swift-resistance':1,'swift-mastery':1};
 const single=M.getRunModifiers({companions:['collector'],skills});
 const legacy=M.getRunModifiers({companions:['collector','swift'],skills});
 assert.equal(single.swiftRecovery,7.5);assert.equal(single.swiftResistance,.72);
 assert.equal(legacy.swiftRecovery,single.swiftRecovery);assert.equal(legacy.swiftResistance,single.swiftResistance);
 assert.equal(legacy.attract,single.attract);
 assert.equal(M.artifactFitsRun({companions:['collector','swift']},'storm-knot'),false);
 assert.equal(M.artifactFitsRun({companions:['collector','swift']},'wayfinder-seed'),true);
});

test('the engine has one visible orb and cannot activate a second companion from malformed options',()=>{
 const active=engine({companions:['swift','protector','collector']}),passive=engine({companions:['collector','swift']});
 try{
  assert.deepEqual(active.options.companions,['swift']);assert.equal(active.fleet.length,1);
  assert.deepEqual(active.getCompanionStates().map(s=>s.role),['swift']);assert.equal(active.getShieldState().enabled,false);
  active.running=true;assert.equal(active.activateAbility(),true);assert.equal(active.boosts,1);assert.equal(active.fleet[0].role,'swift');
  passive.running=true;assert.equal(passive.activateAbility(),false);assert.equal(passive.boosts,0);
 }finally{active.destroy();passive.destroy();}
});

test('first-flight content flags remove advanced distractions and gently widen actual passages',()=>{
 const first=engine({modifiers:{onboardingPlan:{enabled:true,gentleOpening:true,drafts:false,interactiveScenery:false,specialSparks:false,badSparks:false,blackHoles:false}}});
 const ordinary=engine();
 try{
  assert.ok(first.layout.embers.length>0);
  assert.ok(first.layout.embers.every(p=>getPickupSpec(p).fuel>0&&getPickupSpec(p).dim===0));
  assert.equal(first.drafts.zones.length,0);assert.equal(first.biomeDynamics.items.length,0);assert.equal(first.blackHoles.items.length,0);
  assert.ok(first.layout.obstacles.every(o=>o.motion===0));
  assert.ok(first.layout.obstacles[0].gap>ordinary.layout.obstacles[0].gap);
  assert.ok(ordinary.blackHoles.items.length>0,'default remains the full game');
 }finally{first.destroy();ordinary.destroy();}
});

test('the introductory skill view shows three basic branches and hides distant capacity content',()=>{
 const state=M.newState();state.run=M.createRun(state.profile,'intro-skills');const run=state.run;
 const html=mainWispTreeMarkup({run,wallet:M.getSkillWallet(state),canBuy:true,intro:true});
 assert.match(html,/LIGHT/);assert.match(html,/MOTION/);assert.match(html,/SPARKS/);
 assert.doesNotMatch(html,/BONDS|main-bond|main-artifact-slot-1|main-vast-vessel/);
});
