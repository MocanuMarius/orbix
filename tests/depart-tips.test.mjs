import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,startTutorial,getChoices,selectNode,beginFlightAttempt,finishFlight} from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {CARD_CATALOG} from '../dist/card-catalog.mjs';
import {BIOMES} from '../dist/biomes.mjs';
import {TIPS,PRACTICE_TIP_IDS,words,eligibleTips,pickTip,whyLabel,departureRunState,courseHasBlackHole,selectDepartureTip,readTipHistory,writeTipHistory,DEPART_TIP_HISTORY_KEY,DEPART_TIP_HISTORY_LIMIT,tipIcon} from '../dist/depart-tips.mjs';
import {flightEntryMarkup} from '../dist/flight-entry.mjs';
import {art} from '../dist/depart-art.mjs';

const TRIGGERS=new Set(['collect','delivery','pulse','flash','overfill','rhythm','falling-lift']);
const FLAGS=new Set(['always','low-hearts','first-flights','collector','empty-slot','has-stored-sparks','after-death']);
const biomeIds=new Set(BIOMES.map(b=>b.id));
const hidden=Object.values(CARD_CATALOG).filter(c=>c.retired||c.unreleased);
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const typical={cards:['rhythm','toll-bell','harvest-common','echo','prism-lens'],chain:['rhythm','toll-bell','harvest-common','echo','prism-lens'],slots:5,filled:5,hearts:3,maxHearts:3,biome:'frost',hazards:['black-hole'],flight:9,companion:'collector',stored:14,lastFlightLost:false,practice:false};
// A rolling run of picks: the history grows exactly as the game's does.
function picks(state,n,seed=1){const rand=rng(seed),history=[];for(let i=0;i<n;i++){const tip=pickTip(state,history,rand);history.push(tip.id);}return history;}

test('every tip is short, well formed and names only real, released things',()=>{
 assert.ok(TIPS.length>=50);assert.equal(new Set(TIPS.map(t=>t.id)).size,TIPS.length);
 for(const tip of TIPS){
  assert.ok(words(tip.headline)<=5,`${tip.id} headline`);assert.ok(words(tip.text)<=16,`${tip.id} sentence`);
  for(const part of tip.context.split('&')){
   const [key,value='']=part.split(':');
   if(key==='card')for(const id of value.split('|')){assert.ok(CARD_CATALOG[id],`${tip.id}: unknown card ${id}`);assert.ok(!CARD_CATALOG[id].retired&&!CARD_CATALOG[id].unreleased,`${tip.id}: ${id} is not released`);}
   else if(key==='trigger')assert.ok(TRIGGERS.has(value),`${tip.id}: trigger ${value}`);
   else if(key==='biome')assert.ok(biomeIds.has(value),`${tip.id}: biome ${value}`);
   else if(key==='hazard')assert.equal(value,'black-hole');
   else assert.ok(FLAGS.has(key),`${tip.id}: context ${key}`);
  }
  assert.ok(art(tipIcon(tip)).startsWith('<svg'),`${tip.id} has a picture`);
  // "Black Hole" is also the name of an unreleased card; the tip means the hazard of that name.
  for(const card of hidden.filter(c=>c.id!=='black-hole'))assert.ok(!(tip.headline+' '+tip.text).includes(card.name),`${tip.id} names ${card.name}`);
 }
 assert.ok(hidden.length>=2,'the catalog still marks retired cards, so the check above is live');
});

test('a tip without its own picture takes the picture of its context family',()=>{
 assert.equal(tipIcon({context:'biome:frost'}),'peaks');assert.equal(tipIcon({context:'card:rhythm'}),'chain');assert.equal(tipIcon({context:'low-hearts',icon:'heart'}),'heart');assert.equal(tipIcon({context:'zzz'}),'spark');
 assert.match(art('nonsense'),/<svg/);
});

test('the Rhythm tips need the Rhythm card in the Chain: 200 picks with it, 200 without',()=>{
 const rhythmTip=id=>/rhythm/.test(TIPS.find(t=>t.id===id).context);
 const without={...typical,cards:['body-spark','toll-bell','harvest-common'],chain:['body-spark','toll-bell','harvest-common'],filled:3};
 // Toll Bell waits for the Rhythm Trigger, but without the Rhythm card the Trigger never fires: no Rhythm tip may be shown.
 const seen=new Set();
 for(let seed=1;seed<=4;seed++)for(const id of picks(without,50,seed))seen.add(id);
 assert.ok(![...seen].some(rhythmTip),'no Rhythm tip without the Rhythm card');
 const withCard=new Set();
 for(let seed=1;seed<=4;seed++)for(const id of picks(typical,50,seed))withCard.add(id);
 assert.ok([...withCard].some(rhythmTip),'Rhythm tips appear with the card');
 assert.ok(withCard.has('rhythm-trigger')||eligibleTips(typical).some(t=>t.id==='rhythm-trigger'),'the Rhythm Trigger tip is eligible with the card');
 assert.ok(!eligibleTips(without).some(t=>t.id==='rhythm-trigger'));
});

