import test from 'node:test';
import assert from 'node:assert/strict';
import {paintContactEdge} from '../dist/contact-edge-art.mjs';
function trace(options,{nativeLine=false}={}){const commands=[],c={canvas:{width:720,height:300},globalAlpha:.8,fillRect(...args){commands.push(['fill',this.fillStyle,this.globalAlpha,...args]);},beginPath(){},moveTo(x,y){this.from=[x,y];},lineTo(x,y){this.to=[x,y];},stroke(){commands.push(['line',this.globalAlpha,...this.from,...this.to,this.strokeStyle,this.lineWidth]);}};paintContactEdge(c,{...options,...(nativeLine?{}:{line:(_,...args)=>commands.push(['line',c.globalAlpha,...args])})});assert.equal(c.globalAlpha,.8);return commands;}
test('spectral terrain fast path preserves every pixel operation of the generic normal path',()=>{
 for(const inward of [-1,1])for(const reducedMotion of [false,true])for(const time of [0,.34,7.19])for(const [x,y,xx,yy]of [[0,130,230,150],[50,160,55,50],[-4,200,300,200]]){
  const options={x,y,xx,yy,inward,worldAx:1250+x/.615,worldAy:y/.615,scale:.615,time,style:'spectral',reducedMotion};
  assert.deepEqual(trace(options),trace({...options,inward:{x:0,y:inward}}));
 }
});

test('normal Spirit Fire is identical across clock time in optimized, prop, angled and clipped paths',()=>{
 for(const inward of [-1,1,{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:.6,y:.8}])for(const [x,y,xx,yy]of [[30,130,350,150],[-300,170,1200,170]])for(const nativeLine of [false,true]){
  const options={x,y,xx,yy,inward,worldAx:1250+x/.615,worldAy:y/.615,scale:.615,style:'spectral'};
  const still=trace({...options,time:0},{nativeLine});
  for(const time of [.34,7.19,200])assert.deepEqual(trace({...options,time},{nativeLine}),still);
  assert.deepEqual(trace({...options,time:200,reducedMotion:true},{nativeLine}),still);
 }
});

test('camera movement and fractional clipped origins keep spectral grain on the same world pixels',()=>{
 for(const scale of [.615,.8,1])for(const inward of [-1,1,{x:0,y:1}]){
  const at=distance=>{
   const camera=Math.round(distance*scale),ax=distance-4,ay=107.37,bx=distance+724;
   const calls=trace({x:Math.round(ax*scale)-camera,y:Math.round(ay*scale),xx:Math.round(bx*scale)-camera,yy:Math.round(ay*scale),worldAx:ax,worldAy:ay,scale,inward,style:'spectral'});
   const columns=new Map();
   for(const call of calls)if(call[0]==='fill'){
    const worldX=call[3]+camera;if(call[3]<0||call[3]>=440)continue;
    if(!columns.has(worldX))columns.set(worldX,[]);
    columns.get(worldX).push([...call.slice(0,3),worldX,...call.slice(4)]);
   }
   return columns;
  };
  const a=at(80.15),b=at(91.71),overlap=[...a.keys()].filter(x=>b.has(x));
  assert.ok(overlap.length>400);
  for(const x of overlap)assert.deepEqual(a.get(x),b.get(x));
 }
});

test('spectral decoration stays in a narrow bank-side band and preserves the exact bright seam',()=>{
 for(const scale of [.615,1,2])for(const inward of [-1,1,{x:0,y:-1},{x:0,y:1}]){
  const calls=trace({x:20,y:100,xx:650,yy:100,worldAx:123.4,worldAy:100/scale,scale,inward,style:'spectral'}),ny=typeof inward==='number'?inward:inward.y;
  const fills=calls.filter(call=>call[0]==='fill');assert.ok(fills.length>2000);
  for(const [,,alpha,x,y,width,height]of fills){
   assert.ok(alpha>0);assert.equal(width,1);
   const edge=ny<0?100-y:y+height-1-100;
   assert.ok(edge>=0&&edge<=Math.ceil(13*scale),`inward depth ${edge} at scale ${scale}`);
   assert.ok(ny<0?y+height-1<=100:y>=100);
  }
  assert.deepEqual(calls.at(-1),['line',.8,20,100,650,100,'#d3f9ff',1]);
 }
});
