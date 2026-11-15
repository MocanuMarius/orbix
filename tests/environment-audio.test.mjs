import test from 'node:test';
import assert from 'node:assert/strict';
import {BiomeDynamics} from '../dist/biome-dynamics.mjs';

function scene(biomeId){
 const host={id:1,x:1500,width:220,center:215,gap:200,motion:0,phase:0,hard:false,
  topShape:[[-176,-900],[539,-900],[539,-35],[-176,-35]],bottomShape:[[-176,900],[539,900],[539,35],[-176,35]]};
 const sounds=[],e={seed:'environment-audio',levelIdentity:{id:biomeId+'-test',biomeId},height:430,width:956,scaleY:430/620,
  totalDistance:4000,time:0,baseSpeed:154,distance:0,player:{x:155,y:215,vy:0,radius:9.35},mod:{},maxFlame:100,flame:50,flameRestored:0,
  layout:{obstacles:[host],embers:[],sections:[],riskChains:[]},drafts:{zones:[]},
  reveals:0,revealFromPickup(){this.reveals++;},sound(type,detail){sounds.push({type,detail});},getLightState(){return {radius:600,intensity:1};}};
 const dynamics=new BiomeDynamics(e),item=dynamics.items[0];assert.ok(item);return {e,dynamics,item,sounds};
}
test('biome touch sounds use distinct identities and never repeat on spent actors',()=>{
 for(const [biomeId,type]of [['fungal','spore'],['marsh','bubble'],['crystal','crystal'],['cemetery','gravebell'],['thorn','seedpod']]){
  const {e,dynamics,item,sounds}=scene(biomeId);e.distance=item.x-e.player.x;e.player.y=item.y;
  dynamics.update(1/60);assert.equal(item.phase,'spent');
  for(let frame=0;frame<120;frame++){e.time+=1/60;dynamics.update(1/60);}
  assert.deepEqual(sounds.map(sound=>sound.type),[type],biomeId+' emits one dedicated contact sound');
  assert.equal(e.reveals,item.family==='reveal'?1:0,'sound keeps the original reveal behavior');
 }
});
test('fall warning and collision impact each sound once, including a fatal contact',()=>{
 for(const biomeId of ['frost','pinewood']){
  const {e,dynamics,item,sounds}=scene(biomeId);e.distance=item.x-e.player.x-120;
  dynamics.update(1/60);assert.equal(item.phase,'warning');
  assert.equal(sounds[0]?.type,biomeId==='frost'?'ice-warning':'debris');
  for(let frame=0;frame<180&&item.phase!=='falling';frame++){e.time+=1/60;dynamics.update(1/60);}
  assert.equal(item.phase,'falling');assert.equal(sounds.length,1);
  e.distance=item.x-e.player.x;e.player.y=item.y;e.hit=()=>{assert.equal(sounds.length,2,'impact sounds before fatal hit');e.dying=true;};
  dynamics.update(1/60);assert.equal(item.phase,'spent');assert.equal(sounds[1].type,'debris');
  dynamics.update(1/60);assert.equal(sounds.length,2);
 }
});
test('vent warning and active transition sound once instead of once each frame',()=>{
 const {e,dynamics,item,sounds}=scene('basalt');e.distance=item.x-e.player.x-120;item.zone.triggeredAt=0;
 for(let frame=0;frame<400;frame++){e.time=frame/60;dynamics.update(1/60);}
 assert.equal(item.phase,'spent');assert.deepEqual(sounds.map(sound=>sound.type),['vent','vent']);
 assert.equal(sounds[0].detail.warning,true);assert.ok(!sounds[1].detail.warning);
});
test('death and completion do not trigger environment contact sounds',()=>{
 for(const flag of ['dying','completing','finished']){
  const {e,dynamics,item,sounds}=scene('fungal');e.distance=item.x-e.player.x;e.player.y=item.y;e[flag]=true;
  dynamics.update(1/60);assert.equal(sounds.length,0);assert.equal(item.phase,'idle');
 }
});
