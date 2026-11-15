import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainBoundary,terrainSurfaceExposed,drawTerrainBoundary} from '../dist/terrain-boundary.mjs';
const obstacle=(points,top=false)=>({x:0,center:0,gap:0,phase:0,motion:0,
 [top?'topShape':'bottomShape']:[[points[0][0],top?-900:900],[points.at(-1)[0],top?-900:900],...points.toReversed()]});
const engine=obstacles=>({layout:{obstacles},width:400,height:390,distance:0,time:0});
function hitsAt(segments,x){return segments.filter(s=>s.a[0]<x&&s.b[0]>x).map(s=>s.a[1]+(s.b[1]-s.a[1])*(x-s.a[0])/(s.b[0]-s.a[0]));}

test('buried floor joins disappear while the exposed collision edge remains',()=>{
 const a=obstacle([[0,100],[100,100]]),b=obstacle([[50,60],[150,60]]),e=engine([a,b]);
 const {segments}=terrainBoundary(e);
 assert.deepEqual(hitsAt(segments,25),[100]);assert.deepEqual(hitsAt(segments,75),[60]);assert.deepEqual(hitsAt(segments,125),[60]);
 assert.equal(terrainSurfaceExposed(e,a,false,75,100),false);
 assert.equal(terrainSurfaceExposed(e,b,false,75,60),true);
});
test('ceiling union selects the low hanging face, never a buried roof outline',()=>{
 const a=obstacle([[0,100],[100,100]],true),b=obstacle([[50,140],[150,140]],true),e=engine([a,b]);
 assert.deepEqual(hitsAt(terrainBoundary(e).segments,75),[140]);
 assert.equal(terrainSurfaceExposed(e,a,true,75,100),false);
});
test('intersections split sloping outlines exactly where ownership changes',()=>{
 const a=obstacle([[0,100],[150,100]]),b=obstacle([[25,120],[75,80],[125,120]]),e=engine([a,b]);
 const segments=terrainBoundary(e).segments;
 for(const [x,y]of [[35,100],[60,92],[90,92],[115,100]])assert.deepEqual(hitsAt(segments,x),[y]);
 assert.ok(segments.some(s=>s.a[0]===50||s.b[0]===50));
 assert.ok(segments.some(s=>s.a[0]===100||s.b[0]===100));
});
test('coincident source surfaces have one outline and no doubled highlight',()=>{
 const a=obstacle([[0,100],[100,100]]),b=obstacle([[0,100],[100,100]]),e=engine([a,b]);
 assert.deepEqual(hitsAt(terrainBoundary(e).segments,50),[100]);
});
test('camera movement reuses contours; destroyed or moving terrain invalidates them',()=>{
 const a=obstacle([[0,100],[100,100]]),b=obstacle([[50,60],[150,60]]),e=engine([a,b]);
 const before=terrainBoundary(e);e.distance=50;assert.equal(terrainBoundary(e),before);
 b.destroyed=true;assert.deepEqual(hitsAt(terrainBoundary(e).segments,75),[100]);
 b.destroyed=false;b.motion=20;
 assert.notEqual(terrainBoundary(e,0),terrainBoundary(e,1));
 assert.deepEqual(a.bottomShape,[ [0,900],[100,900],[100,100],[0,100] ]);
});
test('long shoulder contours clip before pixel drawing',()=>{
 const e=engine([obstacle([[-1e6,100],[1e6,200]])]),calls=[];
 drawTerrainBoundary({},e,{line:(_c,...args)=>calls.push(args)});
 assert.equal(calls.length,2);
 for(const [x,,xx]of calls){assert.ok(x>=-4);assert.ok(xx<=e.width+4);}
});
