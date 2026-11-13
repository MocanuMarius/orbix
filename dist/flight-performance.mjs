// Explicit ?perf=1 diagnostics. Bounded in-memory data; nothing is uploaded.
const CAPACITY=3600;
class Samples {
  constructor(){this.values=new Float64Array(CAPACITY);this.count=0;this.index=0;this.total=0;this.maximum=0;this.over50=0;this.over100=0;this.over250=0;}
  add(value){if(!Number.isFinite(value)||value<0)return;this.values[this.index]=value;this.index=(this.index+1)%CAPACITY;this.count++;this.total+=value;this.maximum=Math.max(this.maximum,value);if(value>50)this.over50++;if(value>100)this.over100++;if(value>250)this.over250++;}
  report(){const a=Array.from(this.values.subarray(0,Math.min(this.count,CAPACITY))).sort((a,b)=>a-b);const p=f=>a[Math.min(a.length-1,Math.floor(a.length*f))]||0;return{count:this.count,mean:this.total/Math.max(1,this.count),p50:p(.5),p95:p(.95),p99:p(.99),maximum:this.maximum,over50:this.over50,over100:this.over100,over250:this.over250,percentileWindowSamples:a.length};}
}
export function attachFlightPerformance(engine,{onStatus=()=>{}}={}){
  const raf=new Samples(),renders=new Samples(),work=new Samples(),longTasks=[],errors=[],events=[];
  let previousRaf=0,previousRender=0,windowFrames=0,windowStart=performance.now(),disposed=false;
  const born=performance.now(),record=(kind,extra={})=>{if(events.length<100)events.push({kind,at:performance.now()-born,...extra})};
  const reset=()=>{previousRaf=previousRender=0;windowFrames=0;windowStart=performance.now()};
  const error=e=>{if(errors.length<20)errors.push({message:String(e.message||e.reason||'Unknown error'),at:performance.now()-born})};
  const visibility=()=>{record('visibility',{hidden:document.hidden});reset()};
  window.addEventListener('error',error);window.addEventListener('unhandledrejection',error);document.addEventListener('visibilitychange',visibility);
  let observer;
  if(typeof PerformanceObserver!=='undefined')try{observer=new PerformanceObserver(list=>{for(const item of list.getEntries())if(longTasks.length<200)longTasks.push({at:item.startTime-born,duration:item.duration,activeAtObservation:engine.running&&!engine.paused&&!engine.finished&&!engine.destroyed&&!document.hidden})});observer.observe({type:'longtask'})}catch{}
  const tick=engine.tick,render=engine.render,pause=engine.pause,resume=engine.resume,destroy=engine.destroy;
  engine.tick=function(timestamp){
    const live=this.running&&!this.paused&&!this.finished&&!this.destroyed&&!document.hidden;
    if(live&&previousRaf)raf.add(timestamp-previousRaf);previousRaf=live?timestamp:0;
    const start=performance.now();try{return tick.call(this,timestamp)}finally{
      if(live)work.add(performance.now()-start);
      const now=performance.now();if(live&&now-windowStart>=500){onStatus({fps:Math.round(windowFrames*1000/(now-windowStart)),worstGap:Math.round(renders.maximum),stalls:renders.over100});windowFrames=0;windowStart=now}
    }
  };
  engine.render=function(){const now=performance.now();if(this.running&&!this.paused&&!document.hidden){if(previousRender){const gap=now-previousRender;renders.add(gap)}previousRender=now;windowFrames++}return render.call(this)};
  engine.pause=function(...args){record('pause');reset();return pause.apply(this,args)};
  engine.resume=function(...args){record('resume');reset();return resume.apply(this,args)};
  const report=()=>({schema:1,createdAt:new Date().toISOString(),device:{userAgent:navigator.userAgent,dpr:devicePixelRatio,width:innerWidth,height:innerHeight},flight:{terrain:engine.terrain,level:engine.levelIdentity?.id,companions:engine.companions,simSeconds:engine.time},rafGapMs:raf.report(),renderGapMs:renders.report(),tickCpuMs:work.report(),longTasks,errors,events,notes:'Foreground active flight only; intentional pauses are excluded. Percentiles use the last 3600 samples; maxima/counters span this flight. Long-task entries cover the recorder lifetime; activeAtObservation describes callback delivery, not exact historical phase. Diagnostic mode adds small measurement overhead.'});
  const dispose=()=>{if(disposed)return;disposed=true;observer?.disconnect();window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',error);document.removeEventListener('visibilitychange',visibility)};
  engine.destroy=function(...args){dispose();return destroy.apply(this,args)};
  return{report,dispose};
}
export function downloadPerformanceReport(report){
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='wispbound-performance.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
