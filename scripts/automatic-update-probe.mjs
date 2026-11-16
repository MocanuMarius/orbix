// Real Chrome/service-worker regression, with a small two-release offline fixture.
// Canonical game files and release stamps are never changed by this probe.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chrome,delay,until as waitUntil} from './browser-probe.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const pwa=await fs.readFile(path.join(root,'pwa.mjs'),'utf8');
const worker=await fs.readFile(path.join(root,'worker.js'),'utf8')+`\nself.addEventListener('message',event=>{if(event.data?.type==='probe-worker')event.ports[0].postMessage({release:WISP_OFFLINE.release,cacheName,files:files.size});});`;
const fullFiles=JSON.parse((await fs.readFile(path.join(root,'offline-list.js'),'utf8')).split('=')[1].trim().replace(/;$/,'' )).files;
const standalone=process.argv.includes('--standalone');
const sourceStamp=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile(path.join(root,'game.html'),'utf8'))[1];
assert.match(pwa,/registerUpdateClient/,'Automatic update implementation must be present');
const until=(fn,label)=>waitUntil(fn,label,600);
let release='a',broken=false,offline=false,slow=false,completeActual=false;
let releaseRequests=[];
const pendingRequests=new Set();
const observedFiles=new Set(['probe.html','index.html','pwa.mjs','payload.txt']);
const releaseFiles=new Map();
const fixture=()=>`<!doctype html><title>Automatic update fixture</title><script type="module">
import * as updates from './pwa.mjs';
sessionStorage.boots=Number(sessionStorage.boots||0)+1;
const safe=()=>!sessionStorage.unsafe;
updates.registerUpdateClient({canReload:safe,beforeReload:()=>{
 if(sessionStorage.saveBlocked)return false;
 sessionStorage.saves=Number(sessionStorage.saves||0)+1;return true;
}});
window.probe={updates,release:${JSON.stringify(release)},
 status:()=>({release:${JSON.stringify(release)},boots:Number(sessionStorage.boots),saves:Number(sessionStorage.saves||0),controlled:!!navigator.serviceWorker.controller}),
 unsafe:value=>{value?sessionStorage.unsafe=value:delete sessionStorage.unsafe;updates.updateCheckpoint();},
 saveBlocked:value=>{value?sessionStorage.saveBlocked='1':delete sessionStorage.saveBlocked;updates.updateCheckpoint();},
 check:async()=>{const r=await navigator.serviceWorker.ready;await r.update();},
 online:()=>dispatchEvent(new Event('online'))};
</script>`;
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 const token={url:req.url};pendingRequests.add(token);res.on('finish',()=>pendingRequests.delete(token));res.on('close',()=>pendingRequests.delete(token));
 const requestURL=new URL(req.url,'http://fixture'),pathname=requestURL.pathname;
 const servedRelease=requestURL.searchParams.get('v')||release;
 if(offline){res.destroy();return;}
 try{
  let body,type=mime[path.extname(pathname)]||'text/plain';
  if(pathname==='/worker.js'){body=worker;releaseRequests.push(release);}
  else if(pathname==='/offline-list.js'){
   if(!releaseFiles.has(release))releaseFiles.set(release,completeActual?[...new Set([...fullFiles,...observedFiles])]:['probe.html','index.html','pwa.mjs','payload.txt']);
   body='self.WISP_OFFLINE='+JSON.stringify({release,revision:release,files:releaseFiles.get(release)})+';';
  }
  else if(pathname==='/probe.html'){body=fixture();type='text/html';}
  else if(pathname==='/pwa.mjs')body=pwa;
  else if(pathname==='/payload.txt'){
   if(broken){res.writeHead(503).end('incomplete');return;}
   if(slow)await delay(1000);
   body=release;
  }else if(pathname==='/__dev-revision'){res.writeHead(404).end();return;}
  else if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
  else if(pathname==='/'||pathname==='/index.html'||pathname==='/actual-host.html'){
   type='text/html';
   body=(await fs.readFile(path.join(root,'index.html'),'utf8')).replace('<body>','<body><script>sessionStorage.actualBoots=Number(sessionStorage.actualBoots||0)+1</script>');
  }else{
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep))throw Error('Outside fixture root');
   body=await fs.readFile(file);
   observedFiles.add(pathname.slice(1));
   // Private accessors exist only in this served test copy; production files
   // stay untouched and the real app still registers its own update contract.
   if(pathname==='/app.mjs')body=body.toString()+`\nwindow.actualProbe={
    build:${JSON.stringify(servedRelease)},snapshot:()=>JSON.parse(JSON.stringify(state)),
    status:()=>({screen,engine:!!engine,flightLoading,paused,dream:!!engine?.dream}),
    map:()=>{closeSheet();goToRun();},
    begin:()=>{closeSheet();const node=getChoices(state.run).find(n=>n.type!=='support');if(!selectNode(state.run,node.id))throw Error('No flight');persist();goToRun();},
    pause:pauseFlight,
    modeLink:()=>modeLink(!cardPilot),
    exit:()=>{exitToMenu();sessionStorage.expectedAfterExit=JSON.stringify(state);},
    transient:(name,value)=>{if(name==='loading')flightLoading=value;if(name==='reward')rewardAnimating=value;if(name==='countdown')cancelCountdown=value?()=>{}:null;if(name==='ritual')screen=value?'guardian-ritual':'home';},
    safe:()=>{const host=window.parent;const key='wispboundInstallation:'+new URL('./',location.href).href;return host[key].clients.get(window).canReload();}
   };`;
  }
  // Actual app source must use the fixture build stamp. Otherwise every
  // ?v=production-stamp asset looks like an old release to the real worker,
  // which deliberately routes old lazy imports through its retained cache.
  if(/(?:javascript|text\/html|text\/css)/.test(type))body=body.toString().replaceAll('?v='+sourceStamp,'?v='+servedRelease).replaceAll("'"+sourceStamp+"'","'"+servedRelease+"'").replaceAll('\"'+sourceStamp+'\"','\"'+servedRelease+'\"');
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range&&Buffer.isBuffer(body)){
   const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
   res.writeHead(206,{'Content-Type':type,'Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1}).end(body.subarray(start,end+1));
  }else res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(body);
 }catch(error){console.error('Fixture request failed',pathname,error.message);res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://emberwing.test:${server.address().port}`;
const results=[];
let browser;
async function freshBrowser(){
 const next=await chrome(['--host-resolver-rules=MAP emberwing.test 127.0.0.1','--no-proxy-server','--unsafely-treat-insecure-origin-as-secure='+origin]);
 if(standalone)await next.send('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'standalone',{value:true});`});
 return next;
}
try{
 browser=await freshBrowser();
 await browser.visit(origin+'/probe.html');
 const status=()=>browser.ev('window.probe?.status()');
 await until(async()=>{const s=await status();return s?.controlled&&s;},'first install and claim');
 await delay(700);
 assert.deepEqual(await status(),{release:'a',boots:1,saves:0,controlled:true});
 results.push('First install claims the client without reloading');
 await browser.ev(`localStorage.setItem('cards-pilot:wispbound.save.condensed.v7','cards-sentinel');localStorage.setItem('wispbound.save.condensed.v7','legacy-sentinel')`);

 if(!process.argv.includes('--actual-only')){
 release='b';slow=true;
 await browser.ev('probe.online()');
 await until(()=>releaseRequests.includes('b'),'online foreground check');
 await delay(250);
 assert.equal((await status()).release,'a','Never reload into a partly downloaded release');
 await until(async()=>{const s=await status();return s?.release==='b'&&s;},'automatic safe update');
 slow=false;
 assert.deepEqual(await status(),{release:'b',boots:2,saves:1,controlled:true});
 await delay(700);assert.equal((await status()).boots,2,'One reload per release');
 results.push('Online retry downloads a full release, saves, and reloads exactly once');

 for(const phase of ['flight','dream','loading','resume-countdown','reward','guardian-ritual']){
  await browser.ev(`probe.unsafe(${JSON.stringify(phase)})`);
  const before=await status();release+='x';
  await browser.ev('probe.check()');
  await until(()=>browser.ev(`navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state==='installed')`),phase+' worker completely downloaded');
  await delay(350);
  assert.equal((await status()).boots,before.boots,phase+' must defer reload');
  await browser.ev('probe.unsafe(null)');
  await until(async()=>{const s=await status();return s?.release===release&&s;},phase+' checkpoint reload');
  assert.equal((await status()).boots,before.boots+1);
 }
 results.push('Unsafe clients defer across six transient phases until a checkpoint');

 await browser.ev(`probe.unsafe('other-tab-activation')`);
 let externalBefore=await status();release+='e';await browser.ev('probe.check()');
 await until(()=>browser.ev(`navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state==='installed')`),'externally activated worker ready');
 await browser.ev(`navigator.serviceWorker.getRegistration().then(r=>r.waiting.postMessage({type:'activate-build'}))`);
 await until(()=>browser.ev(`navigator.serviceWorker.getRegistration().then(r=>!r.waiting&&r.active?.state==='activated')`),'external activation');
 await delay(350);assert.equal((await status()).boots,externalBefore.boots,'External activation still obeys this client safety');
 await browser.ev('probe.unsafe(null)');
 await until(async()=>{const s=await status();return s?.release===release&&s;},'external activation checkpoint');
 results.push('Activation from another tab defers this client until its own checkpoint');

 await browser.ev('probe.saveBlocked(true)');
 let before=await status();release+='s';await browser.ev('probe.check()');await delay(900);
 assert.equal((await status()).boots,before.boots,'A failed save blocks reload');
 await browser.ev('probe.saveBlocked(false)');
 await until(async()=>{const s=await status();return s?.release===release&&s;},'save recovery');
 results.push('Save failure retains the current client, then retries safely');

 before=await status();release+='f';broken=true;await browser.ev('probe.check()');await delay(1200);
 assert.equal((await status()).boots,before.boots,'A partial download must not replace the old build');
 broken=false;offline=true;
 await browser.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await browser.send('Page.reload');
 await until(async()=>{const s=await status();return s?.boots===before.boots+1&&s;},'previous complete build offline');
 assert.equal((await status()).release,before.release,'Offline launch serves the prior complete release');
 offline=false;await browser.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await browser.ev('probe.online()');
 await until(async()=>{const s=await status();return s?.release===release&&s;},'online recovery after partial download');
 assert.deepEqual(await browser.ev(`[localStorage.getItem('cards-pilot:wispbound.save.condensed.v7'),localStorage.getItem('wispbound.save.condensed.v7')]`),['cards-sentinel','legacy-sentinel']);
 results.push('Partial/offline failure preserves a launchable old build and both save namespaces');
 }

 // Exercise the actual hosted app and private safety contract, including a
 // real paused flight/Dream. The only injected code exposes existing methods.
 completeActual=true;release+='actual';releaseFiles.clear();
 const seedActual=()=>browser.ev(`(async()=>{
  localStorage.setItem('wispbound-music-enabled','false');
  const m=await import('./model.mjs');
  for(const cards of [true,false]){
   const s=m.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;
   s.run=m.createRun(s.profile,cards?'update-cards':'update-legacy',1,{cards});
   localStorage.setItem((cards?'cards-pilot:':'')+m.SAVE_KEY,JSON.stringify(s));
  }
 })()`);
 const actual=`document.querySelector('#game-frame')?.contentWindow.actualProbe`;
 for(const cards of [true,false]){
  if(cards){
   assert.deepEqual(browser.errors,[],'No browser runtime errors');
   browser.close();browser=await freshBrowser();
   await browser.visit(origin+'/probe.html');
   await until(()=>browser.ev('window.probe?.status().controlled'),'isolated actual client first install');
   await seedActual();
   await browser.visit(origin+'/index.html?'+(cards?'':'cards=0'));
  }else await browser.visit(await browser.ev(`${actual}.modeLink()`));
  await until(()=>browser.ev(`${actual}?.safe()`),'actual hosted app safety contract');
  for(const phase of ['loading','reward','countdown','ritual']){
   assert.equal(await browser.ev(`(()=>{const p=${actual};p.transient('${phase}',true);return p.safe();})()`),false,'Actual app blocks '+phase);
   await browser.ev(`${actual}.transient('${phase}',false)`);
  }
  await browser.ev(`${actual}.map()`);
  await until(()=>browser.ev(`${actual}?.status().screen==='map'`),'actual map');
  const untouchedKey=cards?'wispbound.save.condensed.v7':'cards-pilot:wispbound.save.condensed.v7';
  const untouched=await browser.ev(`localStorage.getItem(${JSON.stringify(untouchedKey)})`);
  await browser.ev(`${actual}.begin()`);
  await until(()=>browser.ev(`${actual}?.status().engine&&!${actual}.status().flightLoading`),'actual flight readiness');
  await browser.ev(`${actual}.pause()`);
  assert.equal(await browser.ev(`${actual}.safe()`),false,'Actual paused flight blocks reload');
  const flight=await browser.ev(`${actual}.snapshot()`);
  const actualBoots=await browser.ev('Number(sessionStorage.actualBoots)');
  release+='g';
  await browser.ev(`navigator.serviceWorker.getRegistration().then(r=>r.update())`);
  await until(()=>browser.ev(`navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state==='installed')`),'actual app replacement ready');
  await delay(350);
  assert.equal(await browser.ev('Number(sessionStorage.actualBoots)'),actualBoots,'Actual hosted flight never reloads');
  const retained=await browser.ev(`${actual}.snapshot()`);
  for(const field of ['id','lives','mapIndex','step','attemptActive'])assert.deepEqual(retained.run[field],flight.run[field],field+' unchanged during update');
  assert.deepEqual(retained.run.path,flight.run.path,'No route warp');
  await browser.ev(`${actual}.exit()`);
  await until(()=>browser.ev(`Number(sessionStorage.actualBoots)===${actualBoots+1}&&${actual}?.build===${JSON.stringify(release)}`),'actual home checkpoint update');
  const after=await browser.ev(`${actual}.snapshot()`);
  const expected=await browser.ev(`JSON.parse(sessionStorage.expectedAfterExit)`);
  for(const field of ['id','lives','mapIndex','step','phase'])assert.deepEqual(after.run[field],expected.run[field],field+' preserved after reload');
  assert.equal(after.run.lives,flight.run.lives,'Update costs no heart');
  assert.deepEqual(after.run.path,expected.run.path,'Saved checkpoint path survives');
  assert.equal(await browser.ev(`localStorage.getItem(${JSON.stringify(untouchedKey)})`),untouched,'Other save namespace remains byte-for-byte unchanged');
  results.push(`Actual ${cards?'Cards':'legacy'} hosted paused flight defers, then preserves run/hearts/route at home`);
 }

 console.log(JSON.stringify({mode:standalone?'standalone-like':'browser',passed:results,runtimeErrors:browser.errors},null,2));
 assert.deepEqual(browser.errors,[],'No browser runtime errors');
}catch(error){
 console.error(JSON.stringify({error:error.message,status:await browser?.ev(`(async()=>{const p=document.querySelector('#game-frame')?.contentWindow.actualProbe;const i=window['wispboundInstallation:'+location.origin+'/'];const r=await navigator.serviceWorker.getRegistration();const reply=r.waiting&&await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data);r.waiting.postMessage({type:'probe-worker'},[channel.port2]);setTimeout(()=>resolve('No waiting-worker reply'),1500)});const activeReply=r.active&&await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data);r.active.postMessage({type:'probe-worker'},[channel.port2]);setTimeout(()=>resolve('No active-worker reply'),1500)});return {activeReply,fixture:window.probe?.status(),url:location.href,boots:sessionStorage.actualBoots,actual:p&&{...p.status(),build:p.build,safe:p.safe()},coordinator:i&&{clients:i.clients.size,pending:i.reloadPending,activating:i.activating?.state,reloading:i.reloading,waiting:r.waiting?.state,active:r.active?.state},reply}})()`).catch(e=>e.message),pendingRequests:Array.from(pendingRequests),runtimeErrors:browser?.errors,badResponses:browser?.badResponses},null,2));
 throw error;
}finally{
 browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
