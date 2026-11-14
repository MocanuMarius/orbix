// Bake the inventory icons from the flight renderer. No canvas or image
// dependency is required: the fuel sprites consist entirely of pixel rects.
import {writeFile} from 'node:fs/promises';
import {deflateSync,crc32} from 'node:zlib';
import {drawPickup,drawCompactSparkFrame} from '../dist/pickup-art.mjs';

function chunk(type,data){
    const body=Buffer.concat([Buffer.from(type),data]),out=Buffer.alloc(body.length+8);
    out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),body.length+4);
    return out;
}
function png(pixels,cell,frames,period,animated){
  const header=Buffer.alloc(13);header.writeUInt32BE(cell);header.writeUInt32BE(cell,4);header[8]=8;header[9]=6;
  const parts=[Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header)];
  if(animated){const count=Buffer.alloc(8);count.writeUInt32BE(frames);parts.push(chunk('acTL',count));}
  let sequence=0;
  for(let f=0;f<(animated?frames:1);f++){
    if(animated){
      const ctl=Buffer.alloc(26);ctl.writeUInt32BE(sequence++);ctl.writeUInt32BE(cell,4);ctl.writeUInt32BE(cell,8);
      ctl.writeUInt16BE(Math.max(1,Math.round(period*1000/frames)),20);ctl.writeUInt16BE(1000,22);
      parts.push(chunk('fcTL',ctl));
    }
    const rows=Buffer.alloc(cell*(1+cell*4));
    for(let y=0;y<cell;y++){
      const start=(y*cell*frames+f*cell)*4;
      pixels.copy(rows,1+y*(1+cell*4),start,start+cell*4);
    }
    const compressed=deflateSync(rows,{level:9});
    if(f===0)parts.push(chunk('IDAT',compressed));
    else{const serial=Buffer.alloc(4);serial.writeUInt32BE(sequence++);parts.push(chunk('fdAT',Buffer.concat([serial,compressed])));}
  }
  return Buffer.concat([...parts,chunk('IEND',Buffer.alloc(0))]);
}
const sprites=[
  ['compact','meter-spark',36,24,1.2],
  ['light','plasma-spark',36,24,1.2],['cluster','plasma-cluster',36,24,1.2],['cache','plasma-cache',36,24,1.2],
  ['charge','spark-charge',48,16,2],['sight','spark-flash',48,16,1/.48],
  ['dusk','spark-dusk',48,16,3.2],['dark','spark-dark',48,16,Math.PI*2],
];
for(const [kind,file,cell,frames,period] of sprites){
  const width=cell*frames;
  const pixels=Buffer.alloc(width*cell*4);
  const ctx={globalAlpha:1,fillStyle:'#000000',save(){},restore(){},fillRect(x,y,w,h){
    const rgb=parseInt(this.fillStyle.slice(1),16),src=this.globalAlpha;
    for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){
      const i=(py*width+px)*4,back=pixels[i+3]/255*(1-src),alpha=src+back;
      for(let ch=0;ch<3;ch++){
        const color=(rgb>>(16-ch*8))&255;
        pixels[i+ch]=Math.round((color*src+pixels[i+ch]*back)/alpha);
      }
      pixels[i+3]=Math.round(alpha*255);
    }
  }};
  for(let frame=0;frame<frames;frame++){
    ctx.globalAlpha=1;
    const x=frame*cell+cell/2,y=cell/2,time=frame*period/frames;
    if(kind==='compact')drawCompactSparkFrame(ctx,x,y,time,!frame);
    else drawPickup(ctx,x,y,{kind,time,reducedMotion:!frame});
  }
  await writeFile(new URL('../dist/assets/'+file+'.png',import.meta.url),png(pixels,cell,frames,period,false));
  await writeFile(new URL('../dist/assets/'+file+'-motion.png',import.meta.url),png(pixels,cell,frames,period,true));
}
