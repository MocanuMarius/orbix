// Full-App verification of the disposable, phone-usable Collector inspector.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';

const root=path.resolve('dist'),out=path.resolve('work/collector-swing-route-probe');
await fs.mkdir(out,{recursive:true});
const bridge=`
window.__swingRoute={href:location.href,get engine(){return engine},
 async prepare(fallback=false){
  const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;window.requestAnimationFrame=()=>null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();
  await document.fonts.ready;await e.environmentArtReady;
  this.packets=e.layout.embers.filter(p=>p.id?.startsWith('collector-inspection-'));
  this.inputs=[];this.attachments=[];this.deliveries=[];this.samples=[];this.lastLift=-10;
  const attach=e.onCollectorAttach.bind(e);e.onCollectorAttach=(p,w)=>{if(this.packets.includes(p))this.attachments.push({id:p.id,time:e.time,y:w.cargoY,vy:w.reelVY});return attach(p,w)};
  const collect=e.collect.bind(e);e.collect=(p,d)=>{if(!p.collected&&this.packets.includes(p))this.deliveries.push({id:p.id,time:e.time,source:d,player:{...e.player},distance:e.distance});return collect(p,d)};
  const step=e.step.bind(e);e.step=dt=>{
   const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
   const target=near?e.obstacleCenter(near):e.height*.52;
   if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){
    const loads=e.collectors.filter(w=>w.cargo).map(w=>({index:w.collectorIndex,y:w.cargoY,vy:w.reelVY}));
    e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;
    this.inputs.push({time:e.time,loads});
    for(const old of loads){const w=e.collectors[old.index];if(w.cargoY!==old.y||w.reelVY!==old.vy)throw Error('Lift changed Spark momentum')}
   }
   step(dt);
   this.samples.push({time:e.time,playerY:e.player.y,playerVY:e.player.vy,dying:e.dying,
    collectors:e.collectors.map(w=>({phase:w.phase,x:w.cargoX,y:w.cargoY,vy:w.reelVY,cargo:w.cargo?.id}))});
  };
  if(fallback){e.pixiReady=false;e.pixiView.canvas.style.display='none';e.canvas.style.opacity='1'}
  e.renderScheduledFrame=()=>{};e.lastFrame=0;e.tick(1000);this.frame=0;
  return {collectors:e.collectors.length,packets:this.packets.length,width:e.width,height:e.height};
 },
 advance(hz,seconds){const e=engine;for(let i=0;i<Math.round(hz*seconds);i++)e.tick(1000+(++this.frame)*1000/hz+.00001);e.render();e.notify();return {time:e.time,dying:e.dying,carrying:e.collectors.filter(w=>w.cargo).length}},
 result(){return {attachments:this.attachments,deliveries:this.deliveries,inputs:this.inputs,samples:this.samples,collected:this.packets.map(p=>!!p.collected)}}
};`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))throw Error('Outside dist');
 let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(error){res.writeHead(404).end(String(error))}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio','--disable-background-timer-throttling']);
const report={viewport:[900,405],dpr:2,cases:[]};
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:2,mobile:true});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
 for(const [name,paired,hz,fallback] of [['single-20',false,20,false],['single-120',false,120,false],['twin-20',true,20,false],['twin-120',true,120,false],['fallback-twin-20',true,20,true],['fallback-twin-120',true,120,true]]){
  const url=base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&collector='+(paired?'twin':'1')+'&probe='+name;
  await b.visit(url);await until(()=>b.ev('window.__swingRoute?.href==='+JSON.stringify(url)+'&&window.__swingRoute?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),name,300);
  const initial=await b.ev('__swingRoute.prepare('+fallback+')');
  assert.equal(initial.collectors,paired?2:1);assert.equal(initial.packets,paired?2:1);
  const mid=await b.ev('__swingRoute.advance('+hz+',2)');assert.equal(mid.carrying,paired?2:1);
  await b.shot(path.join(out,name+'.png'));
  await b.ev('__swingRoute.advance('+hz+',5)');
  const result=await b.ev('__swingRoute.result()');
  assert.ok(result.samples.every(s=>!s.dying),name+' survives authored course');
  assert.equal(result.attachments.length,paired?2:1);assert.equal(result.deliveries.length,paired?2:1);
  assert.ok(result.collected.every(Boolean));assert.ok(result.inputs.filter(s=>s.loads.length).length>=2,'repeated real Lifts while towing');
  assert.ok(result.samples.some(s=>s.playerVY< -100&&s.collectors.some(w=>w.cargo&&w.vy>10)),'load keeps falling through a Lift');
  const match=report.cases.find(c=>c.paired===paired);if(match)assert.deepEqual(result,match.result,'real-flight fixed steps match paint cadence and renderer');
  report.cases.push({name,paired,hz,fallback,initial,result});console.log(name+': real route, latch, repeat Lifts and one contact payout per load');
 }
 report.errors=b.errors;assert.deepEqual(report.errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Route proof: '+out);
}finally{b.close();server.close()}
