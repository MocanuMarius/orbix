// WebGL2 lighting vs Canvas 2D lighting on the same seeded frames of the stress scene (marsh, Guardian with lantern
// shutters, Flares, Pulse rings, twin Collectors) plus plain biomes in flight light. Same code, same page; only the
// light compositor differs. Prints per-frame differing pixels and the largest channel difference.
//   node scripts/perf/gl-diff.mjs [--root=dist] [--shots=<dir>]
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {startServer,launch,delay,until} from './lib.mjs';
const A=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true]}));
const srv=await startServer(A.root||'dist');const b=await launch();
const PAGE=`(async()=>{
 const v='?v=guide-clarity-1';const S=await import('./stress-scene.mjs'+v);const {WispFlight}=await import('./flight.mjs'+v);const {BIOME_LEVELS}=await import('./biomes.mjs'+v);const {getRunModifiers}=await import('./model.mjs'+v);
 document.body.innerHTML='';const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:915px;height:412px';document.body.append(host);
 async function make(kind,gpu){globalThis.__orbixLightGpu=gpu;host.innerHTML='';const c=document.createElement('canvas');c.style.cssText='width:100%;height:100%;display:block';host.append(c);
  let e;if(kind==='stress'){e=S.createStressEngine(c);S.scriptStressScene(e);}
  else{const level=BIOME_LEVELS.filter(l=>l.biomeId===kind)[0];e=new WispFlight({canvas:c,terrain:level.terrain,seed:17,duration:90,preview:true,node:{...level,levelId:level.id,type:'flight',row:2,mapIndex:0,difficulty:1},companions:['collector'],flame:100,modifiers:getRunModifiers({companions:['collector'],skills:{}})});}
  e.setMuted?.(true);e.start({paused:true});await e.ready;return e;}
 function frame(e,d,t,y,waves){e.distance=e.previousDistance=d;e.accumulator=0;e.time=t;e.visualTime=t;e.player.y=e.previousPlayerY=y;
  if(waves){e.luminanceWaves.clear();for(let i=0;i<6;i++){const w=e.luminanceWaves.emit({x:d+e.player.x-i*40,y,radius:260,source:'card',sourceKind:'card'});w.radius=40+i*90;w.age=.2+i*.1;}}
  e.render();const buf=e.pixiView.buffer;return {w:buf.width,h:buf.height,gpu:!!e.pixiView.lightGpu,data:Array.from(buf.getContext('2d').getImageData(0,0,buf.width,buf.height).data)};}
 const out=[];
 for(const kind of ['stress','marsh','coral','frost']){
  const shots=[];
  for(const gpu of [true,false]){const e=await make(kind,gpu);const L=e.totalDistance;const list=[];
   const stops=kind==='stress'?[[L*.15,12,.5,true],[L*.4,24,.4,true],[L*.6,33,.55,true],[L*.8,40,.45,false]]:[[L*.3,5,.5,false],[L*.5,6,.4,true]];
   for(const [d,t,yy,w] of stops){if(kind==='stress'&&t>11&&!e.flashTether)e.collect({id:'probe-flare-'+t,kind:'sight',x:d+e.player.x+20,y:e.height*yy,phase:1,collected:false});list.push(frame(e,d,t,e.height*yy,w));}
   shots.push(list);e.destroy();}
  shots[0].forEach((g,i)=>{const c=shots[1][i];let n=0,max=0;const hist={};for(let k=0;k<g.data.length;k+=4){let m=0;for(let ch=0;ch<3;ch++)m=Math.max(m,Math.abs(g.data[k+ch]-c.data[k+ch]));if(m){n++;max=Math.max(max,m);hist[m]=(hist[m]||0)+1}}
   out.push({frame:kind+'-'+i,gpuUsed:g.gpu,cpuGpu:c.gpu,pixels:n,of:g.w*g.h,max,over4:Object.entries(hist).filter(([k])=>+k>4).reduce((a,[,v])=>a+v,0),hist,gData:i===0?g.data:null,cData:i===0?c.data:null,w:g.w,h:g.h});});
 }
 return out;
})()`;
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1300,height:700,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:srv.base+'/nature-credits.html'});await until(()=>b.ev('document.readyState==="complete"'),'page',60000,200);await delay(500);
 const rows=await b.ev(PAGE,600000);
 for(const r of rows)console.log(r.frame.padEnd(10),'gpu',r.gpuUsed,'cpu-has-gpu',r.cpuGpu,'differing',r.pixels,'of',r.of,'max',r.max,'over4',r.over4,JSON.stringify(r.hist).slice(0,120));
 if(A.shots){await fs.mkdir(A.shots,{recursive:true});for(const r of rows)if(r.gData)await fs.writeFile(path.join(A.shots,r.frame+'.png'),png(r.w,r.h,r.cData,r.gData));}
}finally{await b.close();srv.close();}
function png(w,h,a,c){const S=1,W=w*3+8,rows=[];for(let y=0;y<h;y++){const row=Buffer.alloc(1+W*3);for(let x=0;x<W;x++){const panel=Math.floor(x/(w+4)),px=x-panel*(w+4);let r=40,g=0,bb=40;if(px>=0&&px<w){const i=(y*w+px)*4;if(panel===0){r=a[i];g=a[i+1];bb=a[i+2]}else if(panel===1){r=c[i];g=c[i+1];bb=c[i+2]}else{const d=Math.max(Math.abs(a[i]-c[i]),Math.abs(a[i+1]-c[i+1]),Math.abs(a[i+2]-c[i+2]));r=Math.min(255,d*16);g=0;bb=0}}row[1+x*3]=r;row[2+x*3]=g;row[3+x*3]=bb}rows.push(row)}
 const crcT=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcT[n]=c>>>0}const crc=buf=>{let x=0xffffffff;for(const v of buf)x=crcT[(x^v)&255]^(x>>>8);return (x^0xffffffff)>>>0};
 const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const cc=Buffer.alloc(4);cc.writeUInt32BE(crc(td));return Buffer.concat([l,td,cc])};
 const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
