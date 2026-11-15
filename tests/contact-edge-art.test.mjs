import test from 'node:test';
import assert from 'node:assert/strict';
import {paintContactEdge} from '../dist/contact-edge-art.mjs';
import {drawTerrainBoundary,terrainBoundary} from '../dist/terrain-boundary.mjs';

const makeEngine=()=>({layout:{obstacles:[{x:0,center:0,gap:0,bottomShape:[[0,900],[100,900],[100,100],[0,100]]}]},
 width:300,height:200,distance:0,time:0,player:{x:30,y:80}});
function canvas(){const calls=[];return {calls,canvas:{width:300,height:200},globalAlpha:1,fillRect(...args){calls.push(['pixel',this.fillStyle,this.globalAlpha,...args]);}};}
const line=(c,...args)=>c.calls.push(['line',...args]);

test('unselected contact art retains the exact original terrain drawing commands',()=>{
 const e=makeEngine(),c=canvas();drawTerrainBoundary(c,e,{line});
 assert.deepEqual(c.calls,[['line',0,102,100,102,'#14201f',2],['line',0,100,100,100,'#b9c6aa',1]]);
 e.boundaryStyle='unknown';const other=canvas();drawTerrainBoundary(other,e,{line});assert.deepEqual(other.calls,c.calls);
});

test('opt-in styles preserve the cached exposed surface union and exact contact endpoints',()=>{
 const e=makeEngine(),original=terrainBoundary(e);
 for(const style of ['moon','living','danger']){
  e.boundaryStyle=style;const c=canvas();drawTerrainBoundary(c,e,{line});
  assert.equal(terrainBoundary(e),original);
  assert.deepEqual(c.calls.filter(call=>call[0]==='line').map(call=>call.slice(1,5)),[[0,102,100,102],[0,100,100,100]]);
 }
});

test('mineral grain is world-stable and stays inside the solid side',()=>{
 const args={x:0,y:40,xx:200,yy:40,inward:-1,worldAx:80,worldAy:40,style:'living',line};
 const a=canvas(),b=canvas();paintContactEdge(a,{...args,time:0});paintContactEdge(b,{...args,time:200});
 assert.deepEqual(a.calls,b.calls);
 const pixels=a.calls.filter(call=>call[0]==='pixel');assert.ok(pixels.length>0);
 assert.ok(pixels.every(call=>call[4]>=38&&call[4]<=39));
});

test('long offscreen edges clip before grain iteration',()=>{
 const c=canvas();paintContactEdge(c,{x:-1e6,y:40,xx:1e6,yy:40,worldAx:-1e6,worldAy:40,inward:1,style:'living',line});
 const boundary=c.calls.find(call=>call[0]==='line');
 assert.ok(boundary[1]>=-3&&boundary[3]<=303);
 assert.ok(c.calls.length<620);
});