test('card and Trigger tips follow the equipped Chain, retired cards count for nothing',()=>{
 const base={...typical,cards:['body-spark'],chain:['body-spark'],filled:1,slots:3,biome:null,hazards:[],stored:0,hearts:3,flight:10,companion:null};
 const ids=state=>eligibleTips(state).map(t=>t.id);
 assert.ok(ids(base).includes('collect-trigger'));assert.ok(!ids(base).includes('echo-copy'));assert.ok(!ids(base).includes('delivery-not-collect'));
 assert.ok(ids({...base,cards:['courier-tip'],chain:['courier-tip']}).includes('delivery-not-collect'),'Delivery cards bring the Delivery tip');
 assert.ok(ids({...base,cards:['harvest-rare'],chain:['harvest-rare']}).includes('pulse-uncollected'),'the catalog calls the Pulse Trigger "wave"');
 assert.ok(!ids({...base,cards:['field-impulse'],chain:['field-impulse']}).some(id=>/field/.test(id)),'a retired card is ignored');
 assert.ok(!ids(base).includes('first-collector')&&!ids(base).includes('collector-orbit'),'no Collector, no Collector tips');
 assert.ok(ids({...base,companion:'collector'}).includes('collector-orbit'));
 assert.ok(!ids(base).includes('black-hole')&&!ids(base).includes('low-hearts-rest')&&!ids(base).includes('after-death')&&!ids(base).includes('stored-rest'));
 assert.ok(ids({...base,slots:4}).includes('empty-slot')&&!ids(base).includes('empty-slot')===false);
 assert.ok(ids({...base,hearts:1}).includes('low-hearts-rest'));assert.ok(!ids({...base,hearts:1,maxHearts:1}).includes('low-hearts-rest'));
 assert.ok(ids({...base,biome:'desert'}).includes('biome-desert')&&!ids({...base,biome:'desert'}).includes('biome-frost'));
 assert.ok(ids({...base,flight:3}).includes('first-tap')&&!ids({...base,flight:4}).includes('first-tap'));
});

test('a typical mid-run state has at least 15 eligible tips, and no tip repeats within 8 flights',()=>{
 assert.ok(eligibleTips(typical).length>=15,`eligible ${eligibleTips(typical).length}`);
 for(const seed of [1,2,3]){
  const history=picks(typical,200,seed);
  history.forEach((id,i)=>assert.ok(!history.slice(Math.max(0,i-8),i).includes(id),`${id} repeated within 8 flights at ${i}`));
  assert.ok(new Set(history).size>=15,'a long run cycles through at least 15 different tips');
 }
 const ctx=picks(typical,300,9).filter(id=>TIPS.find(t=>t.id===id).context!=='always').length/300;
 assert.ok(ctx>.5&&ctx<.85,`context tips about two in three, got ${ctx}`);
});

test('with very few tips eligible the picker repeats the one seen longest ago instead of showing nothing',()=>{
 const state={...typical,practice:true};
 const n=eligibleTips(state).length;assert.ok(n>=3&&n<8,`only ${n} tips fit`);
 const history=picks(state,3*n,3);
 for(let i=0;i+n<=history.length;i++)assert.equal(new Set(history.slice(i,i+n)).size,n,'every window of n picks shows each tip once');
});

test('the First Light practice shows only tips that cannot contradict its lessons',()=>{
 const state={...typical,practice:true,flight:1,biome:'frost'};
 assert.deepEqual(new Set(eligibleTips(state).map(t=>t.id)),new Set(PRACTICE_TIP_IDS));
 for(const id of picks(state,200,5))assert.ok(PRACTICE_TIP_IDS.includes(id));
 assert.ok(PRACTICE_TIP_IDS.every(id=>TIPS.find(t=>t.id===id)&&['always','first-flights'].includes(TIPS.find(t=>t.id===id).context)));
});

