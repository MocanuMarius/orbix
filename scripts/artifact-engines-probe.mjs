import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {ARTIFACT_ENGINE_RULES} from '../dist/artifact-effects.mjs';
import {ARTIFACTS,getRunModifiers,getArtifactCapacity} from '../dist/model.mjs';
import {attachDream} from '../dist/dream.mjs';
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:844,height:390})};
let id=0;const engines=[];
function make(role='collector',modifiers={},flame=100){
 const e=new WispFlight({canvas,seed:'artifact-engines',duration:102,companions:[role],flame,modifiers});
 e.running=true;e.render=()=>{};e.layout.obstacles=[];e.layout.embers=[];e.drafts.zones=[];engines.push(e);return e;
}
function pick(e,kind='light',extra={}){const packet={id:++id,kind,x:e.distance+e.player.x,y:e.player.y,...extra};e.collect(packet);return packet;}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const mods=(...ids)=>Object.assign({},...ids.map(id=>ARTIFACTS[id].modifiers));
for(const id of ['overflow-coil','echo-bell','dawn-loom','sunspool'])assert.ok(ARTIFACT_ENGINE_RULES[id]?.limits);

// A three-slot chain works through shared events, without requiring a recipe.
const chain=make('collector',mods('overflow-coil','dawn-loom','sunspool'));chain.wisp.cooldown=5;
const packet=pick(chain,'cache');close(chain.wisp.cooldown,3);close(chain.artifactEffects.overflowUsed,2);
assert.equal(chain.artifactEffects.sightUntil,1.5);assert.equal(chain.artifactEffects.freeLift,true);
assert.deepEqual(chain.artifactEffects.procCounts,{'overflow-coil':1,'echo-bell':0,'dawn-loom':1,sunspool:1});
chain.collect(packet);close(chain.wisp.cooldown,3);assert.equal(chain.artifactEffects.liftGrants,1,'A packet can only trigger once');
chain.time=.25;assert.ok(chain.getLightState().forwardLight.active);chain.time=1.51;assert.equal(chain.getLightState().forwardLight.active,false);
chain.flame=0;assert.equal(chain.getState().canAffordFlap,true);assert.equal(chain.getState().flapCost,0);
assert.equal(chain.flap(),true);assert.equal(chain.flame,0);assert.equal(chain.artifactEffects.freeLift,false);assert.equal(chain.flap(),false);

// Overflow counts useful seconds, shares the fleet recovery, and stops at its cap.
const coil=make('collector',mods('overflow-coil'));pick(coil,'cache');assert.equal(coil.artifactEffects.overflowUsed,0);
coil.wisp.cooldown=.25;pick(coil,'cache');close(coil.artifactEffects.overflowUsed,.25);
for(let i=0;i<10;i++){coil.wisp.cooldown=5;pick(coil,'cache');}close(coil.artifactEffects.overflowUsed,12);
coil.wisp.cooldown=5;pick(coil,'cache');close(coil.wisp.cooldown,5);
for(const role of ['protector','swift','leveler']){
 const e=make(role,mods('overflow-coil','dawn-loom'));
 if(role==='protector'){e.shield.charges=0;e.shield.recovery=5;}
 if(role==='swift')e.fleet[0].cooldown=5;
 if(role==='leveler'){e.levelCharge=0;e.fleet[0].cooldown=e.roleCooldown('leveler');}
 pick(e,'cache');close(e.artifactEffects.overflowUsed,2);assert.equal(e.artifactEffects.sightUntil,1.5);
 if(role==='protector')close(e.shield.recovery,3);
 if(role==='swift')close(e.fleet[0].cooldown,3);
 if(role==='leveler')close(e.levelCharge,2*e.roleDuration('leveler')/e.roleCooldown('leveler'));
}

