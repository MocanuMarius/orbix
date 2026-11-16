import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chrome,until} from './browser-probe.mjs';
// Run from the repository root. RELEASE_DIST can point to a stamped isolated package.
const out=path.resolve(process.env.RELEASE_PROBE_OUT||'work/early-play-release-check'),artifact=path.resolve(process.env.RELEASE_DIST||'dist');
await fs.mkdir(out,{recursive:true});
const game=await fs.readFile(path.join(artifact,'game.html'),'utf8'),release=/src="app\.mjs\?v=([^"]+)"/.exec(game)?.[1];assert.ok(release);
const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const baselinePages=process.env.RELEASE_PREVIOUS_PAGES||'1d58d6c4261ac14c30bede3c08a299e0478f1402';
const oldRelease=JSON.parse(execFileSync('git',['-C',gitRoot,'show',baselinePages+':release.json'],{encoding:'utf8'})).version;
const c={};vm.runInNewContext(await fs.readFile(path.join(artifact,'offline-list.js'),'utf8')+';this.list=WISP_OFFLINE',c);const revision=c.list.revision;
const command=process.argv[2],isPublic=command==='public',upgrade=command==='upgrade';assert.ok(isPublic||upgrade||command==='package');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.json':'application/json'},oldSources=new Map(),missing=[];
const oldFiles=new Set(execFileSync('git',['-C',gitRoot,'ls-tree','-r','--name-only',baselinePages],{encoding:'utf8'}).trim().split(/\r?\n/)),old=file=>{if(!oldSources.has(file))oldSources.set(file,execFileSync('git',['-C',gitRoot,'show',baselinePages+':'+file],{maxBuffer:64*1024*1024}));return oldSources.get(file);};let previous=upgrade;
const server=isPublic?null:http.createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';assert.ok(!file.includes('..'));const body=previous&&oldFiles.has(file)?old(file):await fs.readFile(path.join(artifact,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{missing.push(req.url);res.writeHead(404).end();}});
if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=isPublic?'https://mocanumarius.github.io/orbix/':'http://early-play-release.test:'+server.address().port+'/';
const b=await chrome(['--mute-audio',...isPublic?[]:['--no-proxy-server','--host-resolver-rules=MAP early-play-release.test 127.0.0.1','--unsafely-treat-insecure-origin-as-secure='+base]]),{ev,send}=b,visit=p=>b.visit(new URL(p,base).href),ready=s=>until(()=>ev(`document.readyState==='complete'&&!!document.querySelector(${JSON.stringify(s)})`),s,600),click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`),snapshot=()=>ev("({legacy:localStorage.getItem('wispbound.save.condensed.v7'),cards:localStorage.getItem('cards-pilot:wispbound.save.condensed.v7')})");
try{
 if(upgrade){
  await send('Emulation.setDeviceMetricsOverride',{width:740,height:333,deviceScaleFactor:1,mobile:true});await visit('game.html?cards=1&display=native');await ready('.front-new-button');await until(()=>ev(`navigator.serviceWorker.controller&&caches.keys().then(ks=>ks.some(k=>k.includes(':${oldRelease}:')))`),'prior worker complete',900);
  await visit('loading.html');await ready('body');await ev(`(async()=>{const M=await import('./model.mjs?v=${oldRelease}'),{createComponentFixture}=await import('./ui/gallery-fixtures.mjs?v=${oldRelease}');const legacy=M.newState();legacy.run=M.createRun(legacy.profile,'vortex-legacy-kept');M.saveState(legacy,localStorage);const s=createComponentFixture('route','wayfinder');s.settings.skipTutorial=true;M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
  await visit('game.html?cards=1&display=native');await ready('.front-continue');const before=await snapshot();
  previous=false;await visit('cards.html?v='+release);
  await until(()=>ev(`document.querySelector('#game-frame')?.contentDocument?.querySelector('[data-game-version]')?.dataset.gameVersion==='${release}'`),'automatic delivered phone link to new Cards build',1500);
  const frame=`document.querySelector('#game-frame').contentDocument`;
  assert.ok(await ev(`document.querySelector('#game-frame').src.includes('cards=1')`));
  assert.equal(await ev(`new URL(document.querySelector('#game-frame').src).searchParams.has('mock')`),false,'normal game, no mock workbench');
  assert.ok(await ev(`${frame}.querySelector('.front-continue')`));
  const after=await snapshot();await fs.writeFile(path.join(out,'fixture-save-comparison.json'),JSON.stringify({before,after},null,2)+'\n');assert.equal(after.legacy,before.legacy,'untouched legacy save preserved byte-for-byte');
  const expectedCards=JSON.parse(before.cards),actualCards=JSON.parse(after.cards);let onboardingNormalization=null;
  if(expectedCards.profile.onboarding.stage!==actualCards.profile.onboarding.stage){
   assert.equal(expectedCards.profile.tutorialComplete,true);assert.equal(expectedCards.profile.onboarding.stage,0);assert.equal(actualCards.profile.onboarding.stage,4);
   onboardingNormalization={path:'profile.onboarding.stage',before:0,after:4,reason:'Align an already completed tutorial profile'};
   expectedCards.profile.onboarding.stage=4;
  }
  assert.deepEqual(actualCards,expectedCards,'entire Cards save preserved except the explicit completed-tutorial stage normalization');
  const caches=await ev('caches.keys()');assert.ok(caches.some(k=>k.endsWith(':'+release+':'+revision)));assert.ok(caches.some(k=>k.includes(':'+oldRelease+':')));
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  const frameReady=selector=>until(()=>ev(`${frame}.querySelector(${JSON.stringify(selector)})`),selector,600),frameClick=selector=>ev(`${frame}.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await frameClick('.front-continue');await frameReady('#journey-map [data-action="preview-node"][data-id="m0-0-0"]');await frameClick('[data-action="preview-node"][data-id="m0-0-0"]');await frameReady('dialog.flight-preview-sheet[open]');await frameClick('.preview-back');assert.equal(await ev(`!!${frame}.querySelector('dialog.flight-preview-sheet[open]')`),false);await frameClick('[data-action="preview-node"][data-id="m0-0-0"]');await frameClick('.preview-advance');await frameReady('.flight-resume-gate');assert.ok(await ev(`!!${frame}.querySelector('.canvas-wrap canvas')`));await b.shot(path.join(out,'upgrade-offline-flight.png'));
  await visit('loading.html');await ready('body');const helper=await ev(`import('./collector-vortex.mjs?v=${release}').then(m=>Object.keys(m))`);assert.ok(helper.length>0);
  assert.deepEqual(b.errors,[]);assert.deepEqual(missing.filter(u=>!u.includes('favicon.ico')),[]);const report={passed:true,release,oldRelease,revision,priorInstalledWorker:true,automaticPhoneLink:true,settingsRefresh:false,normalCards:true,cardsEntireStatePreserved:true,untouchedLegacyExact:true,onboardingNormalization,retainedPriorCache:true,offlineContinueGuideBackFly:true,offlineHelper:helper,errors:b.errors};await fs.writeFile(path.join(out,'upgrade-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }else{
  if(isPublic){
   await send('Emulation.setDeviceMetricsOverride',{width:740,height:333,deviceScaleFactor:1,mobile:true});
   await visit('cards.html?v='+release);
   const gameDoc=`(document.querySelector('#game-frame')?.contentDocument||document)`;
   await until(()=>ev(`${gameDoc}.querySelector('[data-game-version]')?.dataset.gameVersion==='${release}'`),'public phone link opens latest build automatically',1500);
   assert.ok(await ev(`${gameDoc}.body.classList.contains('card-pilot')`));
   assert.equal(await ev(`new URL(location.href).searchParams.has('mock')`),false);
   await b.shot(path.join(out,'public-phone-entry.png'));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await visit('?v='+release);await ready('#game-frame');await until(()=>ev(`document.querySelector('#game-frame')?.contentDocument?.querySelector('[data-game-version]')?.dataset.gameVersion==='${release}'`),'normal root current game',600);assert.ok(await ev(`document.querySelector('#game-frame').contentDocument.body.classList.contains('card-pilot')`),'ordinary entry uses Cards');await b.shot(path.join(out,command+'-normal-desktop.png'));
  await until(()=>ev(`navigator.serviceWorker.controller&&caches.keys().then(ks=>ks.some(k=>k.endsWith(':${release}:${revision}')))`),'complete new worker',1500);const cache=await ev(`(async()=>{const keys=await caches.keys(),name=keys.find(k=>k.endsWith(':${release}:${revision}')),cache=await caches.open(name);return{name,files:(await cache.keys()).length,helper:!!await cache.match(new URL('collector-vortex.mjs',location.href).href)};})()`);assert.equal(cache.files,c.list.files.length);assert.equal(cache.helper,true);
  await send('Emulation.setDeviceMetricsOverride',{width:740,height:333,deviceScaleFactor:1,mobile:true});await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await visit('game.html?cards=1&display=native&v='+release);await ready('.front-new-button');assert.equal(await ev(`document.querySelector('[data-game-version]').dataset.gameVersion`),release);await b.shot(path.join(out,command+'-offline-home.png'));await visit('loading.html');await ready('body');const helper=await ev(`import('./collector-vortex.mjs?v=${release}').then(m=>Object.keys(m))`);assert.ok(helper.length>0);
  assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses.filter(r=>!r.url.includes('favicon.ico')),[]);assert.deepEqual(missing.filter(u=>!u.includes('favicon.ico')),[]);const report={passed:true,release,revision,normalRoot:true,normalCards:true,automaticPhoneEntry:isPublic,cache,offlineHome:true,offlineHelper:helper,errors:b.errors};await fs.writeFile(path.join(out,command==='package'?'package-browser-report.json':'public-pwa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }
}catch(error){await b.shot(path.join(out,command+'-failure.png'));await fs.writeFile(path.join(out,command+'-failure.txt'),String(error.stack)+'\n'+await ev('location.href+"\\n"+document.body.innerText'));throw error;}finally{b.close();if(server)await new Promise(resolve=>server.close(resolve));}
