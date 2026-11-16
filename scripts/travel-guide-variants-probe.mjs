import assert from 'node:assert/strict';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {chrome,until} from './browser-probe.mjs';
const base=process.env.TRAVEL_GUIDE_BASE||'http://localhost:4184';
const output='outputs/travel-guide-variants',publicOutput='dist/assets/previews/travel-guide';
await mkdir(output,{recursive:true});await mkdir(publicOutput,{recursive:true});
const variants=['waystone','rootwood','night-atlas'],viewports=[[900,405],[740,333],[667,300],[640,320]];
const browser=await chrome(),checks=[];
const click=selector=>browser.ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const key=async key=>{await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Escape'?27:13});await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});};
try{
 for(const art of variants)for(const [width,height]of viewports){
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await browser.visit(`${base}/components-preview.html?family=route&state=wayfinder&guideArt=${art}`);
  await until(()=>browser.ev(`document.documentElement.dataset.previewReady==='true'&&document.fonts.status==='loaded'&&!!document.querySelector('dialog.flight-preview-sheet[open] .preview-art-${art}')`),`${art} guide`);
  const layout=await browser.ev(`(()=>{
   const guide=document.querySelector('.flight-preview'),reading=guide.querySelector('.preview-reading'),rect=node=>node.getBoundingClientRect().toJSON();
   return {art:guide.className,body:guide.innerText,reading:{height:reading.clientHeight,scroll:reading.scrollHeight,width:reading.clientWidth,scrollWidth:reading.scrollWidth},regular:rect(guide.querySelector('.preview-regular')),optional:rect(guide.querySelector('.preview-optional')),actions:[...guide.querySelectorAll('footer button')].map(node=>({label:node.getAttribute('aria-label'),text:node.innerText,disabled:node.disabled,sign:rect(node.querySelector('svg')),color:getComputedStyle(node).color,...rect(node)})),features:[...guide.querySelectorAll('.preview-feature summary,.preview-glossary')].map(node=>rect(node)),overflow:document.documentElement.scrollWidth>innerWidth};
  })()`);
  assert.ok(!layout.overflow&&layout.reading.scrollWidth<=layout.reading.width+1,'No horizontal overflow');
  assert.ok(layout.reading.scroll<=layout.reading.height+1,`${art} fits closed at ${width}×${height}: ${JSON.stringify(layout.reading)}`);
  assert.ok(Math.abs(layout.regular.height-layout.optional.height)<=1,'Equal reward bands');
  assert.match(layout.body,/Thorn Steeple[\s\S]*Wayfinder/);assert.doesNotMatch(layout.body,/51 s|Gold brackets/);
  for(const [index,action]of layout.actions.entries()){
   assert.equal(action.text,'');assert.equal(action.disabled,false);assert.ok(action.width>=76);assert.equal(action.y,0);assert.equal(action.height,height);
   assert.ok(action.sign.y>=30&&action.sign.bottom<=height-30,'Safe central sign');
   assert.ok(index===0?action.x===0:action.right===width,'Flush outer rail');
  }
  assert.equal(layout.actions[0].label,'Back to route');assert.equal(layout.actions[1].label,'Fly to Thorn Steeple');assert.notEqual(layout.actions[0].color,layout.actions[1].color);
  for(const feature of layout.features)assert.ok(feature.height>=44&&feature.bottom<=height,'Visible touchable details');
  const name=`${art}-${width}x${height}.png`;await browser.shot(`${output}/${name}`);await copyFile(`${output}/${name}`,`${publicOutput}/${name}`);
  // All optional help returns to this guide without losing route context.
  await click('.preview-resource-help');assert.ok(await browser.ev(`!!document.querySelector('dialog.card-term-dialog[open]')`));
  await key('Escape');assert.ok(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`));
  await click('.preview-glossary');assert.ok(await browser.ev(`!!document.querySelector('dialog.card-glossary-dialog[open]')`));
  await key('Escape');assert.ok(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`));
  await click('.preview-route-details summary');assert.match((await browser.ev(`document.querySelector('.preview-route-details').innerText`)).replace(/\s+/g,' '),/51 s[\s\S]*Gold brackets/);
  assert.ok(await browser.ev(`Array.from(document.querySelectorAll('.flight-preview footer button')).every(node=>{const r=node.getBoundingClientRect();return r.y===0&&r.bottom===innerHeight})`));
  await click('.preview-route-details summary');
  await key('Escape');assert.equal(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`),false);
  await click('[data-action="preview-node"][data-id="m0-0-0"]');
  assert.ok(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open] .preview-art-${art}')`));
  checks.push({art,viewport:[width,height],layout});
 }
 // The same renderer advertises no forward permission for a future stop.
 await browser.ev(`(async()=>{const {createComponentFixture}=await import('./ui/gallery-fixtures.mjs'),{flightPreviewMarkup}=await import('./flight-preview.mjs');const {run}=createComponentFixture('route','wayfinder'),node=run.map[3].find(n=>n.type==='flight');document.querySelector('dialog.flight-preview-sheet').innerHTML=flightPreviewMarkup(run,node,{available:false,level:node,guideArt:'night-atlas'});})()`);
 assert.ok(await browser.ev(`(()=>{const b=document.querySelector('.preview-advance');return b.disabled&&!b.dataset.action&&b.getAttribute('aria-label').startsWith('Unavailable:')})()`));
 await click('.preview-advance');assert.ok(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`));
 // Make one labelled contact image directly from the actual screenshots.
 await browser.send('Emulation.setDeviceMetricsOverride',{width:940,height:1419,deviceScaleFactor:1,mobile:false});
 await browser.visit(`${base}/travel-guide-compare.html`);
 await until(()=>browser.ev(`document.documentElement.dataset.guideCompareReady==='true'`),'Comparison controls ready');
 await browser.ev(`document.body.innerHTML='<main style="padding:20px;margin:0;width:940px;max-width:none">'+${JSON.stringify([['waystone','1 · Carved waystone'],['rootwood','2 · Rooted wood'],['night-atlas','3 · Illuminated night atlas']].map(([art,title])=>`<section style="margin:0 0 18px"><h2 style="font:22px/1.2 WispPixel,monospace;color:#ffe6a6;margin:0 0 8px">${title}</h2><img width="900" height="405" style="display:block" src="assets/previews/travel-guide/${art}-900x405.png" alt="${title}"></section>`).join(''))}+'</main>'`);
 await until(()=>browser.ev(`document.fonts.status==='loaded'&&[...document.images].every(img=>img.complete&&img.naturalWidth===900)`),'Contact images');
 await browser.shot(`${output}/three-guides.png`);await copyFile(`${output}/three-guides.png`,`${publicOutput}/three-guides.png`);
 // On a phone the chooser switches one legible native-width guide at a time.
 await browser.send('Emulation.setDeviceMetricsOverride',{width:667,height:300,deviceScaleFactor:1,mobile:true});
 await browser.visit(`${base}/travel-guide-compare.html?size=short`);
 await until(()=>browser.ev(`document.querySelector('#guide-frame')?.contentDocument?.documentElement.dataset.previewReady==='true'`),'Public comparison');
 for(const art of variants){
  await click(`[data-guide="${art}"]`);
  await until(()=>browser.ev(`!!document.querySelector('#guide-frame')?.contentDocument?.querySelector('.preview-art-${art}')`),`Compare ${art}`);
  assert.ok(await browser.ev(`document.querySelectorAll('.art-choices [aria-pressed=true]').length===1&&document.documentElement.scrollWidth<=innerWidth`));
  assert.ok(await browser.ev(`document.querySelector('#guide-frame').clientWidth>=640`),'Native phone guide width');
 }
 await browser.ev(`document.querySelector('#guide-frame').scrollIntoView({block:'start'})`);await browser.shot(`${output}/comparison-phone.png`);
 await click('#reset-guide');await until(()=>browser.ev(`!!document.querySelector('#guide-frame')?.contentDocument?.querySelector('dialog.flight-preview-sheet[open]')`),'Reopened guide');
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.badResponses,[]);
 const report={viewports,variants,checks,futurePermission:'disabled without node action',help:'Stored Sparks, Glossary and Escape return to the same guide',comparison:'One native-width guide; all three choices and reopen passed',errors:browser.errors,failedResources:browser.badResponses};
 await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({variants,viewports,checks:checks.length,futurePermission:'passed',help:'passed',comparison:'passed',errors:browser.errors,failedResources:browser.badResponses}));
}finally{browser.close();}
