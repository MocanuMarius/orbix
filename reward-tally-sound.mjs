// Code-made sound for the rewards tally (no audio files). The flight engine's play() rate-limits each cue to 150 ms or more,
// which would swallow a tick per source, so this makes its own quiet sine voices with the same envelope style.
// getGain() returns the player's FX level as a gain (0 mutes); the context is created lazily and only after a gesture.
export function createTallySound({getGain=()=>1,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
 let ctx=null,disposed=false;
 const context=()=>{
  if(disposed||!AudioContextClass)return null;
  try{ctx||=new AudioContextClass();if(ctx.state==='suspended')ctx.resume?.();}catch{return null;}
  return ctx.state==='closed'?null:ctx;
 };
 function voice(frequency,{duration=.08,volume=.05,delay=0,type='sine'}={}){
  const level=Number(getGain())||0,c=context();
  if(!c||level<=0)return;
  const start=c.currentTime+delay,osc=c.createOscillator(),env=c.createGain();
  osc.type=type;osc.frequency.value=frequency;
  env.gain.setValueAtTime(0.0001,start);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume*level),start+.005);
  env.gain.exponentialRampToValueAtTime(0.0001,start+duration);
  osc.connect(env);env.connect(c.destination);osc.start(start);osc.stop(start+duration+.02);
 }
 return {
  /** One short tick per source; later ticks climb a little, up to a fifth. */
  tick(index=0,count=1){const rise=count>1?Math.min(1,index/(count-1)):0;voice(880*2**(rise*7/12),{duration:.06,volume:.045});},
  /** A richer chime when everything has landed: a root, a fifth and an octave. */
  chime(){[[659.25,0],[987.77,.07],[1318.5,.14]].forEach(([hz,delay],i)=>voice(hz,{duration:.55-i*.08,volume:.05,delay}));voice(329.63,{duration:.7,volume:.035});},
  dispose(){disposed=true;try{ctx?.close?.();}catch{}ctx=null;},
 };
}
