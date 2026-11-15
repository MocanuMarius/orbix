// Input cadence belongs to the player's clock, independent of slowed simulation
// and the music transport. Successful trios are consumed, never overlapping.
export const RHYTHM_TUNING=Object.freeze({minimumGap:.22,maximumGap:3,tolerance:.12,relativeTolerance:.2});
export class CardRhythm {
  constructor(engine){this.engine=engine;this.taps=[];this.waves=0;}
  clear(){this.taps.length=0;}
  lift(now){
    const e=this.engine,dream=e.dream;
    if(!e.mod?.cardRhythm||dream&&dream.phase!=='done'||!Number.isFinite(now)){this.clear();return false;}
    const taps=this.taps,last=taps.at(-1),gap=now-last;
    if(last!==undefined&&(gap<RHYTHM_TUNING.minimumGap||gap>RHYTHM_TUNING.maximumGap))this.clear();
    taps.push(now);
    if(taps.length<3)return false;
    const a=taps[1]-taps[0],b=taps[2]-taps[1];
    if(Math.abs(a-b)>Math.max(RHYTHM_TUNING.tolerance,Math.min(a,b)*RHYTHM_TUNING.relativeTolerance)){
      taps.shift();return false;
    }
    this.clear();this.waves++;
    e.luminanceWaves?.emit({x:e.distance+e.player.x,y:e.player.y,radius:Math.hypot(e.width,e.height),color:'#d7efdc',reveal:true});
    e.burst?.(e.player.x,e.player.y,9,'#d9f6ce');
    e.sound?.('luminance',{strength:.65});
    e.activation?.('card-rhythm',{outcome:{wave:1}});
    e.setEvent?.('Rhythm · Luminance wave');
    return true;
  }
  get state(){return {count:this.taps.length,waves:this.waves};}
}