// Every role can prime Echo Bell. Only the next direct positive fuel spends it.
for(const role of ['collector','protector','swift','leveler']){
 const e=make(role,{...mods('echo-bell'),mainKindler:true,kindlerBonus:6});
 if(role==='collector')pick(e,'light',{deliveredByWisp:true});
 if(role==='protector')e.hit(null);
 if(role==='swift')assert.equal(e.activateAbility(),true);
 if(role==='leveler'){e.beginLiftInput();e.time=.2;e.updateLeveler(1/60);}
 assert.ok(e.artifactEffects.workUntil>e.time,role+' must prime Echo Bell');
 e.flame=0;pick(e,'light',{deliveredByWisp:true});assert.equal(e.flame,24);assert.equal(e.artifactEffects.workUses,0);
 e.flame=0;pick(e);assert.equal(e.flame,38,'Bell and Kindled Touch combine');assert.equal(e.artifactEffects.workUses,1);
 e.flame=0;pick(e);assert.equal(e.flame,30,'Charge does not stack');
 e.artifactEffects.onWork();e.time=e.artifactEffects.workUntil+.01;e.flame=0;pick(e);assert.equal(e.flame,30,'Work charge expires');
 for(let i=0;i<8;i++){e.artifactEffects.onWork();pick(e);}assert.equal(e.artifactEffects.workUses,5);
}

// Utility charge and existing Dreamcatcher feed Dawn Loom. Passive time does not.
const loom=make('swift',mods('dawn-loom'));pick(loom,'charge');assert.equal(loom.artifactEffects.sightUntil,0);
loom.activateAbility();pick(loom,'charge');assert.equal(loom.artifactEffects.sightUntil,1.5);
loom.time=2;loom.fleet[0].cooldown=5;pick(loom,'charge');assert.equal(loom.artifactEffects.sightUntil,1.5);
loom.time=4;loom.fleet[0].cooldown=5;pick(loom,'charge');assert.equal(loom.artifactEffects.sightUntil,5.5);
loom.time=9;loom.step(1/60);assert.equal(loom.artifactEffects.sightUntil,5.5,'Natural ticking never creates light');
const dreamLoom=make('swift',mods('dreamcatcher','dawn-loom'));dreamLoom.dream={active:true,freeGlow:true};
dreamLoom.fleet[0].cooldown=5;pick(dreamLoom);close(dreamLoom.fleet[0].cooldown,3.5);assert.equal(dreamLoom.artifactEffects.sightUntil,1.5);

// Sunspool accepts different temporary-light sources, never dusk or generated fuel.
for(const source of ['pickupReveal','mainSeer','sight','secondDawn']){
 const e=make('leveler',{...mods('sunspool'),...(source==='sight'?{}:{[source]:true})});
 if(source==='sight')pick(e,'sight');if(source==='secondDawn')e.dreamCompleted=true;
 pick(e);assert.equal(e.artifactEffects.freeLift,true,source+' should charge Sunspool');
 e.dream={freeGlow:true};e.flap();assert.equal(e.artifactEffects.freeLift,true,'Dream does not spend a stored Lift');delete e.dream;
 e.flap();assert.equal(e.artifactEffects.freeLift,false);pick(e);assert.equal(e.artifactEffects.freeLift,false,'Four-second recovery');
 for(let i=1;i<7;i++){e.time=i*5;if(source==='sight')e.sightUntil=e.time+6;if(source==='secondDawn')e.revealFromPickup(true);pick(e);e.flap();}
 assert.equal(e.artifactEffects.liftGrants,4,'At most four grants per flight');
}
const held=make('leveler',{...mods('sunspool'),pickupReveal:true});pick(held);held.beginLiftInput();held.time=.2;
const charge=held.levelCharge;held.updateLeveler(.25);close(held.levelCharge,charge-.25);assert.equal(held.artifactEffects.freeLift,false,'Free Lift does not sustain held levitation');
for(const [kind,extra] of [['light',{generated:true}],['dusk',{}],['dark',{}]]){
 const e=make('collector',{...mods('overflow-coil','echo-bell','dawn-loom','sunspool'),pickupReveal:true});
 e.wisp.cooldown=5;e.artifactEffects.onWork();pick(e,kind,extra);
 assert.equal(e.artifactEffects.overflowUsed,0);assert.equal(e.artifactEffects.workUses,0);assert.equal(e.artifactEffects.liftGrants,0);
}

