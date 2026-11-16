// Disposable real-App evidence. Both builds use the same authored course,
// genuine Lift inputs, flat2 art, 900x405 layout and DPR3. Audio stays muted.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';
const out=path.resolve('work/collector-tether');await fs.mkdir(out,{recursive:true});
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const bridge=`
muted=true;music.setEnabled(false);
window.__tetherStudy={href:location.href,get engine(){return engine},
 async prepare(){
  const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();
  await document.fonts.ready;await e.environmentArtReady;
  // A disposable missed Spark and an equipped fast-recovery modifier make the
  // entire real latch/reel/delivery visible in this six-second art review.
  e.mod.wispCooldown=.4;
  const {WispCompanion}=await import('./wisp.mjs?v=collector-reel-1');e.wisp=new WispCompanion(e.player);
  this.packet={id:'tether-inspection',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y+20,phase:0};
  e.layout.embers.push(this.packet);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;
  this.events=[];this.lastLift=-10;
  const collect=e.collect.bind(e);e.collect=(p,d)=>{if(!p.collected)this.events.push({id:p.id,time:e.time,via:d?'collector':'body'});return collect(p,d);};
  e.accumulator=1/60;e.render();e.notify();
  return {seed:e.seed,terrain:e.terrain,width:e.width,height:e.height,playerX:e.player.x,playerY:e.player.y,scale:e.pixiView.scale,canvas:document.querySelector('#flight-canvas').getBoundingClientRect().toJSON()};
 },
 step(){const e=engine;
  const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
  const target=near?e.obstacleCenter(near):e.height*.52;
  if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;}
  e.step(1/60);
 },
 frame(){const e=engine;this.step();this.step();e.accumulator=1/60;e.render();e.notify();
  const w=e.getWispState();return {time:e.time,y:e.player.y,playerX:e.player.x,x:w.x,cy:w.y,depth:w.depth,phase:w.phase,carrying:w.carrying,cargo:w.cargoPose,dying:e.dying};},
 async normalPerf(){const e=engine,render=[],step=[],hud=[],gaps=[];let previous=0;
  const nativeStep=e.step.bind(e),nativeRender=e.render.bind(e),nativeNotify=e.notify.bind(e),nativeTick=e.tick.bind(e);
  const started=performance.now(),warm=started+500;
  e.step=dt=>{const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
    const target=near?e.obstacleCenter(near):e.height*.52;
    if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;}
    const at=performance.now();const result=nativeStep(dt);if(at>=warm)step.push(performance.now()-at);return result;};
  e.render=(...a)=>{const at=performance.now();const result=nativeRender(...a);if(at>=warm)render.push(performance.now()-at);return result;};
  e.notify=(...a)=>{const at=performance.now();const result=nativeNotify(...a);if(at>=warm)hud.push(performance.now()-at);return result;};
  e.tick=t=>{if(previous&&performance.now()>=warm)gaps.push(t-previous);previous=t;return nativeTick(t);};
  e.lastFrame=0;e.nextRenderAt=null;e.accumulator=0;e.raf=requestAnimationFrame(t=>e.tick(t));
  await new Promise(r=>setTimeout(r,6500));cancelAnimationFrame(e.raf);e.raf=null;
  return {render,step,hud,gaps,time:e.time,dying:e.dying,events:this.events,renderer:e.pixiView?.constructor.name,dpr:devicePixelRatio};
 },
 perf(){const e=engine,render=[],step=[];for(let i=0;i<720;i++){
  if(i%2===0){const at=performance.now();this.step();step.push(performance.now()-at);}
  e.accumulator=(i%2?1:0.5)/60;const at=performance.now();e.render();e.notify();render.push(performance.now()-at);
 }return {render,step,time:e.time,dying:e.dying,events:this.events,renderer:e.pixiView.constructor.name,dpr:devicePixelRatio};}
};`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),[,build,...parts]=url.pathname.split('/');
 const root=path.resolve(build==='before'?'work/collector-tether/before/dist':'dist'),file=path.resolve(root,parts.join('/'));
 if(!file.startsWith(root+path.sep))throw Error('Outside build');let data=await fs.readFile(file);
 if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch(e){res.writeHead(404).end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const stats=a=>{const s=a.toSorted((a,b)=>a-b);return {count:s.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],p99:s[Math.floor(s.length*.99)],max:s.at(-1),over8_33:s.filter(x=>x>1000/120).length};};
