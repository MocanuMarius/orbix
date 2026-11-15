import {bellwindAcceleration} from './atlas-flight.mjs?v=spark-choices-2';
import {DraftField,DRAFT_TUNING} from './drafts.mjs?v=spark-choices-2';
import {lightVisibility} from './light-field.mjs?v=spark-choices-2';
import {isFuelPickup,pickupContactRadius} from './pickups.mjs?v=spark-choices-2';
import {obstacleEdgeClearance} from './edging-pulse.mjs?v=spark-choices-2';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),DT=1/60;
export const PROJECTION_HORIZONS=Object.freeze([0,.7,1.2,1.8]);

// The resume ramp advances simulation more slowly than the player's tap clock.
function tapDelay(e,simulationSeconds) {
  const remaining=e.resumeRemaining;
  if(!remaining)return simulationSeconds;
  const rate=.9/e.resumeRampSeconds, scale=e.resumeScale;
  const simulatedRamp=remaining*(1+scale)/2;
  if(simulationSeconds>=simulatedRamp)return remaining+simulationSeconds-simulatedRamp;
  return 2*simulationSeconds/(scale+Math.sqrt(scale*scale+2*rate*simulationSeconds));
}

function affordTaps(e,taps,now) {
  if(e.dream?.freeGlow || !taps.length || e.availableGlow>=taps.length*e.flapCost)return true;
  const beatTaps=e.fourthBeatTaps.slice();
  const boon=Object.create(e.flightBoon);
  let fuel=e.availableGlow, storedLifts=e.artifactEffects.freeLiftCount??Number(e.artifactEffects.freeLift);
  for(const delay of taps){
    const at=now+tapDelay(e,delay), beat=e.fourthBeatAt(at,beatTaps);
    if(beat.ready) {beatTaps.length=0; continue;}
    if(storedLifts>0)storedLifts--;
    else fuel-=boon.spendLift(e.flapCost);
    if(fuel < -1e-7)return false;
    if(beat.rank)beatTaps.push(at);
  }
  return true;
}

const ROUTE_TAPS=[[]];
for(const t of [0,.2,.4,.6,.8,1]) {
  ROUTE_TAPS.push([t],[t,t+.4],[t,t+.7]);
}

