export const RESUME_COUNTDOWN_SECONDS=3;
export function countdownNumber(elapsed){return Math.max(0,Math.ceil(RESUME_COUNTDOWN_SECONDS-Math.max(0,elapsed)));}
export function countdownMarkup(){return `<div class="flight-countdown" role="status" aria-live="off" aria-label="Flight resumes in 3 seconds"><span>GET READY</span><b>3</b><small>Then tap anywhere to Lift</small><i><em></em></i></div>`;}
/** A cancellable wall-clock countdown. Physics stays paused throughout. */
export function startResumeCountdown(layer,{onComplete,now=()=>performance.now(),request=requestAnimationFrame,cancel=cancelAnimationFrame,blocked=()=>false}={}){
 layer.innerHTML=countdownMarkup();
 const panel=layer.querySelector('.flight-countdown'),number=panel.querySelector('b'),bar=panel.querySelector('em');
 let frame=null,stopped=false,last=3;const started=now();
 const stop=()=>{stopped=true;if(frame!==null)cancel(frame);};
 const tick=()=>{
  if(stopped)return;if(blocked()){stop();return;}
  const elapsed=(now()-started)/1000,value=countdownNumber(elapsed);
  if(value!==last){last=value;number.textContent=String(value);panel.setAttribute('aria-label',`Flight resumes in ${value} seconds`);}
  bar.style.transform=`scaleX(${Math.max(0,1-elapsed/RESUME_COUNTDOWN_SECONDS)})`;
  if(value===0){stop();layer.innerHTML='';onComplete?.();return;}
  frame=request(tick);
 };
 frame=request(tick);return stop;
}
