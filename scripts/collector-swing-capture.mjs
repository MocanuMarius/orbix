// Actual App capture: authored course, ordinary Lift inputs and production
// simulation/renderers. A missed Spark is staged behind the main wisp.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';

const root=path.resolve('dist'),out=path.resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'work/tow-swing-release/capture');
await fs.mkdir(out,{recursive:true});
const bridge=`
window.__swingCapture={href:location.href,get engine(){return engine},
 async prepare(){
  const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();
  await document.fonts.ready;await e.environmentArtReady;
  e.mod.wispCooldown=1;
  const {WispCompanion}=await import('./wisp.mjs?v='+Date.now());
  e.wisp=new WispCompanion(e.player);e.collectors=[e.wisp];e.syncCollectors();
  this.packet={id:'swing-capture-missed-spark',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y+20,phase:0};
  e.layout.embers.push(this.packet);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;
  this.events=[];this.lastLift=-10;this.inputs=[];this.original={x:this.packet.x-e.distance,y:this.packet.y};
  const attach=e.onCollectorAttach.bind(e);e.onCollectorAttach=(p,w)=>{if(p===this.packet)this.events.push({event:'attach',time:e.time,gap:w.reelGap});return attach(p,w)};
  const collect=e.collect.bind(e);e.collect=(p,d)=>{if(!p.collected&&p===this.packet)this.events.push({event:'collect',time:e.time,via:d?'collector':'body',source:d?{x:d.worldX-e.distance,y:d.y,previousX:d.previousWorldX-(e.previousDistance??e.distance),previousY:d.previousY}:null,body:{x:e.player.x,y:e.player.y},original:this.original});return collect(p,d)};
  e.accumulator=1/60;e.render();e.notify();
  return {width:e.width,height:e.height,playerX:e.player.x,playerY:e.player.y,scale:e.pixiView.scale,canvas:document.querySelector('#flight-canvas').getBoundingClientRect().toJSON()};
 },
 frame(advance=true){const e=engine;
  for(let i=0;i<(advance?2:0);i++){
   const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
   const target=near?e.obstacleCenter(near):e.height*.52;
   if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;this.inputs.push({time:e.time,whileTowing:!!e.wisp.cargo,y:e.player.y,vy:e.player.vy})}
   e.step(1/60);
  }
  e.accumulator=1/60;e.render();e.notify();
  const w=e.getWispState();
  return {time:e.time,y:e.player.y,playerX:e.player.x,distance:e.distance,dying:e.dying,
   carrying:!!e.wisp.cargo,cargoX:e.wisp.cargoX,cargoY:e.wisp.cargoY,gap:e.wisp.reelGap,
   stage:e.wisp.towStage,cordAlpha:w.tetherPose?.alpha,side:e.wisp.sling?.side,
   collector:{x:w.x,y:w.y,depth:w.depth},collected:!!this.packet.collected};
 }
};`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))throw Error('Outside dist');
 let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(error){res.writeHead(404).end(String(error))}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio','--disable-background-timer-throttling']);
const report={note:'Actual application on the authored Pinewood course. A missed Spark and normal 10-second Collector recovery are staged for inspection. Ordinary Lift inputs, production physics, latching, tow and delivery. No motion retiming.',viewport:[900,405],dpr:2,fps:30,seconds:12};
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:2,mobile:true});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
 const url=base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&proof=tow-swing';
 await b.visit(url);await until(()=>b.ev('window.__swingCapture?.href==='+JSON.stringify(url)+'&&window.__swingCapture?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),'flight ready',300);
 report.initial=await b.ev('__swingCapture.prepare()');report.states=[];
 const frames=path.join(out,'frames');await fs.mkdir(frames,{recursive:true});
 for(let i=0;i<report.fps*report.seconds;i++){
  report.states.push(await b.ev('__swingCapture.frame('+Boolean(i)+')'));
  if(!process.argv.includes('--metrics-only'))await b.shot(path.join(frames,String(i).padStart(4,'0')+'.png'));
 }
 report.events=await b.ev('__swingCapture.events');report.inputs=await b.ev('__swingCapture.inputs');report.errors=b.errors;
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 assert.ok(report.states.every(s=>!s.dying),'survives authored course');
 assert.equal(report.events.filter(e=>e.event==='collect'&&e.via==='collector').length,1,'exactly one Collector delivery');
 assert.ok(report.inputs.filter(e=>e.whileTowing).length>=3,'several real Lifts while towing');
 assert.deepEqual(report.errors,[]);
 console.log(JSON.stringify({out,initial:report.initial,events:report.events,lifts:report.inputs,frames:report.states.length}));
}finally{b.close();server.close()}
