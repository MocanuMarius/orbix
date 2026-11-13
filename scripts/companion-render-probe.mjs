import assert from 'node:assert/strict';
import {WispFlightView} from '../dist/wisp-renderer.mjs';
import {WispFlight} from '../dist/flight.mjs';
let saves=0,calls=0;
const ctx=new Proxy({globalAlpha:1,save(){saves++},restore(){saves--;assert.ok(saves>=0)},drawImage(){calls++}},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:620})};
const view=Object.create(WispFlightView.prototype);Object.assign(view,{bufferContext:ctx,scale:240/390,lightIntensity:1,glow(){},mainSprite(){return{}},orbSprite(){return{}},drawPacket(){}});
for(const roles of [['collector','protector','leveler'],['swift','seer','kindler']]){
 const e=new WispFlight({canvas,companions:roles,seed:'motion-render'});e.running=true;e.shield.charges=0;e.shield.recovery=8;e.kindlerPulse=.6;
 for(const item of e.fleet)if(['leveler','swift','seer'].includes(item.role))item.remaining=1;
 for(const reduced of [false,true]){e.reducedMotion=reduced;for(let frame=0;frame<90;frame++){
  e.time=frame/60;const states=e.getCompanionStates(e.player.y,e.time);
  for(const state of states)assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.y));
  view.drawMain(e,e.time,60,180);view.drawProtector(e,e.time,60,180);view.drawFleet(e,e.time,states);assert.equal(saves,0);
 }}
 e.dying=true;e.deathCause='collision';e.dyingAge=1;e.dyingDuration=2;view.drawMain(e,2,60,180);assert.equal(saves,0);
}
console.log('Six companion render paths, normal/reduced motion, shrinking body and death draw preserve canvas state. Draws:',calls);
