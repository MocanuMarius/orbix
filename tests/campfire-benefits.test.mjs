import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {createRestInspectorState} from '../dist/rest-inspector.mjs';
import {restBenefitsMarkup} from '../dist/rest-choice-view.mjs';
import {getGlowCapacity,getLifeCapacity,REST_GLOW_TUNING} from '../dist/vitality.mjs';
import {canDreamAt} from '../dist/dream.mjs';

const fixture=scenario=>createRestInspectorState(new URLSearchParams({scenario}));
const choices=s=>M.getSupportChoices(s.run,s.profile);
const resolve=(s,id)=>M.resolveSupport(s.run,choices(s).findIndex(c=>c.id===id),s.profile);
const view=s=>restBenefitsMarkup(s.run,s.run.current||s.run.map.flat().find(n=>n.id===s.run.lastRest?.nodeId),choices(s),{nextNode:M.getChoices(s.run)[0]});
const reload=s=>{let data;const store={getItem:()=>data,setItem:(_,value)=>{data=value;}};assert.ok(M.saveState(s,store));return M.loadState(store);};
const resources=r=>({lives:r.lives,flame:r.flame,capacity:getGlowCapacity(r),growth:r.restGlowCapacity,wallet:r.condensedGlow,earned:r.condensedEarned,charges:structuredClone(r.artifactCharges)});

test('Recover is unavailable only when both hearts and fuel are full; Grow remains valuable',()=>{
 const s=fixture('full'),r=s.run,before=resources(r),offers=choices(s);
 assert.equal(offers[0].disabled,true);assert.equal(offers[0].disabledReason,'Hearts and Sparks are already full.');
 assert.equal(offers[1].disabled,false);assert.equal(offers[1].effect.glowCapacity,REST_GLOW_TUNING.capacityStep);
 assert.deepEqual(offers.map(c=>c.id),['rest-recover','rest-grow']);
 assert.equal(resolve(s,'rest-recover'),false);assert.deepEqual(resources(r),before);
 assert.ok(resolve(s,'rest-grow'));assert.equal(getGlowCapacity(r),before.capacity+10);assert.equal(r.flame,getGlowCapacity(r));assert.equal(r.lives,before.lives);
 assert.match(view(s),/Capacity grown/);assert.doesNotMatch(view(s),/Hearts restored/);
});

test('fuel-only recovery stays available at the growth cap and reports only Sparks',()=>{
 let s=fixture('fuel-only'),r=s.run,capacity=getGlowCapacity(r);r.flame=capacity-.01;
 assert.equal(choices(s)[0].disabled,false,'even a partial missing Spark is a real benefit');assert.equal(choices(s)[1].disabled,true);
 assert.equal(choices(s).length,2);assert.ok(resolve(s,'rest-recover'));assert.equal(r.flame,capacity);assert.equal(r.lives,getLifeCapacity(r));
 assert.equal(r.lastRest.heartsRestored,0);assert.ok(r.lastRest.sparksRestored>0);assert.match(view(s),/Sparks refilled/);assert.doesNotMatch(view(s),/Hearts restored/);
 s=reload(s);assert.equal(s.run.lastRest.heartsRestored,0);assert.match(view(s),/Sparks refilled/);
});

test('a missing heart makes Recover useful even with full fuel and exhausted growth',()=>{
 const s=fixture('exhausted'),r=s.run;r.lives--;
 assert.equal(choices(s)[0].disabled,false);assert.equal(choices(s).length,2);assert.ok(resolve(s,'rest-recover'));
 assert.equal(r.lastRest.heartsRestored,1);assert.equal(r.lastRest.sparksRestored,0);assert.equal(r.lives,getLifeCapacity(r));assert.match(view(s),/Hearts restored/);
});

