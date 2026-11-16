import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function worker({online=true,cachedResponse}={}) {
  const scope='https://example.test/orbix/',prefix='wispbound:'+scope+':';
  const names=[prefix+'oldest:a',prefix+'previous:b',prefix+'current:c'];
  const listeners=new Map(),removed=[],network=[];
  const cache={match:async key=>cachedResponse||new Response('cached '+new URL(key).pathname)};
  const context={URL,Response,Set,Array,Promise,
    WISP_OFFLINE:{release:'current',revision:'c',files:['cards.html','card-workbench.html','game.html','image.png','music.mp3']},
    importScripts(){},
    self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners.set(type,fn)},
    caches:{keys:async()=>names,open:async()=>cache,delete:async key=>{removed.push(key);return true;}},
    fetch:async request=>{network.push(request.url);if(!online)throw Error('offline');return new Response('network '+new URL(request.url).pathname);}};
  vm.runInNewContext(readFileSync(new URL('../dist/worker.js',import.meta.url),'utf8'),context);
  const activate=async()=>{let pending;listeners.get('activate')({waitUntil:p=>pending=p});await pending;};
  const request=async(file,{mode='no-cors',destination='',headers=new Headers()}={})=>{let response;listeners.get('fetch')({request:{method:'GET',mode,destination,url:scope+file,headers},respondWith:p=>response=p});return await response;};
  const navigate=async file=>(await request(file,{mode:'navigate'})).text();
  return {activate,navigate,request,removed,names,network};
}

test('an upgrade retains exactly its immediate prior cache for an already-open launcher',async()=>{
  const w=worker();await w.activate();
  assert.deepEqual(w.removed,[w.names[0]]);
});

test('online card launchers fetch the current document while game navigation keeps its installed release',async()=>{
  const w=worker();
  assert.equal(await w.navigate('cards.html'),'network /orbix/cards.html');
  assert.equal(await w.navigate('card-workbench.html'),'network /orbix/card-workbench.html');
  assert.equal(await w.navigate('game.html'),'cached /orbix/game.html');
  assert.equal(w.network.length,2);
});

test('both card launchers remain available from the complete offline cache',async()=>{
  const w=worker({online:false});
  assert.equal(await w.navigate('cards.html'),'cached /orbix/cards.html');
  assert.equal(await w.navigate('card-workbench.html'),'cached /orbix/card-workbench.html');
});


test('cached images detach their cache stream while preserving bytes and response metadata',async()=>{
 const original=new Response(new Uint8Array([1,3,5,7]),{status:200,headers:{'Content-Type':'image/png','ETag':'image-version'}});
 const w=worker({cachedResponse:original});
 const response=await w.request('image.png',{destination:'image'});
 assert.equal(original.bodyUsed,true,'cache stream is fully consumed before returning the image');
 assert.notEqual(response,original);
 assert.equal(response.status,200);assert.equal(response.headers.get('ETag'),'image-version');
 assert.equal(response.headers.get('Content-Type'),'image/png');
 assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())),[1,3,5,7]);
});

test('cached music still supports bounded byte ranges offline',async()=>{
 const w=worker({online:false,cachedResponse:new Response(new Uint8Array([0,1,2,3,4,5]))});
 const response=await w.request('music.mp3',{destination:'audio',headers:new Headers({Range:'bytes=2-4'})});
 assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 2-4/6');
 assert.equal(response.headers.get('Content-Length'),'3');
 assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())),[2,3,4]);
 assert.equal(w.network.length,0);
});


function installationHistory(){
 const scope='https://example.test/orbix/',prefix='wispbound:'+scope+':';
 const stored=new Map();
 const caches={keys:async()=>[...stored.keys()],open:async name=>{
  if(!stored.has(name))stored.set(name,new Map());
  const entries=stored.get(name);
  return{put:async(key,response)=>entries.set(key,await response.text())};
 },delete:async name=>stored.delete(name)};
 function release(id,{broken=false}={}){
  const listeners=new Map();
  const context={URL,Response,Set,Array,Promise,caches,
   WISP_OFFLINE:{release:id,revision:id,files:['index.html','game.html','payload.txt']},importScripts(){},
   self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners.set(type,fn)},
   fetch:async url=>new Response(id+':'+url.pathname,{status:broken&&url.pathname.endsWith('payload.txt')?503:200})};
  vm.runInNewContext(readFileSync(new URL('../dist/worker.js',import.meta.url),'utf8'),context);
  const event=async type=>{let pending;listeners.get(type)({waitUntil:p=>pending=p});await pending;};
  return{install:()=>event('install'),activate:()=>event('activate'),key:prefix+id+':'+id};
 }
 return{release,stored};
}

test('a failed new release is removed so the next upgrade retains the active complete release',async()=>{
 const h=installationHistory(),a=h.release('a'),b=h.release('b'),c=h.release('c',{broken:true}),d=h.release('d');
 await a.install();await a.activate();await b.install();await b.activate();
 await assert.rejects(c.install(),/Offline file unavailable/);
 assert.equal(h.stored.has(c.key),false);
 await d.install();await d.activate();
 assert.deepEqual([...h.stored.keys()],[b.key,d.key]);
 assert.equal(h.stored.get(b.key).get('https://example.test/orbix/game.html'),'b:/orbix/game.html');
});

test('a failed reinstall of an identical existing release preserves its complete cache',async()=>{
 const h=installationHistory(),a=h.release('a');await a.install();await a.activate();
 const complete=[...h.stored.get(a.key)];
 await assert.rejects(h.release('a',{broken:true}).install(),/Offline file unavailable/);
 assert.deepEqual([...h.stored.get(a.key)],complete);
});
