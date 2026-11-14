import {FLIGHT_TUNING, obstaclePolygons} from '../dist/flight.mjs';
import {lightAttenuation, lightVisibility} from '../dist/light-field.mjs';
import {getPickupSpec, pickupKind, pickupContactRadius} from '../dist/pickups.mjs';
import {sparkBodyRadius} from '../dist/spark-size.mjs';
import {ICE_GUIDE_FACETS} from '../dist/guardian-geometry.mjs';
import {shutterLightFactor} from '../dist/shutter-cone.mjs';
import {lanternField} from '../dist/lantern-layout.mjs';
import {blackHoleWarning,WARNING_NOTICE} from '../dist/black-hole-warning.mjs';

const clip = (value,min,max) => Math.max(min,Math.min(max,value));
const snap = (value,step) => Math.round(value/step)*step;
// Perception assumptions, not measured contrast thresholds. Both use the
// renderer's light intensity, with a lower threshold for a luminous Spark.
export const VISION = Object.freeze({terrain:.17,spark:.11,hazard:.15,terrainStep:12});

function sightAt(e, light) {
 const dimScale=clip(light.radius/light.baseRadius,.6,1);
 const orbs=e.getCompanionStates().map(orb=>{
  const collecting=orb.role==='collector';
  const radius=(collecting ? orb.phase==='cooldown' ? 17+orb.recovery*10 : 31 : 19)*dimScale;
  return {x:orb.x,y:orb.y,r2:radius*radius,strength:light.intensity*(collecting?.82:.45)};
 });
 return (screenX,y)=>{
  if(screenX<0||screenX>e.width||y<0||y>e.height)return 0;
  let darkness=1-lightVisibility(e,light,screenX,y,e.player.y,false);
  for(const orb of orbs)darkness*=1-orb.strength*lightAttenuation(((screenX-orb.x)**2+(y-orb.y)**2)/orb.r2);
  return (1-darkness)*shutterLightFactor(lanternField(e.layout),e.distance+screenX,y,e.distance+e.player.x,e.player.y,light);
 };
}

function seenTerrain(e,sight) {
 // Rasterize only current-frame filled surfaces, from the player forward.
 // This boundary is the only consumer of obstacle polygons on the human path.
 const step=VISION.terrainStep, first=Math.max(0,snap(e.player.x-12,step));
 const cells=new Set(), pixels=[];
 for(const obstacle of e.getNearbyObstacles()){
  if(obstacle.destroyed)continue;
  for(const polygon of obstaclePolygons(obstacle,e.time)){
   const xs=polygon.map(point=>point[0]-e.distance);
   const start=Math.max(first,Math.ceil(Math.min(...xs)/step)*step);
   const end=Math.min(e.width,Math.max(...xs));
   for(let x=start;x<=end;x+=step){
    const cuts=[];
    for(let i=0,j=xs.length-1;i<xs.length;j=i++){
     if((xs[i]>x)===(xs[j]>x))continue;
     cuts.push(polygon[i][1]+(polygon[j][1]-polygon[i][1])*(x-xs[i])/(xs[j]-xs[i]));
    }
    cuts.sort((a,b)=>a-b);
    for(let i=0;i+1<cuts.length;i+=2){
     const top=Math.max(0,Math.ceil(cuts[i]/step)*step);
     for(let y=top;y<=Math.min(e.height,cuts[i+1]);y+=step){
      if(sight(x,y)<VISION.terrain)continue;
      const key=y*(Math.ceil(e.width)+1)+x;
      if(!cells.has(key)){cells.add(key);pixels.push({x,y});}
     }
    }
   }
  }
 }
 return pixels.sort((a,b)=>a.x-b.x||a.y-b.y);
}

