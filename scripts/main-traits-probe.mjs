import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:844,height:390})};
const modifiers={mainSeer:true,seerDuration:2,seerRadius:230,seerRecovery:8,mainKindler:true,kindlerBonus:6,kindlerPurify:true,purifyFuel:12,purifyCooldown:10};
let id=0;
const make=role=>new WispFlight({canvas,seed:'main-traits',duration:102,flame:0,companions:[role],modifiers});
const collect=(e,kind='light',extra={})=>e.collect({id:++id,kind,x:e.player.x,y:e.player.y,...extra});
for(const role of ['collector','protector','leveler','swift']){
 const e=make(role);e.running=true;
 collect(e);assert.equal(e.flame,30,`${role}: Kindled Touch adds 6 to direct fuel`);assert.equal(e.mainSeerUntil,2);assert.equal(e.mainSeerReadyAt,8);
 e.time=.25;assert.ok(e.getLightState().forwardLight.active);assert.equal(e.getLightState().forwardLight.radius,230);
 e.flame=0;collect(e,'light',{deliveredByWisp:true});assert.equal(e.flame,24,'Fetched fuel never gets the body-only bonus');assert.equal(e.mainSeerUntil,2,'Repeated fuel cannot refresh sight through cooldown');
 e.time=2.1;assert.equal(e.getLightState().forwardLight.active,false);e.time=8;collect(e);assert.equal(e.mainSeerUntil,10,'Sight can proc again after recovery');
 e.flame=0;collect(e,'dark');assert.equal(e.flame,12);assert.equal(e.lightPenalties.length,0);assert.equal(e.purifyCooldown,10);
 collect(e,'dark');assert.equal(e.lightPenalties.length,1,'Repeated dark contact is not an infinite purification loop');
 assert.equal(e.companions.length,1);assert.equal(e.getAbilityState().passive,role!=='swift','Main traits never add a power button');e.destroy();
}
for(const [kind,extra] of [['light',{generated:true}],['charge',{}],['sight',{}],['embers',{}],['dusk',{}]]){
 const e=make('collector');collect(e,kind,extra);assert.equal(e.mainSeerUntil,0,kind+' must not trigger main sight');if(extra.generated)assert.equal(e.kindlerPulse,0);e.destroy();
}
const body=make('protector');body.flame=100;collect(body);body.time=.25;assert.ok(body.getLightState().forwardLight.active,'Full fuel still grants sight');body.destroy();
console.log('Main Seer/Kindler: all four bases, direct/fetched distinction, timed sight/cooldown, excluded pickups, full tank and bounded Purify passed.');
