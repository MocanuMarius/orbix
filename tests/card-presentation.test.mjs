import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardExecution,resolveCardRow,makeSkillCard,CARD_ROW_EVENTS} from '../dist/skill-cards.mjs';
import {productiveCardSources,cardRowTraceMarkup,createCardRowFeedback} from '../dist/card-row-feedback.mjs';

const row=ids=>createCardExecution(ids.map((id,index)=>id?makeSkillCard(id,'presentation:'+index):null));
test('flight portraits reflect successful acting slots and one productive replay',()=>{
 const trace=resolveCardRow(row(['harvest-rare','prism-lens','refrain']),{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
 assert.deepEqual(productiveCardSources(trace),{sources:[{slot:0,cardId:'harvest-rare'},{slot:1,cardId:'prism-lens'}],replayed:true});
 assert.equal(trace.passes,2);assert.equal(trace.sparks,6); // whole Sparks: each firing rounds up
});
test('empty checks and an unproductive replay never invent a portrait or replay cue',()=>{
 const trace=resolveCardRow(row(['body-spark','prism-lens','refrain']),{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
 assert.deepEqual(productiveCardSources(trace),{sources:[],replayed:false});
 const limited=row(['echo','spark-cache','refrain']);limited.cards[1].charges=2;
 const spent=resolveCardRow(limited,{kind:CARD_ROW_EVENTS.body});
 assert.deepEqual(productiveCardSources(spent),{sources:[{slot:0,cardId:'echo'},{slot:1,cardId:'spark-cache'}],replayed:false});
});
test('five-slot dense rows reuse one portrait per acting slot across both passes',()=>{
 const trace=resolveCardRow(row(['harvest-rare','harvest-rare','crescendo','prism-lens','refrain']),{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
 const presentation=productiveCardSources(trace);
 assert.deepEqual(presentation.sources.map(s=>s.slot),[0,1,2,3]);assert.equal(presentation.replayed,true);
 assert.ok(trace.steps.length>presentation.sources.length);
});

test('exact paused receipts keep future capacity and reel time separate from Spark payouts',()=>{
 const victory=resolveCardRow(row(['growth-ring','wind-feather','refrain']),{kind:CARD_ROW_EVENTS.clear});
 const victoryHtml=cardRowTraceMarkup(victory);assert.match(victoryHtml,/maximum Sparks permanently/);assert.doesNotMatch(victoryHtml,/\+0 Sparks/);
 const reel=resolveCardRow(row(['fast-spool']),{kind:CARD_ROW_EVENTS.body,collectorReeling:true,availableReel:4,availableRecovery:4});
 assert.equal(reel.reelSeconds,3);const reelHtml=cardRowTraceMarkup(reel);assert.match(reelHtml,/4 → 1 s remaining reel/);assert.doesNotMatch(reelHtml,/\+0 Sparks/);
});

test('silent snapshots leave the retained Chain strip untouched',()=>{
 let writes=0;
 const node=()=>({dataset:{},children:[],style:new Proxy({},{set(){writes++;return true;}}),classList:{add(){writes++;},remove(){writes++;}},append(){},addEventListener(){},remove(){},setAttribute(){writes++;},setProperty(){writes++;},animate(){writes++;}});
 const doc={createElement:node};
 const root={ownerDocument:doc,querySelector:()=>null,append(){}};
 const hud=createCardRowFeedback(root,{now:()=>1000}),trace=resolveCardRow(row(['body-spark']),{kind:CARD_ROW_EVENTS.body});
 hud.update({cardRowTrace:trace,cardRowSequence:1});const before=writes;
 hud.update({cardRowTrace:trace,cardRowSequence:2});assert.equal(writes,before);
 hud.destroy();
});
