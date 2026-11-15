import test from 'node:test';
import assert from 'node:assert/strict';
import {lightAttenuation} from '../dist/light-attenuation.mjs';
import {solidRayIntervals,solidDistanceAt,materialLightDistance,materialLightAt,castTerrainLight,terrainLightStats,TERRAIN_LIGHT_LIMITS,SOLID_LIGHT_COST,releaseTerrainLight} from '../dist/terrain-light.mjs';

const rectangle=(left,top,right,bottom)=>[[left,top],[right,top],[right,bottom],[left,bottom]];
test('rendered Luminance spends one reach unit in air and 4.5 through real rock, including the air behind it',()=>{
 const rock=[rectangle(20,-50,40,50)],source={x:0,y:0},radius=145;
 for(const x of [0,19,20])assert.equal(materialLightAt(rock,source,{x,y:0},radius),lightAttenuation((x/radius)**2));
 assert.equal(materialLightAt(rock,source,{x:30,y:0},radius),lightAttenuation((65/radius)**2));
 assert.equal(materialLightAt(rock,source,{x:60,y:0},radius),lightAttenuation((130/radius)**2));
 assert.equal(materialLightDistance(20,20),90);
 assert.equal(materialLightAt([],source,{x:60,y:0},radius),lightAttenuation((60/radius)**2));
});
test('rock penetration is one third shallower while open air keeps exactly the same falloff',()=>{
 const rock=[rectangle(-200,-200,200,200)],source={x:0,y:0},radius=145;
 assert.equal(SOLID_LIGHT_COST,4.5);
 for(const oldDepth of [12,30,60]){
  const oldLight=lightAttenuation((oldDepth*3/radius)**2),newDepth=oldDepth*2/3;
  assert.equal(materialLightAt(rock,source,{x:newDepth,y:0},radius),oldLight);
  assert.ok(materialLightAt(rock,source,{x:oldDepth,y:0},radius)<oldLight);
 }
 const bank=[rectangle(20,-50,40,50)];
 for(const x of [30,60,90]){
  const solid=Math.min(20,x-20),oldLight=lightAttenuation(((x+2*solid)/radius)**2);
  assert.ok(materialLightAt(bank,source,{x,y:0},radius)<oldLight);
 }
 for(const x of [0,20,60,145,200])assert.equal(materialLightAt([],source,{x,y:0},radius),lightAttenuation((x/radius)**2));
});
test('overlapping terrain and authored props consume light once as one solid union',()=>{
 const spans=solidRayIntervals([rectangle(10,-10,30,10),rectangle(20,-10,45,10)],0,0,1,0,100);
 assert.deepEqual(spans,[[10,45]]);assert.equal(solidDistanceAt(spans,100),35);
 const throughOrigin=solidRayIntervals([rectangle(-10,-10,30,10)],0,0,1,0,100);
 assert.deepEqual(throughOrigin,[[0,30]]);
});
function fixture(obstacles=[]){
 const document={createElement(){const canvas={ownerDocument:document,width:0,height:0};const context={globalAlpha:1,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(image){canvas.pixels=image.data;},clearRect(){canvas.values=new Float64Array(canvas.width*canvas.height*4);canvas.pixels=new Uint8ClampedArray(canvas.values.length);},drawImage(source){if(!source.pixels)return;for(let i=0;i<source.pixels.length;i++){canvas.values[i]+=source.pixels[i]*this.globalAlpha;canvas.pixels[i]=Math.round(canvas.values[i]);}}};canvas.getContext=()=>context;return canvas;}};
 const draws=[],engine={width:390,height:430,distance:0,time:0,layout:{obstacles},canvas:{ownerDocument:document}};
 const context={canvas:{ownerDocument:document},globalAlpha:1,drawImage:(...args)=>draws.push(args)};
 return {engine,context,draws};
}
test('clear-air rendering reuses the pristine radial mask without creating a material mask',()=>{
 const {engine,context,draws}=fixture(),clear={clear:true};castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});
 assert.equal(draws[0][0],clear);assert.equal(terrainLightStats(engine).builds,0);releaseTerrainLight(engine);
});
test('material masks are cached, bounded and invalidated by in-place collider coordinate changes',()=>{
 const shape=rectangle(-100,0,1000,1000),o={x:0,width:400,center:250,gap:0,motion:0,phase:0,bottomShape:shape};
 const {engine,context}=fixture([o]),clear={};
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});}
 assert.equal(terrainLightStats(engine).builds,4);assert.equal(terrainLightStats(engine).hits,59);
 engine.time=2;shape[0][1]+=20;castTerrainLight(context,clear,engine,{x:100,y:200,radius:145});assert.equal(terrainLightStats(engine).builds,8);
 for(let i=0;i<20;i++)castTerrainLight(context,clear,engine,{x:100,y:200,radius:145,channel:`test${i}`});
 assert.ok(terrainLightStats(engine).masks<=TERRAIN_LIGHT_LIMITS.masks);assert.ok(terrainLightStats(engine).canvases<=TERRAIN_LIGHT_LIMITS.masks*(TERRAIN_LIGHT_LIMITS.cellMasks+3));releaseTerrainLight(engine);
});
test('moving terrain refreshes at bounded visual cadence while the untouched air law stays fixed',()=>{
 const {engine,context}=fixture([{x:0,width:400,center:250,gap:0,motion:8,phase:0,bottomShape:rectangle(-100,0,1000,1000)}]);
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,{},engine,{x:100,y:200,radius:145});}
 assert.ok(terrainLightStats(engine).builds<=56);releaseTerrainLight(engine);
});

