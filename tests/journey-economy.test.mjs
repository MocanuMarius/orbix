import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {MAP_STOP_COUNT} from '../dist/route-recipes.mjs';
import {getFlightPackingLimit} from '../dist/condensed-glow.mjs';
import {FLIGHT_PACTS,pactOffers,pactOfOath} from '../dist/flight-pacts.mjs';
import {oathReward} from '../dist/oaths.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
import {LIGHT_PACKET_TUNING} from '../dist/vitality.mjs';
import {rewardEarnings,rewardEarningsDetailMarkup} from '../dist/reward-screen.mjs';
const game=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};

test('every ten-stop route crosses three additional flights and Rests retain one dreamable exit',()=>{
 for(let seed=0;seed<45;seed++){
  const s=game('long-journey-'+seed),r=s.run;
  for(let map=0;map<3;map++){
   assert.equal(r.map.length,MAP_STOP_COUNT);const nodes=new Map(r.map.flat().map(n=>[n.id,n]));
   for(const n of nodes.values()){
    assert.ok(n.encounterStage>=0&&n.encounterStage<=6);
    assert.ok(n.nextIds.every(id=>nodes.get(id)?.row===n.row+1));
    if(n.kind==='camp'){assert.equal(n.nextIds.length,1);assert.notEqual(nodes.get(n.nextIds[0]).type,'support');}
   }
   const walk=(n,extra,elite)=>{
    if(elite&&n.elite)return;
    extra+=Number(n.extraFlight);
    if(n.boss){assert.equal(extra,3);return;}
    assert.ok(n.nextIds.length);n.nextIds.forEach(id=>walk(nodes.get(id),extra,n.type==='support'?elite:n.elite));
   };
   r.map[0].forEach(n=>walk(n,0,false));
   let data;const storage={getItem:()=>data,setItem:(_,v)=>data=v};M.saveState(s,storage);assert.equal(M.loadState(storage).run.map.length,10);
   if(map<2){r.phase='map-clear';assert.ok(M.advanceMap(r));}
  }
 }
});

test('natural overflow is limited to twenty; specialized storage expands that ceiling',()=>{
 const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
 for(const [skills,limit]of [[{},20],[{'main-afterglow':1},30],[{'main-afterglow':1,'afterglow-vessel':2,'afterglow-retention':2},50]]){
  assert.equal(getFlightPackingLimit(skills),limit);
  const e=new WispFlight({canvas,preflight:true,seed:'packing-ceiling',modifiers:M.getRunModifiers({skills,companions:['collector']})});
  for(let i=0;i<60;i++)e.collect({id:i,kind:'cache',sparkMass:3,x:e.player.x,y:e.player.y});
  assert.equal(e.condensedGlow,limit);assert.equal(e.condensedRemainder,0);assert.ok(e.pickupOverflow>0);e.destroy();
 }
});

function visitPact(index){
 const s=game('pact-'+index),r=s.run,next=r.map[1][0];
 const event={...r.map[0][0],type:'support',kind:'event',eventIndex:index,nextIds:[next.id]};r.map[0]=[event];
 assert.ok(M.selectNode(r,event.id));return s;
}
test('wagers apply one declared handicap to the next flight only and pay a flat prize on a clear, with no stacking or replay income',()=>{
 for(const index of [1,7,8])for(const success of [true,false]){
  const s=visitPact(index),r=s.run,offers=M.getSupportChoices(r),oath=offers[0].effect.oath,id=pactOfOath(oath),pact=FLIGHT_PACTS[id];
  assert.equal(offers.length,2);assert.ok(M.resolveSupport(r,0));assert.equal(r.pendingOath.id,oath);assert.equal(r.pendingTemporary,undefined);
  assert.equal(pactOffers({...r,current:{eventIndex:index}}),null,'one wager at a time');
  if(id==='blind-pilgrim')r.skills['main-sight']=1;
  const baseline=M.getRunModifiers({...r,pendingOath:undefined}),mod=M.getRunModifiers(r);
  if(pact.sight)assert.equal(mod.lightRadius,id==='blind-pilgrim'?LIGHT_PACKET_TUNING.baseRadius*pact.sight:baseline.lightRadius*pact.sight);
  if(id==='blind-pilgrim'){assert.equal(mod.closedEye,true);assert.equal(mod.cardLuminancePercent,0);}
  if(pact.reach)assert.equal(mod.attract,baseline.attract*pact.reach);
  assert.ok(M.selectNode(r,M.getChoices(r)[0].id));const clear=getFlightClearReward(r.current,r),wallet=r.condensedGlow,prize=oathReward(r,oath);
  assert.ok(M.beginFlightAttempt(r));assert.equal(r.attemptEntry.flightPact,id);assert.equal(r.pendingOath,undefined,'the flight takes the wager');
  assert.ok(M.finishFlight(r,{success,flame:70,condensedGlow:10}));M.settleCheckpoint(s);
  assert.equal(r.condensedGlow,wallet+(success?clear+13+prize:0));
  assert.equal(M.finishFlight(r,{success:true,condensedGlow:999}),false);
  assert.equal(r.pendingOath,undefined,'gone after that one flight, won or not');
  if(success)assert.equal(r.lastFlight.pactBonus,prize);
 }
 const s=visitPact(1);assert.ok(M.resolveSupport(s.run,1));assert.equal(s.run.pendingOath,undefined);assert.equal(s.run.pendingTemporary,undefined);
});