test('exhausted Rest offers a no-grant Continue and preserves preparation, seller and its single Dream route',()=>{
 let s=fixture('exhausted');const r=s.run,camp=r.current,before=resources(r),offers=choices(s),step=r.step;
 assert.deepEqual(offers.map(c=>c.id),['rest-recover','rest-grow','rest-continue']);assert.ok(offers.slice(0,2).every(c=>c.disabled));
 const arrival=view(s);assert.match(arrival,/disabled aria-label="Recover\. Hearts and Sparks are already full/);assert.match(arrival,/Maximum growth reached \(3\/3\)/);
 assert.match(arrival,/data-index="2">Continue/);assert.equal((arrival.match(/class="rest-benefit /g)||[]).length,2,'Continue is an exit, not another boon card');
 assert.equal(resolve(s,'rest-recover'),false);assert.equal(resolve(s,'rest-grow'),false);assert.equal(M.canSellArtifact(s,'glow-wick'),false);
 assert.ok(resolve(s,'rest-continue'));assert.deepEqual(resources(r),before);assert.equal(r.step,step+1);assert.equal(r.phase,'map');assert.equal(r.restReady,true);
 assert.equal(r.lifeRestClaimed,false);assert.equal(r.lastRest.boon,'skip');assert.equal(r.lastRest.heartsRestored,0);assert.equal(r.lastRest.sparksRestored,0);
 assert.equal(r.restVisits.filter(v=>v.nodeId===camp.id).length,1);assert.equal(M.resolveSupport(r,2,s.profile),false,'double tap cannot complete twice');
 const route=M.getChoices(r);assert.equal(route.length,1);assert.ok(camp.nextIds.includes(route[0].id));assert.ok(canDreamAt(r,route[0]));
 const prepared=view(s);assert.match(prepared,/Ready to continue/);assert.match(prepared,/data-action="skills"/);assert.match(prepared,/data-action="artifacts"/);assert.match(prepared,/Enter Dream/);
 assert.doesNotMatch(prepared,/Hearts restored|Sparks refilled|Capacity grown|✓ CHOSEN/);
 assert.ok(M.canBuyCheckpointSkills(s));assert.ok(M.canSellArtifact(s,'glow-wick'));assert.ok(M.sellArtifact(s,'glow-wick'));assert.equal(M.sellArtifact(s,'glow-wick'),false);
 s=reload(s);assert.equal(s.run.lastRest.boon,'skip');assert.match(view(s),/Ready to continue/);assert.equal(M.getChoices(s.run).length,1);
 assert.ok(M.selectNode(s.run,M.getChoices(s.run)[0].id));assert.ok(M.beginFlightAttempt(s.run));assert.equal(s.run.restReady,false);
});

test('stale cached camp offers and stale Continue taps are revalidated against current resources',()=>{
 const s=fixture('fuel-only'),r=s.run,camp=r.current;
 r.supportOffers={nodeId:camp.id,choices:choices(s)};r.flame=getGlowCapacity(r);
 assert.equal(M.resolveSupport(r,0,s.profile),false,'a formerly useful Recover cannot claim when full');
 assert.equal(choices(s)[0].disabled,true);assert.ok(choices(s).some(c=>c.id==='rest-continue'));
 r.lives--;assert.equal(M.resolveSupport(r,2,s.profile),false,'a stale Continue cannot skip a useful benefit');
 assert.ok(resolve(s,'rest-recover'));const before=resources(r),visited=r.restVisits.length;
 r.phase='support';r.current=camp;r.lives--;
 assert.equal(M.resolveSupport(r,0,s.profile),false,'a stale camp tab cannot grant another boon');assert.equal(r.restVisits.length,visited);assert.equal(r.flame,before.flame);
});

test('Continue never awards a tutorial Rest topic or the legacy Dream lesson grant',()=>{
 const s=fixture('exhausted'),r=s.run;r.isTutorial=true;r.practiceTopics=[];r.practiceCondensedGlow=0;delete r.skills['main-dream'];
 r.current.id='practice-dream-rest';assert.ok(resolve(s,'rest-continue'));
 assert.deepEqual(r.practiceTopics,[]);assert.equal(r.skills['main-dream'],undefined);assert.equal(r.lifeRestClaimed,false);
});
