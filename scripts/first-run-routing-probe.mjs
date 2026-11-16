import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const input=process.argv[2],remote=/^https?:/.test(input),root=path.resolve(input);
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside dist');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
if(!remote)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=remote?input.replace(/\/$/,''):'http://127.0.0.1:'+server.address().port;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'orbix-first-run-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--mute-audio','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<180;i++){try{const v=await fn();if(v)return v;}catch{}await delay(100);}throw Error('Timed out '+label);}
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map();
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const shown=s=>ev('!!Array.from(document.querySelectorAll('+JSON.stringify(s)+')).find(b=>b.getClientRects().length&&getComputedStyle(b).visibility!=="hidden")');
 const tap=async(action)=>{const sel='[data-action="'+action+'"]';await until(()=>shown(sel),action);await ev('Array.from(document.querySelectorAll('+JSON.stringify(sel)+')).find(b=>b.getClientRects().length).click()');};
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:base+'/game.html?cards=1'});await tap('tutorial');await until(()=>shown('.prologue-map'),'tutorial');
 assert.equal(await shown('.card-starter-sheet'),false);await tap('skip-practice');await tap('skip-practice-once');
 await until(()=>shown('[data-action=new-game]'),'back to home');assert.equal(await shown('.card-starter-sheet'),false);
 await tap('new-game');await until(()=>shown('.prologue-map'),'new game starts practice');assert.equal(await shown('.card-starter-sheet'),false);
 await tap('skip-practice');await tap('skip-practice-once');await until(()=>shown('.card-starter-sheet'),'real draft');
 const gifts=await ev('Array.from(document.querySelectorAll("[data-action=new-gift]")).map(b=>b.dataset.id)');
 assert.equal(new Set(gifts).size,3);await tap('new-gift');await tap('confirm-starting-gift');
 await until(()=>shown('.game-map-screen:not(.prologue-map)'),'real map');
 assert.equal(await shown('.card-starter-sheet'),false);
 console.log(JSON.stringify({input,viewport:'900x405',standaloneTutorialReturnsHome:true,newGameTutorialSkipsToDraft:true,uniqueStarterChoices:gifts.length,confirmedGiftEntersCampaign:true}));
}finally{socket?.close();browser.kill();if(!remote)await new Promise(r=>server.close(r));}
