// Rhythm measures accepted manual Lifts on the shared flight/world clock.
export const RHYTHM_TUNING=Object.freeze({minimumGap:.22,maximumGap:3,tolerance:.12,relativeTolerance:.2,dropSeconds:.34,caughtSeconds:.28});
const EPSILON=1e-9;

// For b <= a: a-b <= max(t,r*b), hence b >= min(a-t,a/(1+r)).
// For b >= a: b-a <= max(t,r*a). Clamp both sides to legal Lift gaps.
export function rhythmThirdWindow(firstGap,secondAt=0){
  const {minimumGap:m,maximumGap:M,tolerance:t,relativeTolerance:r}=RHYTHM_TUNING;
  if(!Number.isFinite(firstGap)||firstGap<m-EPSILON||firstGap>M+EPSILON)return null;
  return {opensAt:secondAt+Math.max(m,Math.min(firstGap-t,firstGap/(1+r))),
    targetAt:secondAt+firstGap,closesAt:secondAt+Math.min(M,firstGap+Math.max(t,r*firstGap))};
}

export class CardRhythm {
  constructor(engine){
    this.engine=engine;this.taps=[];this.waves=0;this.version=0;this.phase='idle';this.notes=0;
    this.window=null;this.endsAt=0;
  }
  get active(){const e=this.engine;return !!(e.mod?.cardRhythm&&e.running&&!e.paused&&!e.finished&&!e.destroyed&&e.alive!==false&&!e.dying&&!e.completing&&(!e.dream||e.dream.phase==='done'));}
  clear(){
    if(this.phase!=='idle')this.version++;
    this.taps.length=0;this.phase='idle';this.notes=0;this.window=null;this.endsAt=0;
  }
  destroy(){this.clear();}
  // Expiry runs with physics, including phrases that receive no further input.
  // No wall deadline can run ahead of a slowed or frozen world.
  advance(now=this.engine.time){
    if(!this.active||!Number.isFinite(now)){this.clear();return;}
    if(this.phase==='one'&&now>this.endsAt+EPSILON)this.clear();
    else if(this.phase==='two'&&now>this.window.closesAt+EPSILON)this.miss(this.window.closesAt,now);
    else if((this.phase==='miss'||this.phase==='caught')&&now>=this.endsAt)this.clear();
  }
  miss(at,now=at){
    this.taps.length=0;this.phase='miss';this.notes=2;this.endsAt=at+RHYTHM_TUNING.dropSeconds;this.version++;
    if(now>=this.endsAt)this.clear();
  }
  lift(now,cardContext={}){
    if(!this.active||!Number.isFinite(now)){this.clear();return false;}
    if(this.phase==='two'){
      const window=this.window;
      if(now<window.opensAt-EPSILON||now>window.closesAt+EPSILON){this.miss(now);return false;}
      this.taps.length=0;this.phase='caught';this.notes=3;this.endsAt=now+RHYTHM_TUNING.caughtSeconds;this.version++;this.waves++;
      const e=this.engine;
      e.luminanceWaves?.emit({x:e.distance+e.player.x,y:e.player.y,radius:Math.hypot(e.width,e.height),color:'#d7efdc',reveal:true,source:'card-rhythm',sourceKind:'card'});
      e.resolveCardRowEvent?.('rhythm-phrase',cardContext);
      e.burst?.(e.player.x,e.player.y,9,'#d9f6ce');
      e.sound?.('luminance',{strength:.65});
      e.activation?.('card-rhythm',{outcome:{wave:1}});
      e.setEvent?.('Rhythm · Pulse');
      return true;
    }
    this.advance(now);
    if(this.phase==='one'){
      const gap=now-this.taps[0],window=rhythmThirdWindow(gap,now);
      if(window){this.taps.push(now);this.phase='two';this.notes=2;this.window=window;this.version++;return false;}
    }
    // A resolved phrase is consumed. This new Lift always begins a fresh first beat.
    this.clear();this.taps.push(now);this.phase='one';this.notes=1;this.endsAt=now+RHYTHM_TUNING.maximumGap;this.version++;
    return false;
  }
  get state(){
    const now=this.engine.time;this.advance(now);
    return {count:this.taps.length,waves:this.waves,version:this.version,phase:this.phase,notes:this.notes,
      firstAt:this.taps[0]??null,secondAt:this.taps[1]??null,...this.window,endsAt:this.endsAt,now};
  }
}
