import test from 'node:test';import assert from 'node:assert/strict';
import {EdgingPulse,obstacleEdgeClearance} from '../dist/edging-pulse.mjs';
import {proximityFill} from '../dist/proximity-meter.mjs';
import {drawProximityEnergy} from '../dist/proximity-energy.mjs';
const floor={x:0,width:500,center:385,gap:0,bottomShape:[[0,0],[500,0],[500,80],[0,80]]};
const make=()=>{const e={mod:{proximityUnlocked:true},running:true,alive:true,height:400,width:900,time:0,distance:0,player:{x:180,y:350,radius:10},obstacleCenter:o=>o.center};e.edgingPulse=new EdgingPulse(e);return e;};
test('nearest physical contact includes slope coordinates and never changes clearance',()=>{
 const o={x:0,center:300,gap:0,bottomShape:[[0,0],[400,100],[400,400],[0,400]],sceneProps:[]};const target={clearance:Infinity};
 const d=obstacleEdgeClearance(180,320,10,o,0,48,300,target);assert.equal(d,obstacleEdgeClearance(180,320,10,o,0,48,300));assert.ok(Math.abs(target.y-(300+target.x/4))<1e-8);
});
test('burst empties and hides meter throughout reveal and recovery before charging resumes',()=>{
 const e=make(),p=e.edgingPulse;
 for(let i=0;i<120;i++)p.update(1/60,[]);assert.equal(p.charge,0,'open sky never charges');
 e.mod.proximityUnlocked=false;p.update(.5,[floor]);assert.equal(p.charge,0,'skill is required');
 e.mod.proximityUnlocked=true;for(let i=0;i<120;i++){e.time+=1/60;p.update(1/60,[floor]);}assert.equal(p.triggerCount,1);assert.equal(p.charge,0);assert.equal(proximityFill(p.state),0);
 for(let i=0;i<300;i++)p.update(1/60,[floor]);assert.equal(p.remaining,0);assert.ok(p.recoveryRemaining>0);assert.equal(proximityFill(p.state),0);
 for(let i=0;i<120;i++)p.update(1/60,[floor]);p.update(1/60,[floor]);assert.ok(p.charge>0);assert.ok(proximityFill(p.state)>0);
});
test('effects draw bounded finite geometry in charging, burst and reduced motion modes',()=>{
 const e=make();e.edgingPulse.update(.5,[floor]);let calls=0;
 const c=new Proxy({},{get:(o,k)=>o[k]??((...args)=>{calls++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));}),set:(o,k,v)=>(o[k]=v,true)});
 for(const reduced of [false,true]){e.reducedMotion=reduced;drawProximityEnergy(c,e);e.edgingPulse.remaining=4.5;e.edgingPulse.burstOrigin={x:180,y:350};drawProximityEnergy(c,e);e.edgingPulse.remaining=0;}
 assert.ok(calls>50&&calls<350);
});