export function observeFlight(e){
 const light=e.getLightState(),sight=sightAt(e,light),sparks=[],hazards=[];
 const recordHazard=(x,y,radius)=>{
  if(sight(x,y)>=VISION.hazard)hazards.push({x:snap(x,4),y:snap(y,4),radius});
 };
 for(const packet of e.getNearbyPickups()){
  if(packet.generated||packet.collected||packet.carried||packet.attracted)continue;
  const x=packet.x-e.distance,y=packet.y,spec=getPickupSpec(packet);
  const dark=pickupKind(packet)==='dark',threshold=dark?VISION.hazard:VISION.spark;
  const shell=sparkBodyRadius(packet,e.height),radius=pickupContactRadius(packet,e.height);
  if(sight(x,y)>=threshold){
   if(dark)hazards.push({x:snap(x,4),y:snap(y,4),radius:shell});
   else if(spec.fuel>0&&x>=e.player.x-12)sparks.push({id:packet.id,x:snap(x,4),y:snap(y,4),radius,dim:spec.dim>0});
  }else if(shell>=24){
   // A large silhouette can enter the light before its centre. Expose just
   // the illuminated pixels; do not give the player the hidden centre/radius.
   let aim=null,nearest=Infinity;
   for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,px=x+Math.cos(angle)*shell,py=y+Math.sin(angle)*shell;
    if(sight(px,py)<threshold)continue;
    if(dark){hazards.push({x:snap(px,4),y:snap(py,4),radius:4});continue;}
    const distance=Math.hypot(px-e.player.x,py-e.player.y);
    if(spec.fuel>0&&px>=e.player.x-12&&distance<nearest){nearest=distance;aim={id:packet.id,x:snap(px,4),y:snap(py,4),radius:8,dim:spec.dim>0};}
   }
   if(aim)sparks.push(aim);
  }
 }
 const marks=[];
 for(const hole of e.blackHoles?.items||[]){
  recordHazard(hole.x-e.distance,hole.y,hole.coreRadius||16);
  if(!blackHoleWarning(e,hole,light,e.distance,e.player.y,e.time,e.reducedMotion,marks))continue;
  for(const p of marks)if(p.alpha>=WARNING_NOTICE){
   // The coloured bent pixel is observable. The hidden source and its
   // distance are not exposed to the controller until the body is visible.
   hazards.push({x:snap(p.x,4),y:snap(p.y,4),radius:6,blackHoleCue:true});
  }
 }
 for(const item of e.biomeDynamics?.items||[]){
  if(item.family==='fall'&&(item.phase==='warning'||item.phase==='falling'))
   recordHazard(item.x-e.distance,item.y,item.radius);
 }
 const boss=e.layout.boss;
 if(boss?.attacks)for(const a of boss.attacks){
  const x=a.x-e.distance;
  // Guardian art is painted over the fog, fading into view within ~2.85s.
  // Read the current shimmer/ice path; never sample the shard's future motion.
  const halfWidth=(boss.id==='hollow-sun'?65:17)*boss.scale;
  const lead=boss.speed*2.85+halfWidth-(x-e.player.x);
  if(x<0||x>e.width||lead<boss.speed*.55*VISION.hazard)continue;
  if(boss.id==='frost-matron'&&!a.spent&&a.iceProgress<1){
   if(a.iceActive){
    // Approximate the visible shoulder and tip, in their current orientation.
    hazards.push({x:snap(x,4),y:snap(a.iceY,4),radius:14*boss.scale});
    hazards.push({x:snap(x,4),y:snap(a.iceY-a.side*17*boss.scale,4),radius:5*boss.scale});
   }
   for(const part of ICE_GUIDE_FACETS){
    if(part<a.iceProgress)continue;
    const y=a.iceOrigin+part*(a.iceEnd-a.iceOrigin);
    if(y>=0&&y<=e.height)hazards.push({x:snap(x,4),y:snap(y,4),radius:8*boss.scale});
   }
  }
  if(boss.id==='hollow-sun'){
   const y=a.wellY??a.y;
   if(y>=0&&y<=e.height)hazards.push({x:snap(x,4),y:snap(y,4),radius:17*boss.scale});
  }
 }
 const gust=e.gustState(),sy=e.scaleY;
 return {width:e.width,height:e.height,player:{x:e.player.x,y:snap(e.player.y,2),vy:snap(e.player.vy,12),radius:e.player.radius},
  speed:e.baseSpeed*(e.boostTime>0?1.48:1),energy:e.flame,maxEnergy:e.maxFlame,liftCost:e.flapCost,scaleY:sy,
  gravity:FLIGHT_TUNING.gravity*sy*clip(e.mod.gravity,.8,1.2),liftImpulse:FLIGHT_TUNING.flapImpulse*sy*clip(e.mod.flap,.8,1.2),
  terminalFall:FLIGHT_TUNING.terminalFall*sy,gustAcceleration:gust.active?snap(gust.direction*gust.force*sy,20):0,
  terrainStep:VISION.terrainStep,terrain:seenTerrain(e,sight),sparks:sparks.sort((a,b)=>a.x-b.x),hazards};
}
