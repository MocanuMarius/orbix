import {DraftField,DRAFT_TUNING} from './drafts.mjs?v=a1-balance-1';
import {lightVisibility} from './light-field.mjs?v=a1-balance-1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),DT=1/60;
export const PROJECTION_HORIZONS=Object.freeze([0,.7,1.2,1.8]);

// A bounded, read-only preview. Only the nearby draft timers are copied; no
// simulation, pickups, rewards or companion state on the live engine is run.
export class FlightProjection {
  constructor(tuning,hit){this.tuning=tuning;this.hit=hit;this.nextAt=-Infinity;this.result=null;}
  read(e){
    const rank=clamp(Math.floor(e.mod.driftSense||0),0,3);
    if(!rank||!e.alive||e.dying||e.completing||e.finished||e.destroyed||e.tutorialAwaitingLift)return null;
    const changed=this.lastFlap!==e.lastFlapTime||this.lastPower!==e.abilityStartedAt||this.lastHeld!==e.liftHeld||this.lastHeight!==e.height||this.lastRank!==rank;
    if(!this.result||changed||e.time>=this.nextAt){
      this.lastFlap=e.lastFlapTime;this.lastPower=e.abilityStartedAt;this.lastHeld=e.liftHeld;this.lastHeight=e.height;this.lastRank=rank;
      this.result=this.predict(e,rank);this.nextAt=e.time+.05;
    }
    return this.result;
  }
  predict(e,rank=clamp(Math.floor(e.mod.driftSense||0),0,3)){
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
    let contact=false,exit=false,uncertain=false;
    for(let step=1;step<=Math.round(horizon/DT);step++){
      const previous={x,y,time};time+=DT;
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
      vy=clamp(vy+gravity*DT,-520*s,this.tuning.terminalFall*s*clamp(Number(e.mod.terminalFall)||1,1,1.15));y+=vy*DT;
      if(x>=interactiveEdge){uncertain=true;break;}
      if(collides(x,y,time)){
        let lo=0,hi=1;
        for(let i=0;i<5;i++){const m=(lo+hi)/2;if(collides(previous.x+(x-previous.x)*m,previous.y+(y-previous.y)*m,previous.time+DT*m))hi=m;else lo=m;}
        x=previous.x+(x-previous.x)*lo;y=previous.y+(y-previous.y)*lo;time=previous.time+DT*lo;
        contact=true;
      }
      exit=x-e.player.x>=e.totalDistance;
      if(step%3===0||contact||exit||step===Math.round(horizon/DT))points.push({x,y,time});
      if(contact||exit||x-e.distance>e.width+20)break;
    }
    return {rank,horizon,at:e.time,points,contact,exit,uncertain};
  }
}

export function drawFlightProjection(c,e,{scale=1,distance=e.renderDistance??e.distance,playerY=e.renderPlayerY??e.player.y}={}){
  const guide=e.getFlightProjection?.();if(!guide)return;
  const light=e.getLightState?.()||{};
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
