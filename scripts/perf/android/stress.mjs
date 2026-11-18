// Run the built-in stress test flight (?scene=stress) on the Android emulator, hands-off.
//   node scripts/perf/android/stress.mjs --label before [--root dist] [--gpu swiftshader] [--query gl=0] [--runs 1]
// - Boots the AVD Orbix_Pixel if no emulator is attached (host GPU unless --gpu swiftshader; with --gpu swiftshader it
//   restarts the emulator in that mode and restores host mode afterwards), locks landscape.
// - Serves --root (default dist/) on 127.0.0.1:<port> (the emulator reaches it as 10.0.2.2:<port>).
// - Opens the scene in the emulator's Chrome, presses Start itself, screenshots mid-run and the result panel,
//   reads window.__stressResult and saves everything in outputs/perf/android/<date>-<label>/.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {startServer,delay,until} from '../lib.mjs';
import {listTargets,evaluate,ensureForward} from './connect.mjs';

const argv=process.argv.slice(2),A={};for(let i=0;i<argv.length;i++){const m=argv[i].match(/^--([^=]+)(?:=(.*))?$/);if(!m)continue;A[m[1]]=m[2]??(argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true);}
const label=A.label||'run',gpu=A.gpu==='swiftshader'?'swiftshader_indirect':'host',runs=Number(A.runs||1),port=Number(A.port||4180);
const SDK='F:/Android/sdk',ADB=process.env.ADB||'adb',EMU=`${SDK}/emulator/emulator.exe`;
const env={...process.env,ANDROID_SDK_ROOT:'F:\\Android\\sdk',ANDROID_AVD_HOME:'F:\\Android\\avd'};
const day=new Date().toISOString().slice(0,10),out=path.resolve('outputs/perf/android',`${day}-${label}${gpu==='host'?'':'-swiftshader'}`);
await fs.mkdir(out,{recursive:true});
const adb=(...args)=>execFileSync(ADB,args,{encoding:'utf8',env}).trim();
const log=(...x)=>console.log('[android]',...x);

function attached(){try{return /emulator-\d+\s+device/.test(adb('devices'));}catch{return false;}}
function emulatorGpu(){try{return execFileSync('powershell',['-NoProfile','-Command',"(Get-CimInstance Win32_Process -Filter \"Name='qemu-system-x86_64.exe'\").CommandLine"],{encoding:'utf8'}).match(/-gpu\s+(\S+)/)?.[1]||null;}catch{return null;}}
async function boot(mode){
  log('starting emulator, gpu',mode);
  spawn(EMU,['-avd','Orbix_Pixel','-gpu',mode,'-no-snapshot-save','-no-boot-anim','-no-audio'],{env,detached:true,stdio:'ignore'}).unref();
  await until(()=>attached(),'emulator attached',240000,2000);
  await until(()=>{try{return adb('shell','getprop','sys.boot_completed')==='1';}catch{return false;}},'boot completed',300000,2000);
  await delay(5000);
}
async function kill(){try{adb('emu','kill');}catch{}await until(()=>!attached(),'emulator stopped',90000,1000).catch(()=>{});await delay(3000);}
async function ensureEmulator(mode){
  const running=attached(),current=running?emulatorGpu():null;
  if(running&&(current===mode||(!current&&mode==='host')))return false;
  if(running)await kill();
  await boot(mode);return true;
}
function landscape(){try{adb('shell','settings','put','system','accelerometer_rotation','0');adb('shell','cmd','window','user-rotation','lock','1');}catch(e){log('rotation',e.message);}}
async function screenshot(file){try{const png=execFileSync(ADB,['exec-out','screencap','-p'],{env,maxBuffer:64<<20});await fs.writeFile(file,png);}catch(e){log('screenshot failed',e.message);}}
async function openInChrome(url){
  ensureForward();
  // Navigate the existing foreground tab (new tabs start hidden and stall requestAnimationFrame).
  const targets=await listTargets().catch(()=>[]);const t=targets.find(x=>x.url!=='about:blank')||targets[0];
  if(t){await evaluate(`(location.href=${JSON.stringify(url)},1)`,t.id).catch(()=>{});}
  else adb('shell','am','start','-a','android.intent.action.VIEW','-d',url,'com.android.chrome');
  adb('shell','am','start','-a','android.intent.action.VIEW','-d',url,'com.android.chrome'); // brings Chrome to the front
  return until(async()=>(await listTargets()).find(x=>x.url.includes('scene=stress'))?.id,'stress tab',60000,1000);
}

const restore=gpu!=='host'||A.restore;
let srv=null;
try{
  await ensureEmulator(gpu);landscape();
  srv=await startServer(A.root||'dist',port);
  const q=new URLSearchParams({scene:'stress'});for(const [k,v] of new URLSearchParams(A.query||''))q.set(k,v);
  const url=`http://10.0.2.2:${port}/game.html?${q}`;
  const results=[];
  for(let run=1;run<=runs;run++){
    const target=await openInChrome(url+`&run=${run}-${Date.now()}`);
    await until(()=>evaluate('!!document.querySelector(".stress-confirm button")',target),'stress confirm',120000,1000);
    const device=await evaluate('({ua:navigator.userAgent,dpr:devicePixelRatio,viewport:innerWidth+"x"+innerHeight,screen:screen.width+"x"+screen.height})',target);
    await evaluate('(document.querySelector(".stress-confirm button").click(),1)',target);
    log(`run ${run}: started on`,device.viewport,'dpr',device.dpr,'gpu',gpu);
    await delay(25000);await screenshot(path.join(out,`run${run}-mid.png`));
    const result=await until(()=>evaluate('window.__stressResult',target),'stress result',600000,2000);
    await delay(800);await screenshot(path.join(out,`run${run}-result.png`));
    results.push({run,gpuMode:gpu,root:A.root||'dist',query:A.query||'',device,...result});
    log(result.summary);
  }
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify({day,label,gpuMode:gpu,results},null,1));
  log('saved',out);
}finally{
  srv?.close();
  if(restore&&gpu!=='host'){await kill();await boot('host');landscape();log('emulator back in host GPU mode');}
}
