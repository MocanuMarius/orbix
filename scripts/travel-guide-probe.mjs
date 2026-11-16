import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chrome,until} from './browser-probe.mjs';

const base=process.env.TRAVEL_GUIDE_BASE||'http://localhost:4184';
const output=process.env.TRAVEL_GUIDE_NORMAL_OUTPUT||'outputs/travel-guide';await mkdir(output,{recursive:true});
const browser=await chrome(),checks=[];
const click=selector=>browser.ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
try{
 for(const [width,height]of [[900,405],[740,333],[667,300],[640,320]]){
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await browser.visit(base+'/components-preview.html?family=route&state=wayfinder');
  await until(()=>browser.ev(`document.documentElement.dataset.previewReady==='true'&&!!document.querySelector('dialog.flight-preview-sheet[open]')`),'Wayfinder guide');
  const layout=await browser.ev(`(()=>{
   const dialog=document.querySelector('dialog.flight-preview-sheet'),reading=dialog.querySelector('.preview-reading');
   const bounds=node=>node.getBoundingClientRect().toJSON();
   return{title:dialog.querySelector('h2').textContent,body:dialog.innerText,dialog:bounds(dialog),fonts:Object.fromEntries(['h2','.preview-condition','.preview-prize'].map(selector=>[selector,parseFloat(getComputedStyle(dialog.querySelector(selector)).fontSize)])),reading:{height:reading.clientHeight,scroll:reading.scrollHeight,width:reading.clientWidth,scrollWidth:reading.scrollWidth},
    regular:bounds(dialog.querySelector('.preview-regular')),optional:bounds(dialog.querySelector('.preview-optional')),
    actions:[...dialog.querySelectorAll('footer button')].map(node=>({text:node.textContent,...bounds(node)})),
    features:[...dialog.querySelectorAll('.preview-feature summary')].map(node=>({text:node.textContent,...bounds(node)})),overflow:document.documentElement.scrollWidth>innerWidth};
  })()`);
  assert.equal(layout.title,'Thorn Steeple');assert.doesNotMatch(layout.body,/Wayfinder/);assert.match(layout.body,/Optional challenge[\s\S]*Fly between all 3 gold gates, then finish/);
  assert.doesNotMatch(layout.body,/51 s|Briar Cathedral|Gold brackets/,'Extra rules begin disclosed');
  assert.ok(!layout.overflow&&layout.reading.scrollWidth<=layout.reading.width+1,'No horizontal overflow');
  await browser.shot(`${output}/wayfinder-${width}x${height}.png`);
  assert.ok(layout.reading.height>0&&layout.reading.scroll>=layout.reading.height,'Readable guide owns its vertical scroll');
  assert.ok(layout.reading.scroll<=layout.reading.height+1,`Closed Wayfinder guide fits at ${width}×${height}: ${JSON.stringify(layout.reading)}`);
  assert.ok(layout.fonts['.preview-condition']>=(width>=820?22:18),'Readable default guide condition');
  for(const rect of layout.actions){assert.ok(rect.x>=0&&rect.y===0&&rect.right<=width&&rect.bottom===height);assert.ok(rect.height===height&&rect.width>=76,'Full-height thumb rail');}
  assert.ok(layout.actions[0].right<layout.regular.x&&layout.actions[1].x>layout.regular.right,'Back left, Fly right');
  for(const feature of layout.features){assert.ok(feature.height>=44,'Details touch target');}
  await browser.shot(`${output}/wayfinder-${width}x${height}.png`);
  for(const [selector,copy]of [['.preview-biome-feature','release a few Sparks'],['.preview-spark-feature','Small Sparks are more common'],['.preview-route-details','51 s']]){
   await click(selector+' summary');
   assert.ok(await browser.ev(`document.querySelector(${JSON.stringify(selector)}).open`));
   assert.match((await browser.ev(`document.querySelector(${JSON.stringify(selector)}).innerText`)).replace(/\s+/g,' '),new RegExp(copy));
   assert.ok(await browser.ev(`Array.from(document.querySelectorAll('.flight-preview footer button')).every(node=>{const r=node.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight})`),'Disclosures preserve actions');
   if(width===667&&selector==='.preview-route-details')await browser.shot(`${output}/wayfinder-details-667x300.png`);
   await click(selector+' summary');
  }
  await click('.flight-preview [data-action="close-sheet"]');
  assert.equal(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`),false,'Back returns to route');
  assert.ok(await browser.ev(`!!document.querySelector('.world-map-node.reachable[data-id="m0-0-0"]')`),'Exact stop is reachable');
  await click('[data-action="preview-node"][data-id="m0-0-0"]');
  assert.ok(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet [data-action="node"]')`),'Re-enter guide');
  checks.push({viewport:[width,height],layout});
 }
 // The same production guide also enters the actual engine, beyond the gallery HUD sample.
 const saved=await browser.ev(`(async()=>{
  const {createComponentFixture}=await import('./ui/gallery-fixtures.mjs'),M=await import('./model.mjs');
  const state=createComponentFixture('route','wayfinder');state.settings.skipTutorial=true;
  const gift=M.getStartingGiftOffers(state.run)[0];if(gift)M.chooseStartingGift(state,gift.id);
  let saved;M.saveState(state,{setItem:(key,value)=>saved={key:'cards-pilot:'+key,value}});return saved;
 })()`);
 const injection=await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem(${JSON.stringify(saved.key)},${JSON.stringify(saved.value)})`});
 await browser.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 await browser.visit(base+'/game.html?cards=1');
 await until(()=>browser.ev(`!!document.querySelector('[data-action="continue-run"]')`),'Saved journey');
 await browser.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
 await click('[data-action="continue-run"]');
 await until(()=>browser.ev(`!!document.querySelector('#journey-map [data-action="preview-node"][data-id="m0-0-0"]')`),'Actual reachable route');
 await click('#journey-map [data-action="preview-node"][data-id="m0-0-0"]');
 assert.match(await browser.ev(`document.querySelector('dialog.flight-preview-sheet').innerText`),/Thorn Steeple[\s\S]*Optional challenge[\s\S]*Fly between all 3 gold gates, then finish/);
 await browser.shot(`${output}/actual-thorn-steeple-guide-900x405.png`);
 await browser.send('Emulation.setDeviceMetricsOverride',{width:740,height:333,deviceScaleFactor:1,mobile:true});
 await browser.shot(`${output}/actual-thorn-steeple-guide-740x333.png`);
 await click('.flight-preview [data-action="close-sheet"]');
 assert.equal(await browser.ev(`!!document.querySelector('dialog.flight-preview-sheet[open]')`),false);
 await click('#journey-map [data-action="preview-node"][data-id="m0-0-0"]');
 await click('.flight-preview [data-action="node"]');
 await until(()=>browser.ev(`!!document.querySelector('.flight-resume-gate')`),'Actual flight starts paused');
 assert.ok(await browser.ev(`document.body.dataset.screen==='flight'&&!!document.querySelector('.canvas-wrap canvas')`));
 await browser.shot(`${output}/actual-thorn-steeple-paused.png`);
 await click('.flight-resume-gate');
 assert.equal(await browser.ev(`!!document.querySelector('.flight-resume-gate')`),false,'Takeoff begins');
 await click('[data-action="menu"]');
 // Capture the exact marker with the shared production drawing function.
 const gate=await browser.ev(`(async()=>{
  const {drawObjectiveMarks}=await import('./flight-objectives.mjs');
  const canvas=document.createElement('canvas');canvas.width=112;canvas.height=104;
  const context=canvas.getContext('2d');context.fillStyle='#15231d';context.fillRect(0,0,112,104);
  drawObjectiveMarks(context,{baseSpeed:150,hasCompanion:()=>false,player:{x:0},width:112,renderDistance:0,
   routeObjective:{id:'wayfinder',eligible:true,failed:false,complete:false,guide:[],targets:[{x:56,y:52,type:'gate',radius:37}],seen:new Set()} });
  return canvas.toDataURL('image/png');
 })()`);
 await writeFile(`${output}/actual-wayfinder-gate.png`,Buffer.from(gate.split(',')[1],'base64'));
 assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.badResponses,[]);
  await writeFile(`${output}/report.json`,JSON.stringify({checks,actualEntry:'Back, re-entry, Fly, paused engine, takeoff passed',gate:'Production gold upper/lower brackets and central dash'},null,2)+'\n');
 console.log(JSON.stringify({viewports:checks.map(check=>check.viewport),actualEntry:'passed',errors:browser.errors,failedResources:browser.badResponses}));
}finally{browser.close();}