test('a won Closed Eye wager is a flat prize, not a multiple of packing',()=>{
 const s=visitPact(7),r=s.run;
 r.skills={'main-afterglow':1,'afterglow-vessel':2,'afterglow-retention':2};
 assert.ok(M.resolveSupport(r,0));assert.ok(M.selectNode(r,M.getChoices(r)[0].id));
 const wallet=r.condensedGlow,clear=getFlightClearReward(r.current,r),prize=oathReward(r,'closed-eye');assert.ok(M.beginFlightAttempt(r));
 assert.ok(M.finishFlight(r,{success:true,flame:100,condensedGlow:999}));
 const f=r.lastFlight,packed=f.pickupCondensedGlow+f.exitPacking.amount;
 assert.equal(f.pickupCondensedGlow,50,'the wager does not uncap ordinary overflow packing');
 assert.equal(f.pactBonus,prize);
 assert.equal((r.pendingRewards.length?r.pendingRewards:r.lastCheckpointReward.rewards).find(reward=>reward.kind==='flight-pact').amount,prize);
 assert.equal(f.completionBonus,clear,'clear pay remains separate');
 M.settleCheckpoint(s);
 const earned=f.completionBonus+packed+prize;
 assert.equal(r.condensedGlow,wallet+earned);assert.equal(f.securedCondensedGlow,earned);
 assert.equal(rewardEarnings(r).rows.find(row=>row.label==='Pact').amount,prize);
 assert.equal(rewardEarnings(r).total,earned);
 assert.ok(rewardEarningsDetailMarkup(r).includes('<dd>+'+prize+'</dd>'));
 const balance=r.condensedGlow;assert.equal(M.finishFlight(r,{success:true,condensedGlow:999}),false);
 M.settleCheckpoint(s);assert.equal(r.condensedGlow,balance);
});

test('a fresh profile can receive legendary relics without discovery, ascension or skill gates',()=>{
 const r=game('fresh-relics').run;r.unlockedArtifacts=[];
 assert.equal(r.difficulty,1);assert.ok(M.artifactFitsRun(r,'dream-sovereign'));assert.ok(M.artifactFitsRun(r,'dawn-loom'));
 const elite=M.availableFlightArtifacts(r,{elite:true,mapIndex:0});
 assert.ok(elite.includes('sunheart-engine'));assert.ok(elite.includes('dream-sovereign'));
 const boss=M.availableFlightArtifacts(r,{boss:true,mapIndex:0});assert.ok(boss.length>=20);
 r.seenArtifacts=[...boss];assert.ok(M.availableFlightArtifacts(r,{boss:true,mapIndex:0}).length>=20,'rejected offers cycle after unseen choices run out');
 assert.equal(M.artifactFitsRun(r,'iron-petal'),false,'irrelevant companion-only effects remain excluded');
});

test('targeting preferences require their cheap skill and only switch at checkpoints',()=>{
 const s=game('collector-targeting'),r=s.run;r.condensedGlow=1000;
 assert.equal(M.setCollectorPreference(r,'dense'),false);
 r.skills={'collector-attunement':1,'collector-fetch-large':1};
 assert.ok(M.buyCheckpointSkill(s,'collector-target-dense'));assert.ok(M.setCollectorPreference(r,'dense'));
 assert.equal(M.getRunModifiers(r).collectorPreference,'dense');
 assert.ok(M.selectNode(r,M.getChoices(r)[0].id));assert.ok(M.beginFlightAttempt(r));
 assert.equal(M.setCollectorPreference(r,'nearest'),false);
});

test('Collector targeting changes eligible selection while preserving body pickup priority',()=>{
 const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
 for(const preference of ['nearest','dense']){
  const run={skills:{'collector-fetch-large':1,'collector-target-dense':1},companions:['collector'],collectorPreference:preference};
  const e=new WispFlight({canvas,preflight:true,seed:'target-pick',companions:['collector'],modifiers:M.getRunModifiers(run)});
  const cache={id:'cache',kind:'cache',sparkMass:3,x:e.distance+e.player.x-51,y:e.player.y};
  const light={id:'light',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y};
  const ahead={id:'body-first',kind:'cache',sparkMass:3,x:e.distance+e.player.x+20,y:e.player.y};
  e.layout.embers=[cache,light,ahead];e.getNearbyPickups=()=>e.layout.embers;e.collectorContains=()=>true;
  e.time+=1/60;e.wisp.update(e,1/60);
  assert.equal(e.wisp.target?.id,preference==='dense'?'cache':'light');e.destroy();
 }
});

test('Kindled Guard repairs only a spent Guard and body pickups, with no overflow benefit',()=>{
 const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
 const e=new WispFlight({canvas,preflight:true,seed:'guard-repair',modifiers:M.getRunModifiers({skills:{'collector-last-orbit':1,'collector-guard-repair':1},companions:['collector']})});
 e.wisp.spendGuard(e);const cooldown=e.wisp.cooldown;
 e.collect({kind:'light',x:e.player.x,y:e.player.y});assert.equal(e.wisp.cooldown,cooldown-2);
 e.collect({kind:'light',x:e.player.x,y:e.player.y,deliveredByWisp:true});assert.equal(e.wisp.cooldown,cooldown-2);
 assert.equal(M.SKILLS['collector-last-orbit'].requires,null);e.destroy();
});
