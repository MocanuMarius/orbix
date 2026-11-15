import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function worker({online=true}={}) {
  const scope='https://example.test/orbix/',prefix='wispbound:'+scope+':';
  const names=[prefix+'oldest:a',prefix+'previous:b',prefix+'current:c'];
  const listeners=new Map(),removed=[],network=[];
  const cache={match:async key=>new Response('cached '+new URL(key).pathname)};
  const context={URL,Response,Set,Array,Promise,
    WISP_OFFLINE:{release:'current',revision:'c',files:['cards.html','card-workbench.html','game.html']},
    importScripts(){},
    self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners.set(type,fn)},
    caches:{keys:async()=>names,open:async()=>cache,delete:async key=>{removed.push(key);return true;}},
    fetch:async request=>{network.push(request.url);if(!online)throw Error('offline');return new Response('network '+new URL(request.url).pathname);}};
  vm.runInNewContext(readFileSync(new URL('../dist/worker.js',import.meta.url),'utf8'),context);
  const activate=async()=>{let pending;listeners.get('activate')({waitUntil:p=>pending=p});await pending;};
  const navigate=async file=>{let response;listeners.get('fetch')({request:{method:'GET',mode:'navigate',url:scope+file,headers:new Headers()},respondWith:p=>response=p});return (await response).text();};
  return {activate,navigate,removed,names,network};
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
