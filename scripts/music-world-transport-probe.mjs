import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chrome,delay,until} from './browser-probe.mjs';

// Exercise the real MP3/media clock in Chrome with output muted throughout.
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Music transport proof</title>');return;}
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
 try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript':'audio/mpeg','Content-Length':data.length});res.end(data);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chrome(['--mute-audio','--autoplay-policy=no-user-gesture-required']);
 await browser.visit(base+'/');
 await until(()=>browser.ev('document.readyState === "complete"'),'probe page',120);
 await browser.ev(`(async()=>{
  const {createMusic}=await import('/music.mjs');
  window.players=[];
  window.musicDocument=new EventTarget();musicDocument.hidden=false;
  function MutedAudio(src){const player=new Audio(src);player.muted=true;players.push(player);return player;}
  window.music=createMusic({document:musicDocument,AudioClass:MutedAudio,storage:{getItem:()=>null,setItem(){}}});
  musicDocument.dispatchEvent(new Event('pointerdown'));
  window.readMusic=()=>({transport:music.getTransport(),stems:players.map(p=>({time:p.currentTime,rate:p.playbackRate,paused:p.paused,muted:p.muted,preservesPitch:p.preservesPitch}))});
 })()`);
 await until(()=>browser.ev('players.length===3 && players.every(p=>p.readyState>=3 && !p.paused && p.currentTime>.1)'),'three real audio stems',120);
 const start=await browser.ev('readMusic()');await delay(1000);const normal=await browser.ev('readMusic()');
 const normalAdvance=normal.transport.time-start.transport.time;
 assert.ok(normalAdvance>.75&&normalAdvance<1.3,JSON.stringify({normalAdvance}));
 await browser.ev('music.setFlight({worldRate:.35,flame:100,blackHole:{rate:100,nearest:{distance:0}}})');
 const slowStart=await browser.ev('readMusic()');await delay(1600);const slow=await browser.ev('readMusic()');
 const slowAdvance=slow.transport.time-slowStart.transport.time;
 assert.ok(slowAdvance>.4&&slowAdvance<.75,JSON.stringify({slowAdvance}));
 assert.ok(slow.stems.every(p=>p.rate===.35&&!p.paused&&!p.preservesPitch&&p.muted));
 assert.equal(slow.transport.bpm,88);assert.equal(slow.transport.rate,.35);
 await browser.ev('music.setFlight({worldRate:0,paused:true})');const paused=await browser.ev('readMusic()');
 await delay(500);const held=await browser.ev('readMusic()');
 assert.equal(held.transport.rate,0);assert.ok(held.stems.every((p,i)=>p.paused&&p.rate===.35&&Math.abs(p.time-paused.stems[i].time)<.001));
 await browser.ev('music.setFlight({worldRate:.1,flame:100})');const resumeStart=await browser.ev('readMusic()');
 assert.ok(resumeStart.stems.every((p,i)=>p.time>=held.stems[i].time-.001&&p.time<held.stems[i].time+.03));
 await delay(1500);const resumed=await browser.ev('readMusic()');
 const resumeAdvance=resumed.transport.time-resumeStart.transport.time;
 assert.ok(resumeAdvance>.07&&resumeAdvance<.25,JSON.stringify({resumeAdvance}));
 const skew=Math.max(...resumed.stems.map(p=>p.time))-Math.min(...resumed.stems.map(p=>p.time));
 assert.ok(skew<.08,JSON.stringify({skew}));
 await browser.ev('musicDocument.hidden=true; musicDocument.dispatchEvent(new Event("visibilitychange"))');
 const hidden=await browser.ev('readMusic()');assert.ok(hidden.stems.every(p=>p.paused));
 await browser.ev('music.setFlight({worldRate:0,paused:true}); musicDocument.hidden=false; musicDocument.dispatchEvent(new Event("visibilitychange")); music.setEnabled(false); music.setEnabled(true)');
 assert.ok((await browser.ev('readMusic()')).stems.every(p=>p.paused));
 await browser.ev('music.destroy()');
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));assert.equal(browser.badResponses.length,0,JSON.stringify(browser.badResponses));
 console.log(JSON.stringify({normalAdvance,slowAdvance,slowRate:slow.transport.rate,effectiveBpm:88*.35,intrinsicBpm:slow.transport.bpm,pausedTimeFrozen:true,resumeAdvance,resumeRate:resumed.transport.rate,phaseSkewSeconds:skew,hiddenPaused:true,noPausedEnableRestart:true,outputMuted:true},null,2));
}finally{browser?.close();await new Promise(resolve=>server.close(resolve));}
