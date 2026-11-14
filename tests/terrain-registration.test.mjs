import assert from 'node:assert/strict';
import test from 'node:test';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {buildFlightLayout} from '../dist/flight.mjs';

test('static foreground surfaces keep their pixel registration throughout a camera sweep',()=>{
 const objects=[31.29,56.72].map((x,i)=>({x,width:50,center:110.8+i*.85,gap:80,phase:0,motion:0,bottomShape:[[0,0]]}));
 let frame=[];
 const view={visibleObstacles:objects,scale:.63,terrainImage:()=>({canvas:{},x:-1,y:-9,pad:2}),
  bufferContext:{drawImage(_canvas,x,y){frame.push([x,y]);}}};
 let reference;
 for(let step=0;step<120;step++){
  const distance=step*.26;
  frame=[];
  WispFlightView.prototype.drawTerrain.call(view,{width:400},step/60,distance,{});
  assert.equal(frame.length,2);
  const geometry=[frame[1][0]-frame[0][0],frame[0][1],frame[1][1]];
  reference??=geometry;
  assert.deepEqual(geometry,reference);
  for(const [x,y] of frame)assert.ok(Number.isInteger(x)&&Number.isInteger(y));
 }
});

test('ordinary terrain shoulders meet the offscreen closing face without exposed vertical cuts',()=>{
 for(const terrain of ['ruins','canopy','storm']){
  const layout=buildFlightLayout({terrain,height:430,seed:'shoulder-sweep',duration:70});
  for(const obstacle of layout.obstacles){
   for(const shape of [obstacle.bottomShape,obstacle.topShape]){
    if(!shape)continue;
    for(const [close,edge] of [[shape[0],shape.at(-1)],[shape[1],shape[2]]]){
     assert.equal(edge[0],close[0]);
     const anchor=obstacle.center+(shape===obstacle.topShape?-1:1)*obstacle.gap/2;
     const y=edge[1]+anchor;
     assert.ok(shape===obstacle.topShape?y+Math.abs(obstacle.motion)<0:y-Math.abs(obstacle.motion)>430);
    }
   }
  }
 }
});
