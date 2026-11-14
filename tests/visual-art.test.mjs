import test from 'node:test';import assert from 'node:assert/strict';
import {drawWispBody,makeWispSprite,companionSprite,makeCompanionSprite,WISP_ART} from '../dist/companion-art.mjs';
test('every fuel band has the same fine contour, fixed pale shell and bounded shading',()=>{
 const samples=[];
 for(const band of [0,8,16,24,32]){
  const cells=[],c={fillStyle:'',fillRect(x,y,w,h){cells.push({x,y,w,h,ink:this.fillStyle});}};
  drawWispBody(c,band);samples.push(cells);
  assert.ok(cells.length>450);assert.ok(cells.every(p=>p.w===1&&p.h===1));
  assert.ok(new Set(cells.map(p=>p.ink)).size<=11);
  assert.ok(cells.some(p=>p.ink==='#bccdc1'));assert.ok(cells.some(p=>p.ink==='#e2e8d3'));
 }
 for(const cells of samples)assert.deepEqual(cells.map(({x,y})=>[x,y]),samples[0].map(({x,y})=>[x,y]));
 const center=cells=>cells.find(p=>p.x===0&&p.y===0).ink;
 assert.notEqual(center(samples[0]),center(samples.at(-1)));
 assert.equal(WISP_ART.size,36,'The finer texture preserves the primary sprite dimensions');
});
test('shared main and companion sprites are reusable small rasters without smoothing or size inflation',()=>{
 const doc={createElement(){return{width:0,height:0,getContext:()=>({fillRect(){},set fillStyle(v){}})};}};
 const main=makeWispSprite(doc,32),orb=makeCompanionSprite(doc,'collector'),art=companionSprite();
 assert.deepEqual([main.width,main.height],[36,36]);assert.deepEqual([orb.width,orb.height],[25,25]);
 assert.equal(art.rows.length,25);assert.ok(art.rows.every(r=>r.length===25));
 assert.ok(WISP_ART.worldDiameter>34&&WISP_ART.worldDiameter<36);
});
