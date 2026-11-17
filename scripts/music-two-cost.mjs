// v1.1-music: scheduler cost and live audio nodes over a continuous run on the lab page
// (the game frame reloads itself during first-run updates, with or without the flag).
//   node scripts/music-two-cost.mjs [--seconds=180]
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {chrome,delay,until} from './browser-probe.mjs';
const seconds=Number((process.argv.find(a=>a.startsWith('--seconds='))||'=180').split('=')[1]);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4241'},stdio:'ignore',windowsHide:true});
let b;const samples=[];
try{
 await until(async()=>(await fetch('http://127.0.0.1:4241/design-lab/music.html')).ok,'server');
 b=await chrome(['--autoplay-policy=no-user-gesture-required']);
 await b.visit('http://127.0.0.1:4241/design-lab/music.html');await until(()=>b.ev('!!window.__musicLab'),'lab');
 await b.ev(`(()=>{const m=window.__musicLab.music;m.setOverride(2);m.resumeRotation();})()`);
 const t0=Date.now();let forced=false;
 while(Date.now()-t0<seconds*1000){
  const t=(Date.now()-t0)/1000,level=Math.floor(t/20)%3;
  if(!forced&&t>40){forced=true;await b.ev(`(()=>{const m=window.__musicLab.music,id=m.info().piece;m.play(id,{skipToHandover:true});})()`);}
  samples.push(await b.ev(`(()=>{const m=window.__musicLab.music;m.setOverride(${level});const s=m.stats,i=m.info();return {t:${t.toFixed(1)},piece:i.piece,level:i.level,live:s.live,ms:s.schedulerMs,audio:s.audioSeconds,ticks:s.ticks,maxTick:s.maxTickMs,voices:s.voices?.peakVoices,dropped:s.voices?.dropped};})()`));
  await delay(5000);
 }
}finally{b?.close();server.kill();}
const last=samples.at(-1),out={seconds,msPerAudioSecond:last.ms/last.audio,meanTickMs:last.ms/last.ticks,maxTickMs:last.maxTick,live:{min:Math.min(...samples.slice(1).map(s=>s.live)),max:Math.max(...samples.map(s=>s.live)),last:last.live},pieces:[...new Set(samples.map(s=>s.piece))],samples};
await fs.writeFile('outputs/music-audit/cost.json',JSON.stringify(out,null,1));
console.log(JSON.stringify({...out,samples:undefined}));
