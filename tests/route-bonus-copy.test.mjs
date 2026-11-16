import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,takeClearRewardReceipt} from '../dist/model.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {routeBonusNoteText,routeBonusReceiptText} from '../dist/route-bonus-copy.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {landscapeRouteView} from '../dist/landscape-map.mjs';
import {rewardEarningsDetailMarkup} from '../dist/reward-screen.mjs';
import {boonMarkup,updateBonusGauge} from '../dist/route-bonus-ui.mjs';

test('legacy challenge receipt copy preserves its earned effect and leaves other rewards intact',()=>{
 for(const [message,effect] of [
  ['Wayfinder · Preview the opening 2.5s before takeoff for your next 3 clears.','Preview the opening 2.5s before takeoff for your next 3 clears.'],
  ['Wild Circuit completed. Companion recovery 20% faster for 3 cleared flights.','Companion recovery 20% faster for 3 cleared flights.'],
  ['Heartwood Trail · +3 maximum Sparks permanently','+3 maximum Sparks permanently'],
  ['Pilgrim Precision · +8 Stored Sparks','+8 Stored Sparks'],
  ['Three Suns · one heart restored','one heart restored'],
 ])assert.equal(routeBonusReceiptText({message}),effect);
 assert.equal(routeBonusReceiptText({message:'Wayfinder challenge completed.',amount:5}),'+5 Stored Sparks');
 assert.equal(routeBonusReceiptText({id:'wild-circuit'}),'');
 assert.equal(routeBonusNoteText('Wayfinder Seed · Collector searches farther.'),'Wayfinder Seed · Collector searches farther.');
 assert.equal(routeBonusNoteText('Growth Ring · +3 maximum Sparks permanently'),'Growth Ring · +3 maximum Sparks permanently');
 const run={lastFlight:{routeBonus:{id:'wild-circuit',name:'Heartwood Trail',message:'Heartwood Trail · +3 maximum Sparks permanently'}}};
 const detail=rewardEarningsDetailMarkup(run);
 assert.match(detail,/\+3 maximum Sparks permanently/);assert.doesNotMatch(detail,/Heartwood Trail|Companion recovery/);
});

test('stored clear receipt notes are cleaned on a copy, without changing the save-owned data',()=>{
 const run={phase:'map',clearRewardReceipt:{amount:8,notes:['Pilgrim Precision · +8 Stored Sparks','Wayfinder challenge completed.','Growth Ring · +3 maximum Sparks permanently']}};
 const stored=run.clearRewardReceipt,notes=[...stored.notes],receipt=takeClearRewardReceipt(run);
 assert.deepEqual(receipt.notes,['+8 Stored Sparks','Growth Ring · +3 maximum Sparks permanently']);
 assert.deepEqual(stored.notes,notes);assert.equal(run.clearRewardReceipt,undefined);
});

test('all guide variants show one condition below Optional and one payoff, with no title',()=>{
 const state=newState(),run=createRun(state.profile,'challenge-copy'),node=run.map.flat().find(n=>n.type==='flight');
 for(const bonus of Object.values(ROUTE_BONUSES))for(const guideArt of [null,'waystone','rootwood','night-atlas']){
  const html=flightPreviewMarkup(run,node,{available:true,bonus,guideArt});
  assert.ok(html.includes(`<h3 id="preview-optional">Optional</h3></div>\n     <p class="preview-condition">${bonus.condition}</p>`));
  assert.equal(html.split(bonus.condition).length-1,1);assert.equal(html.split(bonus.reward).length-1,1);
  assert.ok(!html.includes(bonus.name));assert.doesNotMatch(html,/preview-goal-title[^]*?<strong>|preview-claim/);
 }
 assert.doesNotMatch(flightPreviewMarkup(run,node),/preview-optional|Optional challenge|preview-mark-help/);
 node.bonusId='wayfinder';const view=landscapeRouteView(run);
 assert.ok(!JSON.stringify(view).includes('Wayfinder'));assert.ok(JSON.stringify(view).includes(ROUTE_BONUSES.wayfinder.condition));
 assert.doesNotMatch(boonMarkup({'wild-circuit':2}),/Wild Circuit/);
});

test('HUD status handles missed, met, fractional progress and an exit condition without a challenge name',()=>{
 const el={dataset:{},hidden:true,setAttribute(k,v){this[k]=v;}};
 for(const phase of [{progress:1},{progress:3,complete:true},{progress:1,failed:true}]){
  updateBonusGauge(el,{id:'wayfinder',eligible:true,...phase});
  assert.doesNotMatch(el['aria-label'],/Wayfinder/);assert.match(el['aria-label'],/Optional challenge/);
 }
 if(ROUTE_BONUSES['reserve-finish']){
  updateBonusGauge(el,{id:'reserve-finish',eligible:true,progress:6,current:7.2,waitingForExit:true});
  assert.match(el.innerHTML,/6 Sparks at exit/);assert.doesNotMatch(el.innerHTML,/✓/);assert.match(el['aria-label'],/Currently 7.2 Sparks/);
  updateBonusGauge(el,{id:'draft-rider',eligible:true,progress:.3333,unit:'s'});assert.match(el.innerHTML,/0.3\/0.5s/);
 }
 updateBonusGauge(el,{id:'wayfinder',eligible:false});assert.equal(el.hidden,true);
});