test('fixed source and rock produce identical masks across time, while source motion changes the bank shadow',()=>{
 const obstacle={x:0,width:200,center:180,gap:0,motion:0,phase:0,bottomShape:rectangle(160,0,190,1000)};
 const {engine,context,draws}=fixture([obstacle]);
 const render=(x,y,time)=>{engine.time=time;castTerrainLight(context,{},engine,{x,y,radius:145});return Uint8ClampedArray.from(draws.at(-1)[0].pixels);};
 const before=render(100,200,0);assert.deepEqual(render(100,200,20),before);
 assert.equal(terrainLightStats(engine).builds,4);
 const moved=render(100,140,20);assert.notDeepEqual(moved,before);
 // The same world point behind the bank becomes more exposed from above it.
 const bank=[rectangle(160,180,190,1180)],target={x:210,y:170};
 assert.ok(materialLightAt(bank,{x:100,y:140},target,145)>materialLightAt(bank,{x:100,y:230},target,145));
 assert.equal(terrainLightStats(engine).builds,8);releaseTerrainLight(engine);
});

test('true moving banks change the rendered shadow without changing collider geometry',()=>{
 const shape=rectangle(-100,0,1000,1000),saved=structuredClone(shape),obstacle={x:0,width:400,center:250,gap:0,motion:40,phase:0,bottomShape:shape};
 const {engine,context,draws}=fixture([obstacle]);
 castTerrainLight(context,{},engine,{x:100,y:200,radius:145,time:0});const before=Uint8ClampedArray.from(draws.at(-1)[0].pixels);
 castTerrainLight(context,{},engine,{x:100,y:200,radius:145,time:1.75});
 assert.notDeepEqual(draws.at(-1)[0].pixels,before);assert.equal(terrainLightStats(engine).builds,8);
 assert.deepEqual(shape,saved);releaseTerrainLight(engine);
});

test('remote moving geometry cannot invalidate a source mask it cannot reach',()=>{
 const near={x:0,width:100,center:250,gap:0,motion:0,phase:0,bottomShape:rectangle(-100,0,200,1000)},far={x:700,width:100,center:250,gap:0,motion:8,phase:0,bottomShape:rectangle(0,0,200,1000)};
 const {engine,context}=fixture([near,far]);engine.width=900;
 for(let i=0;i<60;i++){engine.time=i/60;castTerrainLight(context,{},engine,{x:100,y:200,radius:145});}
 assert.equal(terrainLightStats(engine).builds,4);assert.equal(terrainLightStats(engine).hits,59);releaseTerrainLight(engine);
});

test('small source steps interpolate shadows across the former snapping boundary',()=>{
 const obstacle={x:0,width:200,center:180,gap:0,motion:0,phase:0,bottomShape:rectangle(160,0,190,1000)};
 const {engine,context,draws}=fixture([obstacle]),frames=[];
 for(let i=0;i<25;i++){castTerrainLight(context,{},engine,{x:100,y:195+i*.25,radius:145});frames.push(Uint8ClampedArray.from(draws.at(-1)[0].pixels));}
 const peaks=frames.slice(1).map((frame,i)=>frame.reduce((peak,value,p)=>p%4===3?Math.max(peak,Math.abs(value-frames[i][p])):peak,0));
 assert.ok(Math.max(...peaks)<=8,`quarter-unit movement has no sudden raycast jump: ${Math.max(...peaks)}`);
 assert.ok(terrainLightStats(engine).builds<=6);releaseTerrainLight(engine);
});

test('camera translation reuses lattice corners instead of raycasting a full mask every frame',()=>{
 const {engine,context}=fixture([{x:0,width:600,center:250,gap:0,motion:0,phase:0,bottomShape:rectangle(-100,0,1000,1000)}]);
 for(let i=0;i<60;i++)castTerrainLight(context,{},engine,{x:100,y:200,radius:145,distance:i*154/60,time:i/60});
 assert.ok(terrainLightStats(engine).builds<=32);assert.ok(terrainLightStats(engine).canvases<=TERRAIN_LIGHT_LIMITS.cellMasks+3);releaseTerrainLight(engine);
});
