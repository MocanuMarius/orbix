// Local actual-app preview/capture. No preview fixture is shipped in dist.
// node scripts/wisp-wake-preview.mjs [--capture] [--port=4196]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until} from './browser-probe.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const root=path.resolve('dist'),out=path.resolve('work/wisp-sparkles');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const bridge=`
// Local inspection bridge: the real App, WispFlight and Canvas2D view own all art/input.
let wakeSample=false,wakeLastLift=-1,wakeSetupEngine=null;
function wakePreviewLift(){if(!engine)return;document.querySelector('[data-action=wake-flight]')?.click();return engine.flap();}
function wakePreviewTick(){
 if(engine?.pixiReady&&engine!==wakeSetupEngine){
  wakeSetupEngine=engine;engine.setMuted(true);engine.reducedMotion=new URLSearchParams(location.search).get('reduced')==='1';
  parent.postMessage({type:'wisp-wake-ready'},location.origin);
 }
 if(wakeSample&&engine?.running&&!engine.paused&&!engine.dying&&!engine.finished){
  const near=engine.getNearbyObstacles().find(o=>!o.destroyed&&o.x-engine.distance-engine.player.x<145&&o.x+o.width>engine.distance+engine.player.x);
  const target=near?engine.obstacleCenter(near):engine.height*.52;
  if(engine.player.y>target&&engine.player.vy>0&&engine.time-wakeLastLift>.35){wakePreviewLift();wakeLastLift=engine.time;}
 }
 requestAnimationFrame(wakePreviewTick);
}
requestAnimationFrame(wakePreviewTick);
window.__wakePreview={get engine(){return engine},sample(){wakeSample=true;wakePreviewLift();},stop(){wakeSample=false;}};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='wisp-wake-preview')return;
 if(event.data.action==='sample')__wakePreview.sample();
 if(event.data.action==='lift')wakePreviewLift();
});
muted=true;engine?.setMuted(true);music.setEnabled(false);
`;
const wrapper=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wisp flight motion preview</title><style>
*{box-sizing:border-box}body{margin:0;padding:16px;background:#0b1417;color:#e9e9d6;font:14px system-ui,sans-serif}main{max-width:900px;margin:auto}h1{font-size:19px;margin:0 0 8px}p{color:#b9c9bd;line-height:1.5}nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button{min-height:44px;padding:8px 14px;border:1px solid #72867a;border-radius:5px;background:#23372f;color:inherit;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #e9e9ca;outline-offset:2px}.stage{position:relative;overflow:hidden;border:1px solid #55695e}iframe{width:900px;height:405px;display:block;border:0;transform-origin:top left;background:#0a1114}small{color:#aebeb4}
</style><main><h1>Wisp flight motion</h1><p>Actual flight, HUD and terrain. Fly the short sample or use Lift to follow your own curve. Audio is muted.</p><nav><button id="sample">Fly sample</button><button id="lift">Lift</button><button id="restart">Restart</button><button id="reduced" aria-pressed="false">Reduced motion</button></nav><div class="stage"><iframe title="Interactive Wispbound flight at Pixel 10 landscape scale"></iframe></div><p><small>Ivory marks follow the flight path. Lift leaves a brief rearward sparkle fan. This isolated seed resets on Restart and leaves your expedition untouched.</small></p><p id="status" role="status">Loading flight…</p></main><script>
const frame=document.querySelector('iframe'),stage=document.querySelector('.stage');let reduced=false;
function reset(){frame.src='/game.html?mock=boundary&cards=1&biome=pinewood&course=1&reduced='+(reduced?1:0);document.querySelector('#status').textContent='Loading flight…';}
function send(action){frame.contentWindow.postMessage({type:'wisp-wake-preview',action},location.origin);}
document.querySelector('#sample').onclick=()=>send('sample');document.querySelector('#lift').onclick=()=>send('lift');document.querySelector('#restart').onclick=reset;
document.querySelector('#reduced').onclick=e=>{reduced=!reduced;e.target.setAttribute('aria-pressed',String(reduced));reset();};
function fit(){const scale=Math.min(1,Math.max(.1,(innerWidth-32)/900));stage.style.width=(900*scale+2)+'px';stage.style.height=(405*scale+2)+'px';frame.style.transform='scale('+scale+')';}new ResizeObserver(fit).observe(document.documentElement);fit();
addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='wisp-wake-ready')document.querySelector('#status').textContent='Ready · '+(reduced?'Reduced motion':'Normal motion');});reset();
</script></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let data,type;
  if(url.pathname==='/'){data=wrapper;type=mime['.html'];}
  else{
   const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(!file.startsWith(root+path.sep))throw Error('Outside preview');
   data=await fs.readFile(file);type=mime[path.extname(file)]||'application/octet-stream';
   if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
  }
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
 }catch(error){res.writeHead(404).end(error.message);}
});
await new Promise(r=>server.listen(Number(args.port)||4196,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
console.log('Actual Wisp flight preview: '+base+'/');
if(args.capture){
 await fs.mkdir(out,{recursive:true});const b=await chrome(['--mute-audio']);
 try{
  await b.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:2,mobile:true});
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
  const evidence=[];
  for(const reduced of [false,true]){
   const mode=reduced?'reduced':'normal',frames=path.join(out,mode+'-frames');await fs.mkdir(frames,{recursive:true});
   await b.visit(base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&reduced='+(reduced?1:0));
   await until(()=>b.ev('!!__wakePreview?.engine?.pixiReady&&!!document.querySelector("[data-action=wake-flight]")'),'actual flight');
   await b.ev(`(()=>{const e=__wakePreview.engine;document.querySelector('[data-action=wake-flight]').click();cancelAnimationFrame(e.raf);e.raf=null;e.reducedMotion=${reduced};e.resumeElapsed=e.resumeRampSeconds;e.accumulator=1/60;e.render();e.notify();e.flap();e.render();e.accumulator=0;})()`);
   await b.shot(path.join(out,mode+'-lift-onset.png'));
   await fs.writeFile(path.join(out,mode+'-lift-onset.json'),JSON.stringify(await b.ev('(()=>{const e=__wakePreview.engine;return {time:e.time,captureTime:e.captureTime,distance:e.distance,renderDistance:e.renderDistance,y:e.player.y,renderY:e.renderPlayerY,playerX:e.player.x,marks:e.wispWake.marks.filter(m=>m.active)}})()'),null,2));
   let lastLift=0;
   for(let i=0;i<(Number(args.frames)||180);i++){
    const state=await b.ev(`(()=>{const e=__wakePreview.engine;for(let j=0;j<2;j++){
      const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
      const target=near?e.obstacleCenter(near):e.height*.52;
      if(e.player.y>target&&e.player.vy>0&&e.time-${lastLift}>.35){e.flap();}
      e.step(1/60);
     }e.accumulator=1/60;e.render();e.accumulator=0;
     return {frame:${i},time:e.time,distance:e.distance,y:e.player.y,vy:e.player.vy,lastLift:e.lastFlapTime,reduced:e.reducedMotion,marks:e.wispWake.count,births:e.wispWake.births,dying:e.dying,renderer:e.pixiView.constructor.name};})()`);
    lastLift=state.lastLift;await b.shot(path.join(frames,String(i).padStart(4,'0')+'.png'));evidence.push({mode,...state});
    if(i===24||i===100)await fs.copyFile(path.join(frames,String(i).padStart(4,'0')+'.png'),path.join(out,mode+(i===24?'-climb.png':'-descent.png')));
   }
  }
  await fs.writeFile(path.join(out,'capture-evidence.json'),JSON.stringify({source:'Production App + WispFlight + WispFlightView; manually stepped at 60Hz, captured at 30fps',errors:b.errors,frames:evidence},null,2));
  console.log('Captured normal/reduced six-second actual-game samples in '+out);
 }finally{b.close();server.close();}
}
