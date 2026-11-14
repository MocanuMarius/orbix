import assert from 'node:assert/strict';
import {balanceSparkSequence} from '../dist/glow-budget.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
const layout={embers:[0,100,200,1400,1500,1600].map((x,i)=>({x:x+400,y:200,kind:i<3?'cache':'light',value:i<3?3:1,accessible:true}))};
const r=balanceSparkSequence(layout,{duration:20,endX:3000,clear:()=>true});
assert.equal(r.before,r.after);assert.ok(r.transfers>0);assert.ok(layout.embers.slice(3).some(p=>getPickupSpec(p).fuel>=40));assert.ok(layout.embers.slice(0,3).some(p=>getPickupSpec(p).fuel<60));
const preserved={embers:layout.embers.map(p=>({...p,riskChain:true}))},before=JSON.stringify(preserved);balanceSparkSequence(preserved,{duration:20,endX:3000,clear:()=>true});assert.equal(JSON.stringify(preserved),before);
console.log(JSON.stringify(r));
