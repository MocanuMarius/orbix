// Bake static and animated menu images directly from the flight renderer.
// Both presentations use the same pixels and the same animation frame timing.
import {writeFile} from 'node:fs/promises';
import {deflateSync,crc32} from 'node:zlib';
import {drawFuelFrame,drawPickup,FUEL_ANIMATION,FLASH_ANIMATION} from '../dist/pickup-art.mjs';

function chunk(type,data){
  const body=Buffer.concat([Buffer.from(type),data]);
  const out=Buffer.alloc(body.length+8);
  out.writeUInt32BE(data.length);
  body.copy(out,4);
  out.writeUInt32BE(crc32(body),body.length+4);
  return out;
}

function png(size,frames,period){
  const header=Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size,4);
  header[8]=8;
  header[9]=6;
  const parts=[Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header)];
  const animated=frames.length>1;
  if(animated){
    const count=Buffer.alloc(8);
    count.writeUInt32BE(frames.length);
    parts.push(chunk('acTL',count));
  }
  let sequence=0;
  for(let f=0;f<frames.length;f++){
    if(animated){
      const ctl=Buffer.alloc(26);
      ctl.writeUInt32BE(sequence++);
      ctl.writeUInt32BE(size,4);
      ctl.writeUInt32BE(size,8);
      ctl.writeUInt16BE(Math.max(1,Math.round(period*1000/frames.length)),20);
      ctl.writeUInt16BE(1000,22);
      parts.push(chunk('fcTL',ctl));
    }
    const compressed=frames[f];
    if(f===0)parts.push(chunk('IDAT',compressed));
    else{
      const serial=Buffer.alloc(4);
      serial.writeUInt32BE(sequence++);
      parts.push(chunk('fdAT',Buffer.concat([serial,compressed])));
    }
  }
  return Buffer.concat([...parts,chunk('IEND',Buffer.alloc(0))]);
}

// The renderer paints pixel-aligned rectangles; each row starts with the
// no-filter byte used by PNG. Alpha blending matches the shared Canvas draw.
function raster(size,paint){
  const stride=size*4+1;
  const pixels=Buffer.alloc(stride*size);
  const ctx={globalAlpha:1,fillStyle:'#000000',save(){},restore(){},fillRect(x,y,w,h){
    const rgb=parseInt(this.fillStyle.slice(1),16),src=this.globalAlpha;
    if(src<=0)return;
    for(let py=Math.max(0,y);py<Math.min(size,y+h);py++){
      for(let px=Math.max(0,x);px<Math.min(size,x+w);px++){
        const i=stride*py+1+px*4;
        const back=pixels[i+3]/255*(1-src),alpha=src+back;
        for(let ch=0;ch<3;ch++){
          const color=(rgb>>(16-ch*8))&255;
          pixels[i+ch]=Math.round((color*src+pixels[i+ch]*back)/alpha);
        }
        pixels[i+3]=Math.round(alpha*255);
      }
    }
  }};
  paint(ctx);
  return deflateSync(pixels,{level:9});
}

const assets=new URL('../dist/assets/',import.meta.url);
async function bake(name,size,frames,period,draw){
  const render=(frame,quiet)=>raster(size,ctx=>draw(ctx,frame,quiet));
  const quiet=render(0,true);
  const moving=Array.from({length:frames},(_,frame)=>render(frame,false));
  await writeFile(new URL(name+'.png',assets),png(size,[quiet],0));
  await writeFile(new URL(name+'-motion.png',assets),png(size,moving,period));
}

const {size,frames,period}=FUEL_ANIMATION;
for(const [kind,name] of [['light','plasma-spark'],['cluster','plasma-cluster'],['cache','plasma-cache']]){
  await bake(name,size,frames,period,(ctx,frame,quiet)=>drawFuelFrame(ctx,size/2,size/2,kind,frame,quiet));
}

const flash=FLASH_ANIMATION;
await bake('flash-powerup',flash.size,flash.frames,flash.period,(ctx,frame,quiet)=>{
  drawPickup(ctx,flash.size/2,flash.size/2,{kind:'sight',time:frame*flash.period/flash.frames,reducedMotion:quiet});
});

for(const [kind,name,cycle] of [
  ['dusk','spark-dusk',3.2],['dark','spark-dark',Math.PI*2],
]){
  await bake(name,48,16,cycle,(ctx,frame,quiet)=>drawPickup(ctx,24,24,{kind,time:frame*cycle/16,reducedMotion:quiet||frame===0}));
}
