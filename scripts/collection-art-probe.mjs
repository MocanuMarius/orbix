// Uses the isolated Rest fixture and production Collection renderer. No saved
// expedition is read or written. Captures art and checks all long copy/uses.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chrome,until,delay} from './browser-probe.mjs';
const base=process.env.RELIC_PREVIEW_URL||'http://localhost:4199';
const out='work/collection-art';await mkdir(out,{recursive:true});
const b=await chrome(),report=[];
try{
 for(const [width,height] of [[915,412],[740,333],[667,300]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await b.visit(base+'/rest-scene.html?scenario=artifacts-full');
  await until(()=>b.ev('!!document.querySelector("dialog.collection-sheet .collection-artifact")'),'collection');
  for(let page=1;page<5;page++)await b.ev(`document.querySelector('[data-action="collection-page"][data-page="${page}"]').click()`);
  await b.ev(`document.querySelector('[data-action="inspect-artifact"][data-id="hollow-covenant"]').click()`);
  await delay(120);await b.shot(`${out}/collection-${width}x${height}.png`);
  const sample=await b.ev(`(()=>{const d=document.querySelector('dialog.collection-sheet');return{buttons:[...d.querySelectorAll('button')].map(b=>({action:b.dataset.action,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})),meltWidth:d.querySelector('.collection-melt').getBoundingClientRect().width,selected:d.querySelector('[aria-pressed=true]').getBoundingClientRect().toJSON()}})()`);
  assert.ok(sample.buttons.every(button=>button.width>=44&&button.height>=44),JSON.stringify(sample));
  assert.ok(sample.meltWidth<210,'Melt stays a compact secondary action');
  await b.ev('document.querySelector("[data-action=sell-artifact]").click()');
  await b.shot(`${out}/confirm-${width}x${height}.png`);
  await b.ev('document.querySelector("[data-action=cancel-artifact-melt]").click()');
  assert.ok(!await b.ev('!!document.querySelector(".collection-inline-melt")'));
  await b.ev('document.querySelector("[data-action=collection-artifact-details]").click()');
  assert.ok(await b.ev('document.querySelector(".artifact-details-sheet").textContent.includes("Hollow Covenant")'));
  await b.ev('document.querySelector("[data-action=collection-artifact-rules-back]").click()');
  assert.equal(await b.ev('document.querySelector(".collection-selected h3").textContent'),'Hollow Covenant');
  await b.ev('document.querySelector("[data-action=sell-artifact]").click()');
  await b.ev('document.querySelector("[data-action=confirm-artifact-forge]").click()');
  assert.ok(await b.ev('document.querySelector(".collection-inline-receipt").textContent.includes("Hollow Covenant melted")'));
  assert.ok(!await b.ev('!!document.querySelector("[data-action=inspect-artifact][data-id=hollow-covenant]")'));
  await b.ev('document.querySelector("[data-action=close-collection]").click()');
  assert.ok(!await b.ev('!!document.querySelector("dialog.collection-sheet[open]")'));
  const matrix=await b.ev(`(async()=>{
   const M=await import('./model.mjs'),C=await import('./collection-view.mjs');
   const ids=Object.keys(M.ARTIFACTS),failures=[];let count=0;
   document.querySelectorAll('dialog').forEach(d=>d.remove());
   const check=(id,role,sparse,confirm)=>{
    const state={run:{artifacts:sparse?[id]:ids,artifactCharges:{'glow-wick':9,'flash-stone':6},companions:[role],restReady:true}};
    const d=document.createElement('dialog');d.className='game-sheet collection-sheet';
    d.innerHTML=C.collectionMarkup(state,{canMelt:true,selectedId:id,page:sparse?0:Math.floor(ids.indexOf(id)/6),confirmMeltId:confirm?id:null});
    document.body.append(d);d.showModal();
    const rules=d.querySelector('.collection-selected-rule'),actions=d.querySelector('.collection-selected-action');
    const r=rules.getBoundingClientRect(),a=actions.getBoundingClientRect(),rect=d.getBoundingClientRect();
    const issue={id,role,sparse,confirm};
    if(r.top+rules.scrollHeight>a.top+1)failures.push({...issue,kind:'rules-overlap',excess:r.top+rules.scrollHeight-a.top});
    if(d.scrollHeight>d.clientHeight+1)failures.push({...issue,kind:'dialog-scroll',excess:d.scrollHeight-d.clientHeight});
    const visible=[];
    for(const button of d.querySelectorAll('button')){
     if(!button.checkVisibility())continue;
     const box=button.getBoundingClientRect();
     visible.push({action:button.dataset.action,box});
     if(box.width<43.9||box.height<43.9)failures.push({...issue,kind:'target',action:button.dataset.action,width:box.width,height:box.height});
     if(box.left<rect.left-1||box.right>rect.right+1||box.bottom>rect.bottom+1)failures.push({...issue,kind:'offscreen-action',action:button.dataset.action});
    }
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
     const a=visible[i],b=visible[j];
     if(Math.min(a.box.right,b.box.right)-Math.max(a.box.left,b.box.left)>1&&Math.min(a.box.bottom,b.box.bottom)-Math.max(a.box.top,b.box.top)>1)failures.push({...issue,kind:'overlapping-actions',actions:[a.action,b.action]});
    }
    d.remove();count++;
   };
   for(const role of ['collector','protector','swift','leveler'])for(const id of ids)check(id,role,false,false);
   for(const id of ids){check(id,'collector',true,false);check(id,'collector',false,true);}
   const state={run:{artifacts:['hollow-covenant'],restReady:true}},d=document.createElement('dialog');
   d.className='game-sheet collection-sheet';d.innerHTML=C.collectionMarkup(state,{canMelt:true});document.body.append(d);d.showModal();
   return{count,failures};
  })()`);
  await b.shot(`${out}/single-${width}x${height}.png`);
  report.push({width,height,sample,...matrix});console.log(JSON.stringify({width,height,count:matrix.count,failures:matrix.failures}));
 }
 await writeFile(`${out}/report.json`,JSON.stringify({report,errors:b.errors,badResponses:b.badResponses},null,2)+'\n');
 assert.equal(report.reduce((n,r)=>n+r.failures.length,0),0,'Every relic, use count and confirmation fits the physical shelf');
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses,[]);
}finally{b.close();}
