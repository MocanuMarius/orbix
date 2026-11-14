import test from 'node:test';
import assert from 'node:assert/strict';
import {shapeExpeditionSupply} from '../dist/glow-budget.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';

const params={height:430,speed:154,endX:10300,clear:()=>true};
function supplyRow(){
 return Array.from({length:40},(_,i)=>({
  id:'p'+i,x:350+250*i,y:215,kind:'cluster',sparkMass:2,accessible:true,phase:i
 }));
}
test('later maps offer more surplus along altitude changes with the original five-tier economy',()=>{
 const initial=supplyRow();
 initial[9].sparkMass=10;
 const results=[];
 for(const mapIndex of [0,1,2]){
  const layout={embers:structuredClone(initial),riskChains:[{start:2300,end:2800}],flightForks:[{approachStart:4500,exitEnd:5050}]};
  const target=layout.embers[14];
  shapeExpeditionSupply(layout,{...params,mapIndex,targets:[{object:target}],hazards:[{x:7050,y:215,influence:220}]});
  assert.deepEqual(layout.embers.map(p=>p.sparkMass),initial.map(p=>p.sparkMass));
  assert.deepEqual(layout.embers.map(p=>[p.x,p.id]),initial.map(p=>[p.x,p.id]));
  assert.equal(target.y,215);
  const shifted=layout.embers.filter(p=>p.bankedSupply);
  for(const p of shifted){
   assert.ok(p.sparkMass<=3);
   assert.ok(Math.abs(215-p.y)>70);
   assert.ok(p.x<2180||p.x>2920);
   assert.ok(p.x<4420||p.x>5130);
   assert.ok(Math.abs(p.x-7050)>=330);
  }
  const lane=[98,...layout.embers.filter(p=>!p.bankedSupply).map(p=>p.x),params.endX];
  assert.ok(lane.slice(1).every((x,i)=>x-lane[i]<=154*6));
  results.push(shifted.length);
 }
 assert.equal(results[0],0);
 assert.ok(results[1]>0&&results[2]>results[1]);
});

test('long empty intervals can gain one small recovery Spark in open air, and respect authored danger',()=>{
 const p=(x)=>({x,y:215,kind:'light',sparkMass:1,accessible:true});
 const layout={embers:[p(400),p(1900),p(3200)],glowBudget:{target:100,available:60}};
 shapeExpeditionSupply(layout,{...params,mapIndex:2,endX:3430,targets:layout.embers.map(object=>({object})),
  hazards:[{x:2550,y:215,influence:220}]});
 const repaired=layout.embers.filter(p=>p.recoverySupply);
 assert.equal(repaired.length,1);
 assert.equal(repaired[0].x,1150);
 assert.equal(repaired[0].sparkMass,1);
 assert.equal(layout.glowBudget.available,60+getPickupSpec('light').fuel);
 assert.deepEqual(layout.embers.map(p=>p.x),[400,1150,1900,3200]);
});
