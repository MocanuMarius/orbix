import test from 'node:test';
import assert from 'node:assert/strict';
import {ARTIFACTS,createRun,newState,getRunModifiers,selectNode,beginFlightAttempt,finishFlight,chooseFlightReward,acknowledgeVictory,advanceMap,getChoices,saveState,loadState} from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {GUARDIAN_RELICS} from '../dist/guardian-artifacts.mjs';
import {artifactDescription} from '../dist/artifact-copy.mjs';
import {artifactPixelPortrait} from '../dist/artifact-pixel-art.mjs';
import {condenseGlow} from '../dist/condensed-glow.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const legendaries=Object.keys(ARTIFACTS).filter(id=>ARTIFACTS[id].rarity==='boss');
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
function mount(...artifacts){
 const e=new WispFlight({canvas,preflight:true,seed:'relic-probe',companions:['collector'],modifiers:getRunModifiers({artifacts,companions:['collector']})});
 e.render=()=>{};e.start({paused:true});e.paused=false;
 return e;
}
function pick(e,kind='light',options={}){
 e.collect({kind,x:e.player.x+e.distance,y:e.player.y,...options});
}
function clearGuardian(s){
 const r=s.run;r.step=r.map.length-1;
 const boss=getChoices(r).find(n=>n.boss);
 assert.ok(selectNode(r,boss.id));assert.ok(beginFlightAttempt(r));assert.ok(finishFlight(r,{success:true,flame:60}));
 return r.flightReward;
}

test('each legendary can appear without discovery gates; the final guardian ends the run without another draft',()=>{
 const found=new Set();
 for(let i=0;i<360;i++){
   const s=newState();s.run=createRun(s.profile,'relic-draft-'+i);
   if(i%2)s.run.skills['main-dream']=1;
   const first=clearGuardian(s);
   assert.equal(first.offers.length,2);assert.notEqual(...first.offers);
   for(const id of first.offers){assert.equal(ARTIFACTS[id].rarity,'boss');found.add(id);}
   assert.ok(chooseFlightReward(s,first.offers[0]));assert.ok(acknowledgeVictory(s));assert.ok(advanceMap(s.run));
   const second=clearGuardian(s);assert.ok(second.offers.every(id=>!first.offers.includes(id)));
   assert.ok(chooseFlightReward(s,second.offers[0]));assert.ok(acknowledgeVictory(s));assert.ok(advanceMap(s.run));
   const final=clearGuardian(s);assert.equal(final,null);assert.equal(s.run.phase,'ended');assert.equal(s.run.success,true);
   assert.equal(chooseFlightReward(s,legendaries[0]),false,'a finished run cannot claim another artifact');
   let saved;const store={setItem:(_,v)=>saved=v,getItem:()=>saved};assert.ok(saveState(s,store));
   const loaded=loadState(store);assert.equal(loaded.run.success,true);assert.equal(loaded.run.flightReward,null);

 }
 assert.deepEqual(found,new Set(legendaries));assert.ok(found.size>=20);
 for(const [id,r] of Object.entries(GUARDIAN_RELICS)){
   const copy=artifactDescription(ARTIFACTS[id]);assert.equal(copy.effect,r.effect);assert.equal(copy.limit,r.limit);
   const portrait=artifactPixelPortrait(id);
   assert.ok(portrait.includes(`data-artifact-art="${id}"`)&&portrait.includes('data-rarity="boss"'));
 }
});

test('every new guardian reaction reaches the flight state through a real pickup, Lift or companion action',()=>{
 let e=mount('rescue-wick','pilgrims-clock','undertow-pearl');
 e.flame=10;e.time=16;e.blackHoles.active=true;e.blackHoles.rate=1;assert.ok(e.flap());
 assert.equal(glowPoints(e.flame),21);assert.ok(e.pickupRevealHoldUntil>0);
 assert.deepEqual(e.artifactEffects.guardian.uses,{'rescue-wick':1,'undertow-pearl':1,'pilgrims-clock':1});
 e.flap();assert.equal(e.artifactEffects.guardian.uses['undertow-pearl'],1);

 e=mount('salt-crown','galespun-spindle','first-light-standard');
 assert.equal(e.artifactEffects.freeLiftCount,3);
 pick(e,'cache');assert.equal(e.artifactEffects.freeLiftCount,4);
 e.flame=0;for(let i=0;i<4;i++)assert.ok(e.flap());assert.equal(e.flap(),false);
 e.gustState=()=>({active:true});pick(e);assert.equal(e.artifactEffects.storedLift,'galespun-spindle');
 assert.equal(e.artifactEffects.guardian.uses['salt-crown'],1);

 e=mount('moonwake-lens','ascent-chime','eclipse-mirror');e.flame=0;
 e.player.vy=40;pick(e);assert.ok(e.pickupRevealHoldUntil>0);
 pick(e);assert.equal(e.artifactEffects.guardian.uses['moonwake-lens'],1);
 e.player.vy=-40;e.wisp.cooldown=5;pick(e);assert.equal(e.wisp.cooldown,2);
 pick(e,'dark');e.flame=0;pick(e);assert.equal(glowPoints(e.flame),12);assert.equal(e.artifactEffects.guardian.uses['eclipse-mirror'],1);

 e=mount('threefold-chalice','twin-lanterns','stillwater-bell','beacon-chain');
 e.flame=0;pick(e,'light');pick(e,'cluster');pick(e,'cache');
 assert.ok(e.artifactEffects.guardian.pendingChalice);assert.equal(e.artifactEffects.sightUntil,5);
 e.flame=20;assert.ok(e.flap());assert.equal(glowPoints(e.flame),12);
 e.time=1.3;e.flame=0;pick(e);assert.equal(glowPoints(e.flame),12);
 pick(e);assert.equal(glowPoints(e.flame),24);assert.equal(e.artifactEffects.guardian.uses['stillwater-bell'],1);

 e=mount('restless-feather','relay-moth');e.wisp.cooldown=7;
 for(let i=0;i<5;i++)assert.ok(e.flap());assert.equal(e.wisp.cooldown,3);
 e.flame=0;pick(e,'light',{deliveredByWisp:true});pick(e,'light',{deliveredByWisp:true});
 assert.equal(glowPoints(e.flame),18);
});

