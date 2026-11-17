import assert from 'node:assert/strict';
import test from 'node:test';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {buildFlightLayout} from '../dist/flight.mjs';
import {overrideCourseGeneration} from '../dist/course-landforms.mjs';
// These tests are about the old authored cells and encounter families, which the landform courses do not use yet (docs/course-design.md section 7).
const authored=fn=>()=>{overrideCourseGeneration(1);try{return fn();}finally{overrideCourseGeneration(null);}};

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

test('ordinary terrain shoulders meet the offscreen closing face without exposed vertical cuts', authored(()=>{
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
}));
test('terrain baking is bounded to the playfield including the complete sway envelope',()=>{
 const context=new Proxy({},{get:()=>()=>{}});
 const view={scale:.63,identity:{id:'moonruins-bell-stair',scene:'moonruins'},buffer:{height:271},terrainCache:new Map(),
  document:{createElement:()=>({getContext:()=>context})}};
 const shape=[[-80,900],[245,900],[245,120],[60,0],[-80,120]];
 const obstacle={id:'bounded-bake',width:100,center:205,gap:140,motion:16,sectionId:'test'};
 const palette={stone:'#253329',shade:'#121e16',grain:'#727c5c',face:'#40533c',rim:'#b1c49b'};
 for(const top of [false,true]){
  const points=shape.map(([x,y])=>[x,top?-y:y]);
  const original=JSON.stringify(points);
  const item=WispFlightView.prototype.terrainImage.call(view,{height:430,layout:{sections:[],obstacles:[obstacle]}},obstacle,points,top,palette);
  assert.ok(item.canvas.height<=(430+32)*view.scale+13);
  const anchor=obstacle.center+(top?-1:1)*obstacle.gap/2;
  const visibleStart=Math.max(Math.min(...points.map(p=>p[1])),-anchor-Math.abs(obstacle.motion));
  const visibleEnd=Math.min(Math.max(...points.map(p=>p[1])),430-anchor+Math.abs(obstacle.motion));
  assert.ok(item.y<=visibleStart);
  assert.ok(item.y+item.canvas.height/view.scale>=visibleEnd);
  assert.equal(JSON.stringify(points),original);
 }
});
