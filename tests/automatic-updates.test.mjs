import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../dist/pwa.mjs',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup({controlled=true,local=false}={}){
 const host=new EventTarget(),document=new EventTarget(),service=new EventTarget(),registration=new EventTarget();
 const timers=[],messages=[];let reloads=0,checks=0,revision='one';
 Object.assign(document,{hidden:false,readyState:'complete'});
 Object.assign(registration,{active:controlled?{state:'activated'}:null,waiting:null,installing:null,update:async()=>{checks++;}});
 Object.assign(service,{controller:controlled?{}:null,register:async()=>registration});
 Object.assign(host,{document,isSecureContext:true,Event,closed:false,
  location:{origin:local?'http://localhost:4185':'https://example.test',reload:()=>reloads++},
  navigator:{serviceWorker:service,onLine:true,userAgent:'test',platform:'test'},
  matchMedia:()=>({matches:false}),setInterval:(callback,delay)=>timers.push({callback,delay}),
  fetch:async()=>({ok:true,json:async()=>({revision})})});
 host.parent=host;
 function load(window=host){
  const url=host.location.origin+'/pwa.mjs';
  const context={window,document:window.document,location:{...host.location,search:''},URL,URLSearchParams,Map,queueMicrotask,Date};
  vm.runInNewContext(source.replaceAll('import.meta.url',JSON.stringify(url)).replaceAll('export ', '')+
   '\nglobalThis.api={registerUpdateClient,updateCheckpoint,installationState,refreshBuild};',context);
  return context.api;
 }
 const api=load();
 return {api,host,document,registration,service,timers,messages,load,
  get reloads(){return reloads;},get checks(){return checks;},set revision(value){revision=value;},
  waiting(){registration.waiting={postMessage:message=>messages.push(message)};api.updateCheckpoint();},
  control(){registration.waiting=null;service.controller={};service.dispatchEvent(new Event('controllerchange'));}};
}

test('downloads update in browsers, defer activation through active and paused flight, then save and reload once',async()=>{
 const h=setup();let safe=false,saves=0;
 h.api.registerUpdateClient({canReload:()=>safe,beforeReload:()=>{saves++;return true;}});
 await settle();assert.equal(h.checks,1);
 h.waiting();await settle();assert.equal(h.messages.length,0);assert.equal(h.reloads,0);
 h.api.updateCheckpoint();await settle();assert.equal(h.messages.length,0,'paused flight stays unsafe');
 safe=true;h.api.updateCheckpoint();await settle();assert.equal(h.messages.length,1);
 assert.equal(h.reloads,0,'wait for the completed worker to take control');
 h.control();await settle();assert.equal(saves,1);assert.equal(h.reloads,1);
 h.api.updateCheckpoint();h.control();await settle();assert.equal(h.reloads,1);
});

test('first install claims offline support without restarting the game',async()=>{
 const h=setup({controlled:false});let saves=0;
 h.api.registerUpdateClient({canReload:()=>true,beforeReload:()=>{saves++;return true;}});
 await settle();h.control();await settle();
 assert.equal(h.reloads,0);assert.equal(saves,0);
});

test('external activation waits for safe checkpoint and a successful save',async()=>{
 const h=setup();let safe=false,savable=false,attempts=0;
 h.api.registerUpdateClient({canReload:()=>safe,beforeReload:()=>{attempts++;h.api.updateCheckpoint();return savable;}});
 await settle();h.control();await settle();assert.equal(attempts,0);
 safe=true;h.api.updateCheckpoint();await settle();assert.equal(attempts,1);assert.equal(h.reloads,0);
 savable=true;h.api.updateCheckpoint();await settle();assert.equal(attempts,2);assert.equal(h.reloads,1);
});

test('launch, foreground, online, and visible sixty second checks share one shell/frame coordinator',async()=>{
 const h=setup();await settle();assert.equal(h.checks,1);
 const frame={document:{},closed:false,parent:h.host};h.load(frame);await settle();
 assert.equal(h.checks,1);assert.equal(h.timers.length,1);
 h.document.hidden=true;h.host.dispatchEvent(new Event('online'));await settle();assert.equal(h.checks,1);
 h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(h.checks,2);
 h.host.dispatchEvent(new Event('online'));await settle();assert.equal(h.checks,3);
 assert.equal(h.timers[0].delay,60_000);
});

test('local revision changes use the same save and safe checkpoint gates',async()=>{
 const h=setup({local:true});let safe=false,saves=0;
 h.api.registerUpdateClient({canReload:()=>safe,beforeReload:()=>{saves++;return true;}});
 await settle();const poll=h.timers.find(timer=>timer.delay===5_000);assert.ok(poll);
 h.revision='two';await poll.callback();await settle();assert.equal(h.reloads,0);
 safe=true;h.api.updateCheckpoint();await settle();assert.equal(saves,1);assert.equal(h.reloads,1);
});