test('context lines name the actual card, Trigger and place',()=>{
 const tip=id=>TIPS.find(t=>t.id===id);
 assert.equal(whyLabel(tip('rhythm-three'),typical),'For your Rhythm');
 assert.equal(whyLabel(tip('harvest-pulse'),typical),'For your Resonant Harvest');
 assert.equal(whyLabel(tip('biome-frost'),typical),'In Frostbound Reach');
 assert.equal(whyLabel(tip('collect-trigger'),typical),'For your Collect cards');
 assert.equal(whyLabel(tip('lift-cost'),typical),'Good to know');
 assert.equal(whyLabel(tip('black-hole'),typical),'Black Hole ahead');
});

function freshRun(seed='depart-adapter'){
 const state=newState();state.run=createRun(state.profile,seed,1,{cards:true});
 const run=state.run;
 run.mountedCards[0]=makeSkillCard('rhythm','t:0');run.mountedCards[1]=makeSkillCard('toll-bell','t:1');
 const node=getChoices(run).find(n=>n.type!=='support');assert.ok(selectNode(run,node.id));
 return {state,run,node:run.current};
}

test('the adapter reads the real run and the route node',()=>{
 const {state,run,node}=freshRun();
 const s=departureRunState(run,node,{profile:state.profile});
 assert.deepEqual(s.cards,['rhythm','toll-bell']);assert.deepEqual(s.chain,['rhythm','toll-bell']);
 assert.equal(s.slots,3);assert.equal(s.filled,2);assert.equal(s.slots>s.filled,true,'a free Slot');
 assert.equal(s.hearts,run.lives);assert.equal(s.maxHearts,run.maxLives);
 assert.equal(s.biome,node.biomeId,'the biome of the next flight');assert.ok(biomeIds.has(s.biome));
 assert.equal(s.flight,1);assert.equal(s.companion,'collector');assert.equal(s.stored,run.condensedGlow);
 assert.equal(s.lastFlightLost,false);assert.equal(s.practice,false);assert.deepEqual(s.hazards,[],'the opening flights of Ascent 1 have no Black Hole');
 const ids=eligibleTips(s).map(t=>t.id);
 assert.ok(ids.includes('rhythm-three')&&ids.includes('rhythm-trigger')&&ids.includes('empty-slot')&&ids.includes('first-tap'));
 run.mountedCards[2]=makeSkillCard('echo','t:2');run.lives=1;run.stats.flights=5;run.condensedGlow=0;
 const later=departureRunState(run,node,{profile:state.profile});
 assert.equal(later.filled,3);assert.equal(later.slots>later.filled,false);assert.equal(later.flight,6);assert.equal(later.stored,0);
 assert.ok(eligibleTips(later).some(t=>t.id==='low-hearts-rest'));
 assert.equal(departureRunState(run,node,{profile:state.profile}).hearts,1);
});

test('the adapter reports Black Holes only where the flight engine would make one',()=>{
 const {state,run,node}=freshRun('depart-hole');
 const experienced=structuredClone(state.profile);experienced.clearedFlights=4;experienced.stats.flights=4;
 assert.equal(courseHasBlackHole(run,node,experienced),false,'Ascent 1 map 1 opening rows are gentle');
 run.mapIndex=1;assert.equal(courseHasBlackHole(run,{...node,mapIndex:1,row:3},experienced),true);
 assert.equal(courseHasBlackHole(run,{...node,mapIndex:1,row:3,boss:true},experienced),false,'bosses are not ordinary courses');
 run.isTutorial=true;assert.equal(courseHasBlackHole(run,{...node,mapIndex:1,row:3},experienced),false);
 assert.ok(departureRunState({...run,isTutorial:true},node,{profile:experienced}).hazards.length===0);
});

test('a lost flight is read from the real attempt record, an interrupted one is not',()=>{
 const {state,run,node}=freshRun('depart-death');
 assert.ok(beginFlightAttempt(run));assert.ok(finishFlight(run,{success:false,flame:0}));
 assert.equal(run.lastAttempt.success,false);
 const next=getChoices(run).find(n=>n.type!=='support');assert.ok(selectNode(run,next.id));
 const s=departureRunState(run,run.current,{profile:state.profile});
 assert.equal(s.lastFlightLost,true);assert.equal(s.hearts,run.maxLives-1);
 assert.ok(eligibleTips(s).some(t=>t.id==='after-death'));
 run.lastAttempt={success:false,interrupted:true,nodeId:'x',livesLost:0,livesRemaining:run.lives};
 assert.equal(departureRunState(run,run.current,{profile:state.profile}).lastFlightLost,false);
 void node;
});

test('after a lost flight the after-death tip appears often enough to be noticed',()=>{
 const lost={...typical,lastFlightLost:true};
 let shown=0;for(let seed=1;seed<=200;seed++){if(pickTip(lost,[],rng(seed)).id==='after-death')shown++;}
 assert.ok(shown>=10,`after-death shown ${shown} of 200 first picks`);
});

