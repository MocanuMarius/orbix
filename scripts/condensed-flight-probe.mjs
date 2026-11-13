import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {condenseGlow,getCondensationRules} from '../dist/condensed-glow.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})});
const made=[];
function engine(flame=100,rules=getCondensationRules({}),wallet=8){const e=new WispFlight({canvas:canvas(),seed:'condensation-probe',terrain:'ruins',node:{levelId:'ruins-aqueduct'},flame,condensedGlow:wallet,modifiers:{condensationRules:rules}});made.push(e);return e;}
const packet=(kind='light',extra={})=>({id:'check',kind,x:98,y:215,...extra});
const partial=engine(98),natural=packet();partial.collect(natural);
assert.equal(partial.flame,100);assert.equal(partial.condensedGlow,6);assert.equal(partial.condensedRemainder,.6);
assert.equal(partial.getState().condensedTotal,14);assert.equal(partial.condensationFlow.count,1);
partial.collect(natural);assert.equal(partial.condensedGlow,6,'the same packet cannot pay twice');
partial.spendGlow(100);assert.equal(partial.availableGlow,0);assert.equal(partial.condensedTotal,14,'currency cannot pay Lift effort');
const empty=engine(0);empty.collect(packet());assert.equal(empty.flame,24);assert.equal(empty.condensedGlow,0,'fuel below capacity is not money');
const generated=engine();generated.collect(packet('light',{generated:true}));assert.equal(generated.condensedGlow,0);assert.equal(generated.pickupOverflow,0);
const dark=engine();dark.collect(packet('dark',{harmful:true}));assert.equal(dark.condensedGlow,0);
const dusk=engine();dusk.collect(packet('dusk'));assert.equal(dusk.condensedGlow,9);assert.equal(dusk.condensedRemainder,.6,'risky natural fuel can still overfill');
const cluster=engine();cluster.collect(packet('cluster'));assert.equal(cluster.condensedGlow,9,'cluster is fuel, not a separate reward token');
const enhanced=engine(100,getCondensationRules({'main-afterglow':1}));enhanced.storeNaturalOverflow(packet(),{fuel:10},10);
assert.equal(enhanced.condensedGlow,4,'3 surplus displayed Glow converts to 4 with Condensation');
const bounded=condenseGlow(100,{rules:{multiplier:99,bankBonusPerTier:99},wallet:999999});assert.equal(bounded.amount,48);
let amount=0,remainder=0;for(let i=0;i<100;i++){const out=condenseGlow(.1,{remainder});amount+=out.amount;remainder=out.remainder;}
assert.equal(amount,3);assert.equal(remainder,0,'fractional pickups cannot manufacture rounding income');
const carrier=engine();const carried=packet('cache',{deliveredByWisp:true});carrier.collect(carried);assert.equal(carrier.condensedGlow,12);carrier.collect(carried);assert.equal(carrier.condensedGlow,12);
for(const e of made)e.destroy();
console.log(JSON.stringify({naturalOverflow:true,wholeCurrencyAndFractionalCredit:true,enhancedThreeBecomesFour:true,maximumMultiplier:1.6,generatedAndDarkExcluded:true,bodyAndCollectorSinglePayment:true,currencyCannotFuelFlight:true}));
