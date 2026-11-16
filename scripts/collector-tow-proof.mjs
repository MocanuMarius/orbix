// Actual-App visual proof: authored course, normal Lift input and production
// renderers. Only the missed inspection Sparks and equipped modifiers are staged.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until} from './browser-probe.mjs';

const root=path.resolve('dist'),out=path.resolve('work/collector-tow-proof');
await fs.mkdir(out,{recursive:true});
const bridge=`
muted=true;music.setEnabled(false);
window.__towProof={href:location.href,get engine(){return engine},
 async prepare({fallback=false,paired=false,quiet=false}={}){
  const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
  document.querySelector('#pause-layer').replaceChildren();
  await document.fonts.ready;await e.environmentArtReady;
  e.reducedMotion=quiet;e.mod.wispCooldown=.4;e.mod.cardTwinOrbit=paired;
  const {WispCompanion}=await import('./wisp.mjs?v=furnace-tow-1');
  e.wisp=new WispCompanion(e.player);e.collectors=[e.wisp];e.syncCollectors();
  this.packets=[{id:'tow-proof-lower',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y+20,phase:0}];
  if(paired)this.packets.push({id:'tow-proof-upper',kind:'cluster',sparkMass:2,x:e.distance+e.player.x-48,y:e.player.y-24,phase:1});
  e.layout.embers.push(...this.packets);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;
  if(fallback){e.pixiReady=false;e.pixiView.canvas.style.display='none';e.canvas.style.opacity='1';}
  this.events=[];this.lastLift=-10;this.inputs=[];
  const collect=e.collect.bind(e);e.collect=(p,d)=>{if(!p.collected&&this.packets.includes(p))this.events.push({id:p.id,time:e.time,via:d?'collector':'body'});return collect(p,d);};
  e.accumulator=1/60;e.render();e.notify();
  return {width:e.width,height:e.height,playerX:e.player.x,playerY:e.player.y,scale:e.pixiView.scale,backend:fallback?'canvas':'pixel-canvas',collectors:e.collectors.length,quiet,
    canvas:document.querySelector('#flight-canvas').getBoundingClientRect().toJSON()};
 },
 frame(){const e=engine;
  for(let i=0;i<2;i++){
   const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
   const target=near?e.obstacleCenter(near):e.height*.52;
   if(e.player.y>target&&e.player.vy>0&&e.time-this.lastLift>.35){e.beginLiftInput();e.endLiftInput();this.lastLift=e.time;this.inputs.push(e.time);}
   e.step(1/60);
  }
  e.accumulator=1/60;const started=performance.now();e.render();e.notify();
  return {time:e.time,y:e.player.y,playerX:e.player.x,dying:e.dying,renderMs:performance.now()-started,
    collectors:e.getCompanionStates(e.renderPlayerY,e.visualTime,e.renderBlend).filter(w=>w.role==='collector').map(w=>({x:w.x,y:w.y,depth:w.depth,phase:w.phase,carrying:w.carrying,cargoKind:w.cargoKind,cargo:w.cargoPose,tether:w.tetherPose}))};
 }
};`;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep))throw Error('Outside dist');
  let data=await fs.readFile(file);if(path.basename(file)==='app.mjs')data=Buffer.from(data.toString()+bridge);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(e){res.writeHead(404).end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chrome(['--mute-audio','--disable-background-timer-throttling']);
const report={note:'Actual App and authored terrain at 900x405 CSS pixels, DPR 3. Normal player Lift inputs. Only missed inspection Sparks and equipped modifiers are staged; all latching, reeling and delivery use live gameplay.',viewport:[900,405],dpr:3,fps:30,cases:[]};
try{
  await browser.send('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:3,mobile:true});
  await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
  for(const [name,options] of [['native-single',{}],['native-paired',{paired:true}],['fallback-single',{fallback:true}],['fallback-paired',{fallback:true,paired:true}],['native-reduced',{quiet:true}]]){
    const url=base+'/game.html?mock=boundary&cards=1&biome=pinewood&course=1&collectorArt=flat2&proof='+name;
    await browser.visit(url);
    await until(()=>browser.ev('window.__towProof?.href==='+JSON.stringify(url)+'&&window.__towProof?.engine?.pixiReady&&document.querySelector("[data-action=wake-flight]")'),name,300);
    const initial=await browser.ev('__towProof.prepare('+JSON.stringify(options)+')'),states=[];
    const frames=path.join(out,name+'-frames');if(name==='native-single')await fs.mkdir(frames,{recursive:true});
    for(let i=0;i<180;i++){
      const state=await browser.ev('__towProof.frame()');states.push(state);
      if(name==='native-single')await browser.shot(path.join(frames,String(i).padStart(4,'0')+'.png'));
      if([22,42,75,105].includes(i))await browser.shot(path.join(out,name+'-'+i+'.png'));
    }
    assert.ok(states.every(s=>!s.dying),name+' stays alive on authored course');
    assert.ok(states.some(s=>s.collectors.filter(c=>c.carrying).length===(options.paired?2:1)),name+' actual load shown');
    const events=await browser.ev('__towProof.events');
    assert.equal(events.filter(e=>e.via==='collector').length,options.paired?2:1,name+' delivers each staged load once');
    report.cases.push({name,initial,states,events,inputs:await browser.ev('__towProof.inputs')});
    console.log(name+': actual latch/reel/delivery captured');
  }
  report.errors=browser.errors;assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Proof: '+out);
}finally{browser.close();server.close();}
