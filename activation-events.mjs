// Attempt-local receipts, independent of the once-only teaching notices.
export const ACTIVATION_EVENT_LIMIT=48;
export class ActivationEvents {
  constructor(){this.sequence=0;this.events=[];this.cached=[];this.dirty=false;}
  emit(time,source,detail={}){
    if(!source)return null;
    const event={...detail,source,kind:detail.kind||'skill',time:Number(time)||0,sequence:++this.sequence,
      outcome:{...detail.outcome}};
    this.events.push(event);
    if(this.events.length>ACTIVATION_EVENT_LIMIT)this.events.splice(0,this.events.length-ACTIVATION_EVENT_LIMIT);
    this.dirty=true;
    return event;
  }
  snapshot(time){
    if(this.events.length&&time-this.events[0].time>3){this.events=this.events.filter(event=>time-event.time<=3);this.dirty=true;}
    if(this.dirty){this.cached=this.events.map(event=>Object.freeze({...event,outcome:Object.freeze({...event.outcome})}));this.dirty=false;}
    return this.cached;
  }
}

// Consume each receipt once. Keep simultaneous effects distinct, but add rapid
// repeats together rather than replacing the last effect with the next one.
export class ActivationFeed {
  constructor(){this.sequence=0;this.time=0;this.items=[];this.visible=[];}
  clear(snapshot={}){this.items=[];this.visible=[];this.sequence=Number(snapshot.activationSequence)||0;this.time=Number(snapshot.time)||0;}
  update(snapshot={}){
    const now=Number(snapshot.time)||0;
    if(now<this.time||Number(snapshot.activationSequence)<this.sequence)this.clear();
    this.time=now;
    if(snapshot.paused||snapshot.finished||snapshot.dying){if(this.items.length||this.sequence!==(Number(snapshot.activationSequence)||0))this.clear(snapshot);return this.visible;}
    let changed=false;
    if(this.items.some(item=>now-item.time>=1.65)){this.items=this.items.filter(item=>now-item.time<1.65);changed=true;}
    for(const event of snapshot.activationEvents||[]){
      if(event.sequence<=this.sequence)continue;
      this.sequence=event.sequence;
      if(now-event.time>1.4)continue;
      changed=true;
      const match=[...this.items].reverse().find(item=>item.source===event.source&&item.kind===event.kind
        &&item.phase===event.phase&&event.time-item.time<=.4);
      if(match){
        match.count++;match.sequence=event.sequence;match.time=event.time;
        for(const [key,value]of Object.entries(event.outcome||{})){
          if(typeof value==='number'&&['fuel','recovery','lifts','saved','stored'].includes(key))match.outcome[key]=(Number(match.outcome[key])||0)+value;
          else match.outcome[key]=value;
        }
      }else this.items.push({...event,firstSequence:event.sequence,count:1,outcome:{...event.outcome}});
    }
    // The engine already bounds this stream. The UI keeps every distinct
    // overlapping receipt, with rescues first, and no delayed playback queue.
    this.sequence=Math.max(this.sequence,Number(snapshot.activationSequence)||0);
    if(changed)this.visible=[...this.items].sort((a,b)=>(b.priority||0)-(a.priority||0)||a.firstSequence-b.firstSequence).slice(0,6);
    return this.visible;
  }
}