test('the practice run gets practice tips and only the practice state',()=>{
 const state=newState();startTutorial(state,{});
 const run=state.run,node=getChoices(run).find(n=>n.type!=='support')||run.map[0][0];
 const s=departureRunState(run,node,{profile:state.profile});
 assert.equal(s.practice,true);assert.equal(s.biome,null);assert.deepEqual(s.cards,[]);assert.deepEqual(s.hazards,[]);assert.equal(s.lastFlightLost,false);
 assert.ok(eligibleTips(s).every(t=>PRACTICE_TIP_IDS.includes(t.id)));
 const sel=selectDepartureTip({run,node,profile:state.profile,storage:null,rand:rng(3)});
 assert.ok(PRACTICE_TIP_IDS.includes(sel.tip.id));assert.equal(sel.liftHint,true);assert.equal(sel.practice,true);
});

function memoryStorage(){const data={};return {data,getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v);}};}

test('shown tips are remembered (last 20) and storage failures never break the panel',()=>{
 const {state,run,node}=freshRun('depart-history');
 const storage=memoryStorage(),seen=[];
 for(let i=0;i<30;i++){const sel=selectDepartureTip({run,node,profile:state.profile,storage,rand:rng(100+i)});seen.push(sel.tip.id);}
 const saved=JSON.parse(storage.data[DEPART_TIP_HISTORY_KEY]);
 assert.equal(DEPART_TIP_HISTORY_KEY,'emberwing.depart-tips.v1');assert.equal(saved.length,DEPART_TIP_HISTORY_LIMIT);assert.deepEqual(saved,seen.slice(-20));
 seen.forEach((id,i)=>assert.ok(!seen.slice(Math.max(0,i-8),i).includes(id),'no repeat within 8 flights across departures'));
 assert.ok(Object.keys(storage.data).every(k=>k===DEPART_TIP_HISTORY_KEY),'nothing else is written, the old seen-count key is left alone');
 // Corrupt or unknown content is ignored.
 storage.data[DEPART_TIP_HISTORY_KEY]='{not json';assert.deepEqual(readTipHistory(storage),seen.slice(-20),'unreadable storage falls back to what this page last wrote');
 storage.data[DEPART_TIP_HISTORY_KEY]=JSON.stringify(['lift-cost',42,'gone','lift-sooner']);assert.deepEqual(readTipHistory(storage),['lift-cost','lift-sooner']);
 const broken={getItem(){throw new Error('denied')},setItem(){throw new Error('full')}};
 assert.ok(selectDepartureTip({run,node,profile:state.profile,storage:broken,rand:rng(1)}).tip);
 assert.ok(writeTipHistory(['lift-cost'],broken).length===1);
 assert.equal(selectDepartureTip({run,node,showTips:false,storage}),null);
});

test('the departure page: fixed slots, no old diagram, Lift line only early or in practice',()=>{
 const {state,run,node}=freshRun('depart-markup');
 const early=flightEntryMarkup(run,node,{profile:state.profile,storage:memoryStorage(),rand:rng(4)});
 for(const slot of ['entry-top','entry-pic','entry-why','entry-head','entry-text','entry-lift','entry-rule','entry-foot'])assert.match(early,new RegExp(`class="${slot}`),slot);
 assert.match(early,/Field note/);assert.match(early,/Note \d+ of \d+/);assert.match(early,/Tap again in flight to Lift\./);
 assert.match(early,/data-flight-loading-tip="[a-z-]+"/);assert.match(early,/<svg viewBox="0 0 48 48" shape-rendering="crispEdges"/);
 assert.doesNotMatch(early,/entry-tip|entry-illustration|entry-safe-note|entry-heading|Starts paused/);
 assert.match(early,/<button type="button" class="entry-cancel" data-action="cancel-flight-entry"[^>]*><b>Back<\/b><\/button><button type="button" class="primary entry-depart" data-action="wake-flight" disabled><b>Preparing…<\/b><\/button>/,'Back first, then the depart plaque');
 run.stats.flights=3;
 const late=flightEntryMarkup(run,node,{profile:state.profile,storage:memoryStorage(),rand:rng(4)});
 assert.match(late,/<p class="entry-lift" data-entry-note><\/p>/,'the slot stays, empty');
 assert.doesNotMatch(late,/Tap again in flight/);
 const off=flightEntryMarkup(run,node,{profile:state.profile,showTips:false});
 assert.match(off,/Ready when you are/);assert.match(off,/class="entry-lift"/);assert.match(off,/wake-flight/);
});
