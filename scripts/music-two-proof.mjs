// v1.0-music proof. Starts its own server on 4241 and a throwaway headless
// Chrome profile, renders every piece offline, measures the hand-overs, the
// Lift cue and the effects, then runs the game with ?music=2 for three
// minutes to measure scheduler cost and live audio nodes.
//   node scripts/music-two-proof.mjs [--seconds=180] [--skip-game]
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,delay,until} from './browser-probe.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,v]=a.replace(/^--/,'').split('=');return [k,v??true];}));
const PORT=4241,base=`http://127.0.0.1:${PORT}`,out=path.resolve('outputs/music-audit');
await fs.mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore',windowsHide:true});
const result={at:new Date().toISOString()};
let browser;
try{
 await until(async()=>(await fetch(base+'/design-lab/music.html')).ok,'server');
 browser=await chrome(['--autoplay-policy=no-user-gesture-required','--window-size=900,405']);
 await browser.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:false});
 await browser.visit(base+'/design-lab/music.html');
 await until(()=>browser.ev('!!window.__musicLab'),'lab');
 await browser.shot(path.join(out,'lab-900x405.png'));
 const m=`import('/design-lab/music-measure.mjs')`;
 if(args['skip-offline']){Object.assign(result,JSON.parse(await fs.readFile(path.join(out,'proof.json'),'utf8')));delete result.error;result.at=new Date().toISOString();}
 else{
 result.pieces=await browser.ev(`${m}.then(m=>m.measurePieces())`);console.log('pieces done');
 result.clicks=await browser.ev(`${m}.then(m=>m.measureClicks())`);console.log('clicks done');
 result.handovers=[];
 for(const [a,b] of [['moss','pines'],['pines','ferry'],['ferry','paper'],['paper','moss']])result.handovers.push(await browser.ev(`${m}.then(m=>m.measureHandover('${a}','${b}'))`));
 console.log('handovers done');
 result.liftCue=await browser.ev(`${m}.then(m=>m.measureLiftCue())`);
 result.effects=await browser.ev(`${m}.then(m=>m.measureEffects())`);
 result.labErrors=[...browser.errors];
 }
 if(!args['skip-game']){
  const seconds=Number(args.seconds||180);
  // index.html hosts the game document in a same-origin frame; the engine lives there.
  await browser.visit(base+'/index.html?music=2');
  await until(()=>browser.ev('!!(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo'),'music two in game',300);
  // A fresh profile reloads the game frame once or twice while the service worker installs (with or without the flag).
  await delay(20000);
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:5,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:5,button:'left',clickCount:1});
  // Headless input may not reach the frame; the autoplay flag allows the same unlock a tap performs.
  await browser.ev('(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo.unlock()');
  await until(()=>browser.ev('(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo.info().piece'),'music started',100);
  const samples=[];const flights=[{flame:80,maxFlame:100,lives:3,maxLives:3},{flame:80,maxFlame:100,lives:3,maxLives:3,boss:{phase:2}},{flame:10,maxFlame:100,lives:3,maxLives:3}];
  const t0=Date.now();let forced=false;
  while(Date.now()-t0<seconds*1000){
   const t=(Date.now()-t0)/1000;
   // Walk through the game's situations: map, flight, Guardian, pause, Rest.
   const phase=Math.floor(t/15)%6;
   await browser.ev(`(()=>{const m=(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo;const f=${JSON.stringify(flights)};const p=${phase};if(p===0)m.setScene('menu');else if(p===1){m.setScene('flight');m.setFlight(f[0]);}else if(p===2){m.setScene('flight');m.setFlight(f[1]);}else if(p===3){m.setScene('pause');}else if(p===4){m.setScene('flight');m.setFlight(f[2]);}else m.setScene('rest');})()`);
   if(!forced&&t>60){forced=true;await browser.ev(`(()=>{const m=(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo,id=m.info().piece||m.info().next;if(id)m.play(id,{skipToHandover:true});})()`);}
   samples.push(await browser.ev(`(()=>{const m=(document.querySelector("iframe")?.contentWindow||window).__wispMusicTwo,s=m.stats,i=m.info();return {t:${t.toFixed(1)},piece:i.piece,level:i.level,reason:i.reason,live:s.live,ms:s.schedulerMs,audio:s.audioSeconds,ticks:s.ticks,maxTick:s.maxTickMs,voices:s.voices?.peakVoices,dropped:s.voices?.dropped,state:i.state};})()`));
   await delay(5000);
  }
  const last=samples.at(-1);
  result.game={seconds,samples,schedulerMsPerAudioSecond:last.ms/Math.max(1,last.audio),maxTickMs:last.maxTick,liveNodes:{min:Math.min(...samples.map(s=>s.live)),max:Math.max(...samples.map(s=>s.live)),last:last.live},pieces:[...new Set(samples.map(s=>s.piece))],errors:[...browser.errors]};
 }
}catch(error){result.error=String(error?.stack||error);}finally{
 browser?.close();server.kill();
}
await fs.writeFile(path.join(out,'proof.json'),JSON.stringify(result,null,1));
console.log(JSON.stringify(result,null,1).slice(0,200000));
