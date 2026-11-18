// Ordinary play benchmark on the Android emulator, hands-off: a fresh real run with the dev autopilot (?autopilot=1:
// dist/flight-autopilot.mjs flies, invulnerable) through N flights; the page records FPS per flight
// (window.__autopilotFlights) and an in-page driver clicks through the menus between flights.
//   node scripts/perf/android/play.mjs --label before --flights 3 [--root dist] [--query gl=0] [--desktop --throttle 4]
// --desktop runs the same driver in local headless Chrome (phone emulation, CPU throttle) instead of the emulator.
// Saves outputs/perf/android/<date>-<label>-play/result.json (+ screenshots on the emulator).
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {startServer,launch,emulatePhone,delay,until} from '../lib.mjs';
import {listTargets,evaluate,ensureForward} from './connect.mjs';

const argv=process.argv.slice(2),A={};for(let i=0;i<argv.length;i++){const m=argv[i].match(/^--([^=]+)(?:=(.*))?$/);if(!m)continue;A[m[1]]=m[2]??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);}
const label=A.label||'play',flights=Number(A.flights||3),port=Number(A.port||4183),day=new Date().toISOString().slice(0,10);
const out=path.resolve('outputs/perf/android',`${day}-${label}-play${A.desktop?'-desktop':''}`);await fs.mkdir(out,{recursive:true});
const log=(...x)=>console.log('[play]',...x);

// In-page driver: clicks through the game between flights (same order as scripts/perf/session.mjs).
const DRIVER=`(()=>{if(window.__driver)return 'running';window.__driver={steps:0,log:[]};
const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled};
const all=s=>[...document.querySelectorAll(s)].filter(vis);
const click=e=>{e.click();window.__driver.log.push((e.dataset.action||e.textContent.trim()).slice(0,30));window.__driver.log=window.__driver.log.slice(-30)};
const order=['new-game','skip-practice','skip-practice-once','practice-skip-to-start','confirm-new-game','keep-flight-reward','confirm-starting-gift','new-gift','confirm-gift','start-run','death-continue','retry','flight-reward-open-pack','flight-reward-continue','pick-reward','card-reward-continue','victory-next','reward-earnings','continue','dream-accept','dream-wake','next-map','launch','node','continue-run','close-power','close-sheet'];
setInterval(()=>{window.__driver.steps++;
 if(document.querySelector('.stress-host'))return;
 const wake=all('.entry-depart:not([disabled]),[data-action=wake-flight]')[0];if(wake){click(wake);return}
 if(document.body.classList.contains('playing')&&!document.querySelector('dialog[open]'))return;
 const dlg=document.querySelector('dialog[open]');
 if(dlg){const inside=s=>[...dlg.querySelectorAll(s)].filter(vis);for(const x of ['skip-practice-once','practice-skip-to-start','remember-skip-practice','confirm-new-game','confirm-starting-gift','death-continue','close-sheet','resume']){const e=inside('[data-action="'+x+'"]')[0];if(e){click(e);return}}
  const w=inside('button').find(e=>/got it|ok|continue|start|begin|next|done|take|claim|keep|collect|close/i.test(e.textContent));if(w){click(w);return}}
 const word=all('button,[role=button]').find(e=>/^(got it|ok|okay|continue|start|begin|understood|next|done|take|claim|keep|collect|onward|depart|tap to depart|open)$/i.test(e.textContent.trim())&&!['menu','settings','new-game'].includes(e.dataset.action));
 for(const a of order){const e=all('[data-action="'+a+'"]')[0];if(e){click(e);return}}
 const next=all('[data-action=preview-node],[data-action=map-node],[data-action=route-node]')[0];if(next){click(next);return}
 if(word){click(word);return}
},900);return 'started'})()`;

async function runDesktop(){
  const srv=await startServer(A.root||'dist',0),b=await launch();
  try{
    await emulatePhone(b,{throttle:Number(A.throttle||4)});
    const q=new URLSearchParams({cards:'1',autopilot:'1'});for(const [k,v] of new URLSearchParams(A.query||''))q.set(k,v);
    await b.send('Page.navigate',{url:`${srv.base}/game.html?${q}`});await delay(4000);
    await b.ev(DRIVER);
    const res=await until(async()=>{const n=await b.ev('(window.__autopilotFlights||[]).length');return n>=flights&&b.ev('window.__autopilotFlights');},'flights',flights*240000,3000);
    await b.shot(path.join(out,'end.png'));return {device:await b.ev('({dpr:devicePixelRatio,viewport:innerWidth+"x"+innerHeight})'),flights:res,log:await b.ev('window.__driver.log')};
  }finally{await b.close();srv.close();}
}
async function runEmulator(){
  const srv=await startServer(A.root||'dist',port,{noCache:true});
  try{
    ensureForward();
    const q=new URLSearchParams({cards:'1',autopilot:'1',run:String(Date.now())});for(const [k,v] of new URLSearchParams(A.query||''))q.set(k,v);
    const url=`http://10.0.2.2:${port}/game.html?${q}`;
    const targets=await listTargets();const t=targets.find(x=>x.url!=='about:blank')||targets[0];
    if(t)await evaluate(`(location.href=${JSON.stringify(url)},1)`,t.id).catch(()=>{});
    if(!t)execFileSync('adb',['shell','am','start','-a','android.intent.action.VIEW','-d',`'${url}'`,'com.android.chrome']);try{execFileSync('adb',['shell','monkey','-p','com.android.chrome','-c','android.intent.category.LAUNCHER','1']);}catch{}
    const id=await until(async()=>(await listTargets()).find(x=>x.url.includes('autopilot=1'))?.id,'tab',60000,1000);
    await delay(6000);await evaluate(DRIVER,id);
    let shots=0;
    const res=await until(async()=>{const n=await evaluate('(window.__autopilotFlights||[]).length',id);
      if(n>shots){shots=n;try{await fs.writeFile(path.join(out,`after-flight-${n}.png`),execFileSync('adb',['exec-out','screencap','-p'],{maxBuffer:64<<20}));}catch{}}
      return n>=flights&&evaluate('window.__autopilotFlights',id);},'flights',flights*300000,4000);
    return {device:await evaluate('({dpr:devicePixelRatio,viewport:innerWidth+"x"+innerHeight,ua:navigator.userAgent})',id),flights:res,log:await evaluate('window.__driver.log',id)};
  }finally{srv.close();}
}
const result=A.desktop?await runDesktop():await runEmulator();
await fs.writeFile(path.join(out,'result.json'),JSON.stringify({day,label,mode:A.desktop?'desktop':'emulator',query:A.query||'',...result},null,1));
for(const f of result.flights)log(`${f.level}: ${f.avgFps} fps avg, 1% low ${f.low1Fps}, >33ms ${f.over33}, longest ${f.longestMs} ms (${f.seconds} s)`);
log('saved',out);