// A bounded, read-only preview. Only the nearby draft timers are copied; no
// simulation, pickups, rewards or companion state on the live engine is run.
export class FlightProjection {
  constructor(tuning,hit){this.tuning=tuning;this.hit=hit;this.nextAt=-Infinity;this.result=null;}
  read(e){
    const rank=clamp(Math.floor(e.mod.driftSense||0),0,3);
    if(!rank||!e.alive||e.dying||e.completing||e.finished||e.destroyed||e.tutorialAwaitingLift)return null;
    const beatCount=e.mod.fourthBeatRank ? e.fourthBeat.count : 0;
    const changed=this.lastFlap!==e.lastFlapTime||this.lastPower!==e.abilityStartedAt||this.lastHeld!==e.liftHeld||this.lastHeight!==e.height||this.lastRank!==rank||this.lastBeatCount!==beatCount;
    if(!this.result||changed||e.time>=this.nextAt){
      this.lastFlap=e.lastFlapTime;this.lastPower=e.abilityStartedAt;this.lastHeld=e.liftHeld;this.lastHeight=e.height;this.lastRank=rank;this.lastBeatCount=beatCount;
      this.result=this.predict(e,rank);
      const affordable=e.dream?.freeGlow||e.artifactEffects?.freeLift||e.availableGlow+1e-7>=(e.nextLiftCost??e.flapCost);
      if(affordable)this.result.liftContact=this.predict(e,rank,[0]).ceilingContact;
      if(rank===3&&affordable){
        if(!this.routeAt||changed||e.time>=this.routeAt){this.route=this.findRoute(e);this.routeAt=e.time+.25;}
        this.result.route=this.route;
      }
      this.nextAt=e.time+.05;
    }
    return this.result;
  }
  findRoute(e){
    // Never claim a safe route through independently moving guardian attacks.
    if(e.layout.boss?.attacks?.length)return null;
    const light=e.getLightState?.()||{},start=e.distance+e.player.x;
    const target=e.layout.embers.filter(p=>!p.collected&&!p.carried&&isFuelPickup(p)&&p.x>start&&p.x<start+e.baseSpeed*1.7&&lightVisibility(e,light,p.x-e.distance,p.y,e.player.y)>.15)
      .sort((a,b)=>Math.hypot(a.x-start,a.y-e.player.y)-Math.hypot(b.x-start,b.y-e.player.y))[0];
    if(!target)return null;
    const now=e.fourthBeatNow();
    let best=null;
    for(const taps of ROUTE_TAPS){
      if(!affordTaps(e,taps,now))continue;
      const path=this.predict(e,3,taps);
      if(path.contact||path.uncertain)continue;
      const reach=path.points.findIndex(p=>Math.hypot(p.x-target.x,p.y-target.y)<=pickupContactRadius(target,e.height));
      if(reach<0)continue;
      const score=taps.length*10+path.points[reach].time-e.time;
      if(!best||score<best.score)best={...path,points:path.points.slice(0,reach+1),score,taps,target};
    }
    return best;
  }
  predict(e,rank=clamp(Math.floor(e.mod.driftSense||0),0,3),taps=[]){
    const horizon=PROJECTION_HORIZONS[rank],startX=e.distance+e.player.x,maxX=startX+e.baseSpeed*1.48*horizon+24;
    const obstacles=e.layout.obstacles.filter(o=>!o.destroyed&&o.x+o.width*2.5>=startX-30&&o.x-o.width<=maxX+30);
    const field=Object.create(DraftField.prototype);
    field.zones=(e.drafts?.zones||[]).filter(z=>z.x+z.rx>=startX&&z.x-z.rx<=maxX+e.baseSpeed*1.48*DRAFT_TUNING.warning).map(z=>({...z}));
    const releasing=(e.fleet.find(c=>c.role==='leveler')?.remaining||0)>0;
    let recovery=releasing?.25:e.levelRecovery,dive=releasing?(Number(e.mod.levelerDive)>0?.5:0):e.levelDive;
    let time=e.time,x=startX,y=e.player.y,vy=e.player.vy,boost=e.boostTime,guard=e.exitProtection;
    const points=[{x,y,time}],s=e.scaleY;
    const collides=(px,py,t)=>py+e.player.radius<0||py-e.player.radius>e.height||obstacles.some(o=>this.hit(px,py,e.player.radius,o,t));
    // Contact-driven scenery changes after a choice; do not promise a path
    // through a pod, falling shard or switch that has not been resolved yet.
    const interactiveEdge=e.biomeDynamics?.forecastBoundary(startX,maxX)??Infinity;
    let contact=false,exit=false,uncertain=false,tapIndex=0,ceilingContact=null;
    for(let step=1;step<=Math.round(horizon/DT);step++){
      const previous={x,y,time};time+=DT;
      if(tapIndex<taps.length&&time-e.time>=taps[tapIndex]){vy=-this.tuning.flapImpulse*s*clamp(Number(e.mod.flap)||1,.8,1.2);tapIndex++;}
      const oldBoost=boost;boost=Math.max(0,boost-DT);guard=Math.max(0,guard-DT);if(oldBoost>0&&boost===0)guard=.45;
      recovery=Math.max(0,recovery-DT);dive=Math.max(0,dive-DT);
      const speed=e.baseSpeed*(boost>0?1.48:1);x+=speed*DT;
      field.update(time,x,speed);
      const gust=field.sample(time,x,y,(Number(e.mod.windSensitivity)||1)*(e.ascentInfo.draftForceScale||1));
      const blend=recovery>0?1-recovery/.25:1;
      let gravity=this.tuning.gravity*s*clamp(Number(e.mod.gravity)||1,.8,1.2)*blend*blend*(3-2*blend);
      if(dive>0)gravity+=180*s*clamp(Number(e.mod.levelerDive)||1,1,2);
      if(gust.active){const resistance=clamp(Number(e.mod.swiftResistance)||DRAFT_TUNING.boostResistance,0,.95);
        const windGuard=boost>0?1-resistance:1-resistance*clamp(guard/.45,0,1);
        gravity+=gust.direction*gust.force*s*(e.mod.steady?.45:1)*windGuard;}
      if(e.atlas?.bells)gravity+=bellwindAcceleration(e,x,y,vy,boost);
      const terminal=this.tuning.terminalFall*clamp(Number(e.mod.terminalFall)||1,1,1.15);
      const downwardWind=gust.guardian&&gust.direction>0?65*gust.strength*(boost>0?.28:1):0;
      vy=clamp(vy+gravity*DT,-520*s,(terminal+downwardWind)*s);y+=vy*DT;
      if(x>=interactiveEdge){uncertain=true;break;}
      if(collides(x,y,time)){
        let lo=0,hi=1;
        for(let i=0;i<5;i++){const m=(lo+hi)/2;if(collides(previous.x+(x-previous.x)*m,previous.y+(y-previous.y)*m,previous.time+DT*m))hi=m;else lo=m;}
        // Locate the solid surface itself, rather than painting the wisp's
        // centre or treating open sky at the viewport edge as a ceiling.
        if(vy<0){
          const touchX=previous.x+(x-previous.x)*hi,touchY=previous.y+(y-previous.y)*hi,touchTime=previous.time+DT*hi;
          const surface={x:0,y:0,clearance:Infinity};
          for(const obstacle of obstacles)obstacleEdgeClearance(touchX,touchY,e.player.radius,obstacle,touchTime,e.player.radius+1,undefined,surface);
          if(surface.clearance<=.6&&surface.y<touchY-e.player.radius*.25)
            ceilingContact={x:surface.x,y:surface.y,time:touchTime};
        }
        x=previous.x+(x-previous.x)*lo;y=previous.y+(y-previous.y)*lo;time=previous.time+DT*lo;
        contact=true;
      }
      exit=x-e.player.x>=e.totalDistance;
      if(step%3===0||contact||exit||step===Math.round(horizon/DT))points.push({x,y,time});
      if(contact||exit||x-e.distance>e.width+20)break;
    }
    return {rank,horizon,at:e.time,points,contact,exit,uncertain,ceilingContact};
  }
}