const browser=await chrome(['--mute-audio','--disable-background-timer-throttling']);
const report={note:'Actual App + HUD + WispFlightView. Staged inspector Spark, equipped .4 recovery multiplier; authored terrain retained. CPU render+HUD samples are a 120Hz budget check, not a physical-phone frame-rate claim.',viewport:[900,405],dpr:3,fps:30,seconds:6,clips:[],performance:[]};
try{
 await browser.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:3,mobile:true});
 await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
 for(const build of String(args.builds||'before,after').split(',')){
  async function prepare(biome){const url=base+'/'+build+'/game.html?mock=boundary&cards=1&biome='+biome+'&course=1&collectorArt=flat2&study='+Date.now();await browser.visit(url);
   await until(()=>browser.ev('window.__tetherStudy?.href==='+JSON.stringify(url)+'&&window.__tetherStudy?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),'real App '+build+' '+biome,300);
   return browser.ev('__tetherStudy.prepare()');}
  if(!args.perfOnly){
   const initial=await prepare('pinewood'),frames=path.join(out,build+'-frames');await fs.mkdir(frames,{recursive:true});
   if(build==='after'){
    await browser.ev('(()=>{const e=__tetherStudy.engine;e.flap();e.render();})()');await browser.shot(path.join(out,'wake-first-paint.png'));
    await fs.writeFile(path.join(out,'wake-first-paint.json'),JSON.stringify(await browser.ev('(()=>{const e=__tetherStudy.engine;return{time:e.time,captureTime:e.captureTime,distance:e.renderDistance,playerX:e.player.x,playerY:e.renderPlayerY,marks:e.wispWake.marks.filter(m=>m.active)}})()'),null,2));
    await browser.ev('(()=>{const e=__tetherStudy.engine;window.__savedWake=e.wispWake;e.wispWake=null;e.render();})()');await browser.shot(path.join(out,'wake-first-paint-without.png'));
    await browser.ev('(()=>{const e=__tetherStudy.engine;e.wispWake=window.__savedWake;delete window.__savedWake;})()');
    await prepare('pinewood');
   }
   const states=[];for(let i=0;i<180;i++){states.push(await browser.ev('__tetherStudy.frame()'));await browser.shot(path.join(frames,String(i).padStart(4,'0')+'.png'));}
   assert.ok(states.every(s=>!s.dying),'six-second actual course remains alive');
   assert.ok(states.some(s=>s.carrying),'real fetch shown');assert.ok(states.some(s=>s.depth<-.7)&&states.some(s=>s.depth>.7),'both depth passes');
   report.clips.push({build,initial,states,events:await browser.ev('__tetherStudy.events')});
   console.log(build+': captured actual six-second normal flight');
  }
  for(const biome of ['pinewood','moonruins']){
   const initial=await prepare(biome);const perf=await browser.ev(args.normal?'__tetherStudy.normalPerf()':'__tetherStudy.perf()');assert.equal(perf.dying,false);
   report.performance.push({build,biome,initial,...perf,render:stats(perf.render),step:stats(perf.step),hud:perf.hud?stats(perf.hud):null,gaps:perf.gaps?stats(perf.gaps):null});
   console.log(JSON.stringify({build,biome,render:stats(perf.render),step:stats(perf.step),hud:perf.hud?stats(perf.hud):null,gaps:perf.gaps?stats(perf.gaps):null}));
  }
 }
 report.errors=browser.errors;assert.equal(report.errors.length,0);await fs.writeFile(path.join(out,'report'+(args.normal?'-normal':args.perfOnly?'-perf':'')+'.json'),JSON.stringify(report,null,2));
}finally{browser.close();server.close();}
