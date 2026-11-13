import assert from 'node:assert/strict';
import {BiomeDynamics,BIOME_INTERACTIONS,BIOME_DYNAMIC_TUNING} from '../dist/biome-dynamics.mjs';
import {DraftField,DRAFT_TUNING} from '../dist/drafts.mjs';

const DT=1/60;
function engineFor(biomeId){
 const host={id:1,x:1500,width:220,center:215,gap:200,motion:0,phase:0,hard:false,
  topShape:[[-176,-900],[539,-900],[539,-35],[-176,-35]],
  bottomShape:[[-176,900],[539,900],[539,35],[-176,35]]};
 const e={seed:'dynamic-probe',levelIdentity:{id:biomeId+'-probe',biomeId},height:430,width:956,scaleY:430/620,
  totalDistance:4000,time:0,baseSpeed:154,distance:0,player:{x:155,y:215,vy:0,radius:9.35},mod:{},
  maxFlame:100,flame:50,flameRestored:0,layout:{obstacles:[host],embers:[],sections:[],riskChains:[]},
  events:[],hits:0,reveals:0,bursts:0,lightRadius:175,
  setEvent(text){this.events.push(text);},hit(){this.hits++;},burst(){this.bursts++;},
  revealFromPickup(force){assert.equal(force,true);this.reveals++;},getLightState(){return{radius:this.lightRadius,intensity:1};}};
 e.drafts=Object.create(DraftField.prototype);e.drafts.zones=[];return e;
}
function tick(e,d,count=1){for(let i=0;i<count;i++){e.time+=DT;e.drafts.update(e.time,e.distance+e.player.x,e.baseSpeed);d.update(DT);}}
let kinds=0;
for(const biomeId of Object.keys(BIOME_INTERACTIONS)){
 const e=engineFor(biomeId),d=new BiomeDynamics(e),item=d.items[0];
 assert.ok(item,`${biomeId} attaches to a visible real surface`);
 const again=new BiomeDynamics(engineFor(biomeId));
 assert.deepEqual(d.items.map(i=>[i.id,i.x,i.y]),again.items.map(i=>[i.id,i.x,i.y]),'seeded scene determinism');
 assert.ok(item.floorY-item.topY>125,'actors preserve a full-body bypass');
 if(item.family==='fall'){
  e.distance=item.x-e.player.x-200;
  if(item.kind==='thaw'){
   e.lightRadius=1;tick(e,d,90);assert.equal(item.phase,'idle','unilluminated ice does not melt');
   e.lightRadius=600;
  }
  tick(e,d,68);assert.equal(item.phase,'warning','at least1.2seconds of warning');
  tick(e,d,40);assert.equal(item.phase,'falling');
  e.distance=item.x-e.player.x;e.player.y=item.y;tick(e,d);assert.equal(e.hits,1,'contact uses the engine shield/fatal-contact path');
  tick(e,d,10);assert.equal(e.hits,1,'spent debris cannot repeatedly hit');
 }else if(item.family==='vent'){
  assert.equal(e.drafts.zones.length,1,'the current is predicted by the shared DraftField');
  e.distance=item.x-e.player.x-120;tick(e,d);
  assert.equal(e.drafts.sample(e.time,item.zone.x,item.zone.y).active,false,'warning has no impulse');
  tick(e,d,Math.ceil((DRAFT_TUNING.warning+.4)/DT));
  const gust=e.drafts.sample(e.time,item.zone.x,item.zone.y);assert.equal(gust.active,true);assert.equal(gust.direction,-1);assert.ok(gust.force>=490);
  const oldY=item.zone.y;d.rescale(1.2);assert.equal(item.zone.y,oldY,'shared wind is resized only by DraftField');
 }else{
  assert.equal(d.forecastBoundary(item.x-100,item.x+100),item.x-item.radius-10,'drift guide stops before an unpredictable contact');
  e.distance=item.x-e.player.x;e.player.y=item.y;e.player.vy=50;e.flame=96;tick(e,d);
  assert.equal(item.phase,'spent');
  if(item.family==='lift'){assert.ok(e.player.vy<0,'touch provides a useful free lift');e.player.vy=0;tick(e,d);assert.equal(e.player.vy,0);}
  if(item.family==='reveal'){assert.equal(e.reveals,1);tick(e,d);assert.equal(e.reveals,1);}
  if(item.family==='bloom'){assert.equal(e.flame,100);assert.equal(e.flameRestored,4);tick(e,d);assert.equal(e.flameRestored,4);assert.ok(BIOME_DYNAMIC_TUNING.glowGift<=10);}
  assert.equal(d.forecastBoundary(item.x-100,item.x+100),Infinity,'spent actors do not truncate the guide');
 }
 kinds++;
}
for(const flag of ['tutorial','bossEncounter']){const e=engineFor('frost');e[flag]=true;assert.equal(new BiomeDynamics(e).items.length,0,`${flag} keeps its authored sequence`);}
console.log(JSON.stringify({biomeBehaviors:kinds,deterministic:true,warningSeconds:BIOME_DYNAMIC_TUNING.warning,repeatRewards:false,sharedDraftPrediction:true}));