// A saved Dream replays artifact state too, and a fresh attempt resets the caps.
const dreamMods={...mods('echo-bell','dawn-loom','sunspool'),dreamDuration:4,pickupReveal:true};
function dreamEngine(){const e=make('swift',dreamMods,100);e.layout.embers=[{id:'dream-light',kind:'cache',x:e.distance+e.player.x+10,y:e.player.y}];return e;}
const record=dreamEngine();let ready;attachDream(record,{onReady:result=>ready=result});
for(let frame=0;frame<240;frame++){if(frame===0)record.activateAbility();if([3,85,167].includes(frame))record.flap();record.step(1/60);}
assert.ok(ready?.valid);assert.equal(record.artifactEffects.freeLift,true);
const replay=dreamEngine();assert.ok(attachDream(replay,{mode:'replay',preset:ready.preset}));for(let frame=0;frame<240;frame++)replay.step(1/60);
assert.deepEqual(replay.artifactEffects.state,record.artifactEffects.state);assert.equal(replay.flame,record.flame);assert.equal(replay.player.y,record.player.y);
replay.dream.resume();replay.flap();assert.equal(replay.artifactEffects.freeLift,false);
const fresh=make('collector',mods('overflow-coil','echo-bell','dawn-loom','sunspool'));assert.equal(fresh.artifactEffects.overflowUsed,0);assert.equal(fresh.artifactEffects.freeLift,false);

// Boss relics use the same engines at their advertised magnitudes, and all six
// mounted slots contribute once while the shared event caps remain unchanged.
const bossMod=(artifacts,skills={})=>getRunModifiers({difficulty:1,artifacts,skills,companions:['swift']});
const heart=make('swift',bossMod(['sunheart-engine']));heart.fleet[0].cooldown=5;pick(heart);
close(heart.fleet[0].cooldown,3);assert.equal(heart.artifactEffects.sightUntil,2);assert.equal(heart.artifactEffects.state.proc.id,'sunheart-engine');
const sovereign=make('swift',bossMod(['dream-sovereign']));sovereign.dream={active:true,freeGlow:true};sovereign.fleet[0].cooldown=5;pick(sovereign);
close(sovereign.fleet[0].cooldown,2.5);assert.equal(sovereign.mod.lightRadius,210);assert.equal(sovereign.artifactEffects.freeLift,false,'Permanent light alone cannot feed Sunspool');
sovereign.dream.active=sovereign.dream.freeGlow=false;sovereign.dreamCompleted=true;pick(sovereign);
assert.equal(sovereign.secondDawnUsed,true);assert.equal(sovereign.artifactEffects.freeLift,true);assert.equal(sovereign.artifactEffects.state.proc.id,'dream-sovereign');
const covenant=make('swift',bossMod(['hollow-covenant']));close(covenant.flapCost,6.3);covenant.activateAbility();covenant.flame=0;pick(covenant);close(covenant.flame,36);
covenant.flame=0;covenant.layout.embers=[{id:'covenant-seed',kind:'dark',x:covenant.distance+covenant.player.x-10,y:covenant.player.y+45}];covenant.step(1/60);close(covenant.flame,6);
const six={difficulty:1,artifacts:['sunheart-engine','dream-sovereign','hollow-covenant','overflow-coil','echo-bell','dawn-loom'],
 skills:{'main-artifact-slot-1':1,'main-artifact-slot-2':1,'main-artifact-slot-3':1},companions:['swift']};
assert.equal(getArtifactCapacity(six),6);const combined=make('swift',getRunModifiers(six));close(combined.mod.overflowRecharge,.2);assert.equal(combined.mod.workFuel,20);
combined.activateAbility();combined.flame=0;pick(combined);close(combined.flame,48,'Combined Echo bonus caps at16');
combined.flame=100;pick(combined);assert.equal(combined.artifactEffects.sightUntil,3,'Combined forward light caps at3s');assert.equal(combined.artifactEffects.freeLift,true);
assert.deepEqual(combined.mod.artifactEngineSources['overflow-coil'],['sunheart-engine','overflow-coil']);
for(const e of engines)e.destroy();
console.log('Artifact engines: four roles, shared-trigger combinations, actual recharge, caps, exclusions, free Lift, temporary-light sources, deterministic Dream/retry and catalog contract passed.');