export function drawFlightProjection(c,e,{scale=1,distance=e.renderDistance??e.distance,playerY=e.renderPlayerY??e.player.y}={}){
  const guide=e.getFlightProjection?.();if(!guide)return;
  const light=e.getLightState?.()||{};
  for(const [path,color,alpha] of [[guide.route,'#d8ef99',.7]]){
    if(!path)continue;c.save();c.fillStyle=color;
    for(const p of path.points){if(p.time<=e.time)continue;const x=p.x-distance,y=p.y;
      c.globalAlpha=alpha*lightVisibility(e,light,x,y,playerY);
      c.fillRect(Math.round(x*scale),Math.round(y*scale),Math.max(1,2*scale),Math.max(1,2*scale));
    }c.restore();
  }
  const impact=guide.liftContact;
  if(impact){
    const x=impact.x-distance,y=impact.y,visibility=lightVisibility(e,light,x,y,playerY);
    if(x>=0&&x<=e.width&&y>=0&&y<=e.height&&visibility>.08){
      const px=Math.round(x*scale),py=Math.round(y*scale),core=Math.max(2,Math.round(3*scale)),halo=core+2;
      c.save();c.fillStyle='#ef6868';c.globalAlpha=.16+.18*visibility;
      c.fillRect(px-Math.floor(halo/2),py-Math.floor(halo/2),halo,halo);
      c.fillStyle='#ff756c';c.globalAlpha=.55+.4*visibility;
      c.fillRect(px-Math.floor(core/2),py-Math.floor(core/2),core,core);c.restore();
    }
  }
  c.save();c.strokeStyle='#c0d3c5';c.lineWidth=1;
  let previous={x:e.player.x*scale,y:playerY*scale};
  for(const p of guide.points){
    if(p.time<=e.time)continue;
    const x=(p.x-distance)*scale,y=p.y*scale,remaining=(p.time-e.time)/guide.horizon;
    c.globalAlpha=.26*(1-clamp(remaining,0,1)*.8)*lightVisibility(e,light,x/scale,y/scale,playerY);
    c.beginPath();c.moveTo(previous.x,previous.y);c.lineTo(x,y);c.stroke();previous={x,y};
  }
  const end=guide.points.at(-1);
  if(guide.rank===3&&end.time>e.time&&!guide.exit&&!guide.uncertain){
    c.globalAlpha=(guide.contact?.28:.15)*lightVisibility(e,light,end.x-distance,end.y,playerY);c.strokeStyle=guide.contact?'#dfbd8e':'#c0d3c5';
    const x=(end.x-distance)*scale,y=end.y*scale,r=5*scale;
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.fillStyle=c.strokeStyle;c.fillRect(Math.round(x),Math.round(y),1,1);
  }
  c.restore();
}
