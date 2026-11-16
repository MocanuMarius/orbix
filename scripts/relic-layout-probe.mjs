// Targets the memory-only rest-preview.mjs server (REST_PREVIEW_PORT=4197).
// RELIC_PREVIEW_URL can point to another running preview; no production save is used.
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
import fs from 'node:fs/promises';
const base=process.env.RELIC_PREVIEW_URL||'http://localhost:4197';
const out=new URL('../outputs/relic-layout/',import.meta.url);await fs.mkdir(out,{recursive:true});
const b=await chrome(),report=[];
const open=async query=>{await b.visit(base+'/rest-scene.html?'+query);await until(()=>b.ev('!!document.querySelector(".artifact-choice,dialog.collection-sheet")'),'relic surface');await delay(150);};
const click=async selector=>{assert.ok(await b.ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector);await b.ev(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(60);};
const shot=name=>b.shot(new URL(name,out));
try{
for(const [width,height] of [[915,412],[740,333]]){
 await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
 await open('scenario=victory&source=boss&artifact=hollow-covenant&second=dream-sovereign');
 await shot(`draft-${width}.png`);
 await click('[data-action="reward-artifact-details"]');
 assert.ok(await b.ev('document.querySelector("dialog").textContent.includes("Skim up to 5 Dark Sparks")'));
 await shot(`rules-${width}.png`);await click('dialog [data-action="close-sheet"]');
 assert.equal(await b.ev('document.querySelectorAll(".artifact-choice").length'),2);
 await click('[data-action="keep-flight-reward"]');
 assert.equal(await b.ev('document.querySelectorAll(".artifact-choice").length'),1);
 assert.ok(await b.ev('!!document.querySelector("[data-action=victory-next]")'));
 await delay(400);await shot(`acquired-${width}.png`);
 await click('[data-action="reward-artifact-details"]');await click('dialog [data-action="close-sheet"]');
 await click('[data-action="victory-next"]');
 assert.equal(await b.ev('document.querySelectorAll(".artifact-choice").length'),0);
 await open('scenario=victory&source=elite&artifact=glow-wick&second=flash-stone');
 await click('[data-action="keep-flight-reward"]');
 assert.ok(await b.ev('document.querySelector(".artifact-acquired").textContent.includes("3 automatic uses")'));
 assert.ok(!await b.ev('document.querySelector(".artifact-acquired").textContent.includes("permanently")'));
 await open('scenario=artifacts-full');
 await click('[data-action="inspect-artifact"][data-id="ascent-chime"]');
 await click('[data-action="collection-artifact-details"]');await shot(`collection-rules-${width}.png`);
 await click('dialog [data-action="collection-artifact-rules-back"]');
 assert.ok(await b.ev('!!document.querySelector("dialog.collection-sheet")'));
 assert.equal(await b.ev('document.querySelector(".collection-selected h3").textContent'),'Ascent Chime');
 await shot(`collection-${width}.png`);
 await click('[data-action="sell-artifact"]');
 assert.ok(await b.ev('document.querySelector(".collection-inline-melt").textContent.includes("Remove this artifact")'));
 await shot(`melt-confirm-${width}.png`);await click('[data-action="cancel-artifact-melt"]');
 assert.equal(await b.ev('document.querySelectorAll(".collection-inline-melt").length'),0);
 await click('[data-action="sell-artifact"]');await click('[data-action="confirm-artifact-forge"]');
 assert.ok(await b.ev('document.querySelector(".collection-inline-receipt").textContent.includes("Ascent Chime melted")'));
 assert.ok(!await b.ev('!!document.querySelector("[data-action=inspect-artifact][data-id=ascent-chime]")'));
 await open('scenario=artifacts-full');
 for(let page=0;page<4;page++)await click('[data-action="collection-page"][data-page="'+(page+1)+'"]');
 await click('[data-action="inspect-artifact"][data-id="hollow-covenant"]');
 await shot(`collection-long-${width}.png`);
 await click('[data-action="collection-artifact-details"]');await shot(`collection-long-rules-${width}.png`);
 await click('[data-action="collection-artifact-rules-back"]');
 assert.equal(await b.ev('document.querySelector(".collection-selected h3").textContent'),'Hollow Covenant');
 const receipt=await b.ev(`(async()=>{
  const R=await import('./reward-screen.mjs');
  const run={lastFlight:{completionBonus:25,pickupCondensedGlow:20,exitPacking:{amount:15},pactBonus:10,treasureWager:{reward:30,message:'Treasure seal completed · +30 Stored Sparks'},vow:{reward:10,message:'Vow kept · +10 Stored Sparks'},routeBonus:{amount:20,message:'Route bonus secured · +20 Stored Sparks'},chestIncome:{amount:4,sources:['Lantern Dividend','Route Contract'],message:'Lantern Dividend + Route Contract · +4 Stored Sparks'},keptLightDividend:10,storageBonus:10,cardPackingBonus:4,resonanceStored:15,cardClearReceipt:{stored:100,futureCapacity:3,cruisingSpeed:6}}};
  document.querySelectorAll('dialog').forEach(d=>d.remove());
  const d=document.createElement('dialog');d.className='game-sheet reward-earnings-sheet';d.innerHTML=R.rewardEarningsDetailMarkup(run);document.body.append(d);d.showModal();
  return {total:R.rewardEarnings(run).total,rows:R.rewardEarnings(run).rows.length,scroll:d.scrollHeight,client:d.clientHeight};
 })()`);
 await shot(`earnings-${width}.png`);
 assert.equal(receipt.total,273);assert.equal(receipt.rows,13);assert.ok(receipt.scroll<=receipt.client+1,JSON.stringify(receipt));
 // Render every production copy, including all four companion names. The matrix
 // checks geometry as well as scroll dimensions so visible text cannot sit under actions.
 const matrix=await b.ev(`(async()=>{
  document.querySelectorAll('dialog').forEach(d=>d.remove());
  const M=await import('./model.mjs'),R=await import('./reward-screen.mjs'),C=await import('./collection-view.mjs'),D=await import('./replay-ui.mjs');
  const ids=Object.keys(M.ARTIFACTS),failures=[],app=document.querySelector('#app');let count=0;
  document.body.dataset.screen='victory';
  const problem=(kind,id,role,detail)=>failures.push({kind,id,role,...detail});
  const overlaps=(copy,actions)=>copy.getBoundingClientRect().top+copy.scrollHeight>actions.getBoundingClientRect().top+1;
  for(const role of ['collector','protector','swift','leveler'])for(const id of ids){
   const run={artifacts:['echo-bell','hollow-covenant'],artifactCharges:{'glow-wick':9,'flash-stone':6},companions:[role],lastFlight:{boss:true},flightReward:{offers:[id,ids.find(x=>x!==id)],claimed:false}};
   app.innerHTML=R.flightRewardMarkup({run});const card=app.querySelector('.artifact-choice'),copy=card.querySelector('.artifact-choice-copy'),actions=card.querySelector('.artifact-choice-actions');
   for(const button of card.querySelectorAll('button'))if(button.getBoundingClientRect().height<44)problem('small-target',id,role,{height:button.getBoundingClientRect().height});
   if(overlaps(copy,actions))problem('draft',id,role,{excess:copy.getBoundingClientRect().top+copy.scrollHeight-actions.getBoundingClientRect().top});
   const state={run:{...run,artifacts:ids,restReady:true}};
   app.innerHTML='';const sheet=document.createElement('dialog');sheet.className='game-sheet collection-sheet';sheet.innerHTML=C.collectionMarkup(state,{selectedId:id,page:Math.floor(ids.indexOf(id)/6),canMelt:true});document.body.append(sheet);sheet.showModal();
   const rules=sheet.querySelector('.collection-selected-rule'),action=sheet.querySelector('.collection-selected-action');
   if(overlaps(rules,action))problem('collection',id,role,{excess:rules.getBoundingClientRect().top+rules.scrollHeight-action.getBoundingClientRect().top});sheet.remove();
   const detail=document.createElement('dialog');detail.className='game-sheet artifact-details-sheet';detail.innerHTML=D.artifactDetailMarkup(M.ARTIFACTS[id],{run});document.body.append(detail);detail.showModal();
   if(detail.scrollHeight>detail.clientHeight+1)problem('full-rules',id,role,{excess:detail.scrollHeight-detail.clientHeight});detail.remove();count++;
  }
  return {count,failures};
 })()`);
 report.push({width,height,...matrix,receipt});
 console.log(JSON.stringify(report.at(-1)));
}
await fs.writeFile(new URL('report.json',out),JSON.stringify({report,errors:b.errors,badResponses:b.badResponses},null,2));
assert.equal(report.reduce((n,r)=>n+r.failures.length,0),0,'All relic copy must clear its actions without scrolling at phone sizes');
assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses,[]);
}finally{b.close();}