test('guardian passive modifiers influence real systems and generated Sparks cannot charge relics',()=>{
 const e=mount('black-atlas','storm-keel','sunken-vault','twin-lanterns','beacon-chain','eclipse-mirror','threefold-chalice');
 assert.equal(e.mod.driftSense,2);assert.equal(e.mod.lightRadius,170);assert.ok(e.getFlightProjection());
 assert.equal(e.mod.gravity,1.1);assert.equal(e.mod.windSensitivity,.6);
 assert.equal(condenseGlow(20,{rules:e.mod.condensationRules}).amount,4);
 for(const kind of ['light','light','cluster','cache'])pick(e,kind,{generated:true});
 assert.equal(e.artifactEffects.guardian.pendingChalice,false);assert.equal(e.artifactEffects.sightUntil,0);
 assert.deepEqual(e.artifactEffects.guardian.uses,{});
});

test('Threefold Chalice uses the three current strengths, and Twin Lanterns matches actual fuel rather than names',()=>{
 const chalice=mount('threefold-chalice');
 pick(chalice,'light');pick(chalice,'cluster');
 assert.equal(chalice.artifactEffects.guardian.pendingChalice,false);
 pick(chalice,'cache');assert.equal(chalice.artifactEffects.guardian.pendingChalice,true);
 chalice.flame=30;assert.ok(chalice.flap());
 assert.equal(chalice.artifactEffects.guardian.pendingChalice,false);
 assert.equal(chalice.artifactEffects.guardian.uses['threefold-chalice'],1);
 assert.equal(glowPoints(chalice.flame),15);chalice.destroy();
 const twins=mount('twin-lanterns');twins.flame=0;
 pick(twins,'light');pick(twins,'cluster',{sparkMass:1});
 assert.equal(twins.artifactEffects.guardian.uses['twin-lanterns'],1);
 assert.equal(glowPoints(twins.flame),18,'two 6-Spark pickups match and restore 6 more');
 twins.flame=twins.maxFlame;pick(twins,'cluster');pick(twins,'cluster');
 assert.equal(twins.artifactEffects.guardian.uses['twin-lanterns'],1,'a full meter does not spend a use');
 twins.flame=0;pick(twins,'light');pick(twins,'cache');
 assert.equal(twins.artifactEffects.guardian.uses['twin-lanterns'],1,'different fuel strengths do not match');
 twins.flame=0;pick(twins,'cache');
 assert.equal(twins.artifactEffects.guardian.uses['twin-lanterns'],2);
 assert.equal(glowPoints(twins.flame),24);twins.destroy();
});

test('Night Gardener heals only real near misses, never overflow, and pays for five separate seeds',()=>{
 const e=mount('night-gardener');e.flame=0;e.layout.obstacles=[];
 let serial=0;
 const seed=(offset)=>({id:++serial,kind:'dark',harmful:true,x:e.distance+e.player.x-2,y:e.player.y+offset});
 const skim=(p)=>{e.getNearbyPickups=()=>[p];e.step(.001);};
 const first=seed(41);skim(first);assert.equal(glowPoints(e.flame),6);skim(first);assert.equal(e.nightGardenCount,1);
 skim(seed(92));assert.equal(e.nightGardenCount,1);
 e.flame=e.maxFlame;skim(seed(41));assert.equal(e.nightGardenCount,1);assert.equal(e.condensedGlow,0);
 e.flame=0;skim(seed(0));assert.equal(e.nightGardenCount,1);assert.ok(e.lightPenalties.length);
 for(let i=0;i<8;i++)skim(seed(41));
 assert.equal(glowPoints(e.flame),24);assert.equal(e.nightGardenCount,5);
});
