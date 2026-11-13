import assert from 'node:assert/strict';
import {buildFlightLayout,circleHitsObstacle,circleHitsPolygon} from '../dist/flight.mjs';
import {buildBossLayout} from '../dist/boss.mjs';
import {buildTutorialLayout} from '../dist/tutorial.mjs';
import {flightEndDistance} from '../dist/flight-end.mjs';
import {visibleCourseEnd,getExitLandmarkState} from '../dist/exit-landmark.mjs';

const oldEnd=(layout,playerX)=>Math.max(...layout.obstacles.map(o=>o.x+Math.max(
  ...[o.topShape,o.bottomShape].flatMap(s=>(s||[]).map(p=>p[0])),
  ...(o.sceneProps||[]).flatMap(p=>p.parts.flatMap(s=>s.polygon.map(p=>p[0]))))))+72-playerX;
const rows=[];
for(const height of [430,620]){
  const options={seed:'grounded-exit',height,speed:154,duration:114,difficulty:1,lengthScale:3};
  const cases=[...['ruins','canopy','storm'].map(terrain=>[terrain,buildFlightLayout({...options,terrain})]),
    ...['hollow-warden','moonweaver'].map(bossId=>[bossId,buildBossLayout({...options,bossId,circleHitsPolygon})]),
    ['practice',buildTutorialLayout({...options,duration:36,lesson:'glide'})]];
  for(const [id,layout]of cases){
    const playerX=155,prior=oldEnd(layout,playerX),visible=visibleCourseEnd(layout,{height});
    const total=flightEndDistance(layout,playerX,114*154,{height}),exit=layout.exitLandmark;
    assert.ok(total<prior,'Underground tails no longer delay finish');
    assert.equal(exit.entryX,visible+26);assert.equal(total+playerX,exit.entryX);
    assert.equal(layout.obstacles.filter(o=>o.exitFoundation).length,1);
    assert.equal(flightEndDistance(layout,playerX,114*154,{height}),total,'Repeated queries do not append terrain');
    assert.equal(layout.obstacles.filter(o=>o.exitFoundation).length,1);
    const foundation=layout.obstacles.find(o=>o.exitFoundation);
    assert.ok(circleHitsObstacle(exit.entryX,exit.groundY+3,3,foundation),'Visible landing is a real solid');
    assert.equal(circleHitsObstacle(exit.entryX,exit.groundY-24,12,foundation),false,'Open doorway is not an invisible collider');
    for(const o of layout.obstacles)for(const sway of [-1,1])assert.equal(circleHitsObstacle(exit.entryX,height*.5,15,o,0,o.center+sway*Math.abs(o.motion||0)),false,'Arrival centre is clear at full sway');
    const state=getExitLandmarkState(layout,{distance:total,width:950,height});assert.equal(state.x,playerX);
    assert.ok(state.groundY>height*.9,'Refuge is grounded near the lower world edge');
    const resize=getExitLandmarkState(layout,{distance:total,width:950,height:height*1.1});assert.equal(resize.groundY,state.groundY*1.1);
    rows.push({height,id,removedTail:Math.round(prior-total),entryGap:26,groundY:Math.round(exit.groundY)});
  }
}
assert.equal(flightEndDistance({obstacles:[]},155,123,{height:430}),123);
console.log(JSON.stringify({groundedExits:rows.length,collisionEntryClear:true,rows},null,2));
