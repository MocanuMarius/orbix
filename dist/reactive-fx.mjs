// Original, quiet procedural sound. Nothing opens an AudioContext until unlock().
const CHORDS = {
  Dm9:[38,53,57,60,64], Bbmaj9:[34,57,60,62,65], Fmaj9:[41,57,60,64,67], C13:[36,58,62,64,69],
  Gm9:[43,58,62,65,69], Am7:[45,55,60,64,67], Em7b5:[40,55,58,62,65], A7sus:[45,55,59,62,64],
  A7b9:[45,55,58,61,64], Ebmaj9:[39,55,58,62,65], Dm11:[38,53,60,64,67], F6:[41,57,60,62,67],
};
const SECTIONS = [
  ['Dm9','Bbmaj9','Fmaj9','C13','Gm9','Bbmaj9','Em7b5','A7sus'],
  ['Dm11','Gm9','C13','Fmaj9','Bbmaj9','Em7b5','Am7','Dm9'],
  ['Fmaj9','Am7','Bbmaj9','C13','Dm9','Gm9','Em7b5','A7b9'],
  ['Bbmaj9','F6','Gm9','Dm11','Ebmaj9','Bbmaj9','A7sus','Dm9'],
  ['Dm9','Am7','Gm9','C13','Fmaj9','Bbmaj9','Em7b5','A7sus'],
  ['Gm9','C13','F6','Bbmaj9','Em7b5','A7b9','Dm9','Dm11'],
  ['Fmaj9','C13','Dm11','Am7','Bbmaj9','Ebmaj9','Gm9','A7sus'],
  ['Dm11','Bbmaj9','Gm9','F6','Ebmaj9','Em7b5','A7sus','Dm9'],
  ['Bbmaj9','Am7','Gm9','C13','Fmaj9','Em7b5','A7b9','Dm9'],
  ['Dm9','Gm9','Bbmaj9','Fmaj9','Em7b5','A7sus','Dm11','Dm9'],
];
const clamp = (n, lo=0, hi=1) => Math.max(lo, Math.min(hi, Number(n)||0));
const hz = n => 440 * 2 ** ((n-69)/12);

export function createFlightFX({AudioContextClass}={}) {
  let ctx, master, bed, air, sub, shimmer, panNode, noise, disposed=false, muted=false;
  const shimmerTones=[];
  let state={hole:0,pulse:0,dream:0,paused:false,pan:0,transport:{time:0,rate:1,bpm:78}};
  let lastState=-Infinity, serial=0;
  const persistent=[], voices=new Set(), last=new Map();
  const hidden=()=>typeof document!=='undefined' && document.hidden;
  const audible=()=>!disposed && !muted && !state.paused && !hidden();
  function target(param,value,smoothing=.09) {
    param.cancelScheduledValues(ctx.currentTime);
    param.setTargetAtTime(value,ctx.currentTime,smoothing);
  }
  function chord() {
    const t=state.transport||{}, bar=Math.floor(Math.max(0,Number(t.time)||0)*(Number(t.bpm)||78)/240)%160;
    return CHORDS[SECTIONS[Math.floor(bar/16)][Math.floor((bar%16)/2)]];
  }
  function stopVoices() {
    for (const voice of [...voices]) voice.stop();
  }
  function update(force=false) {
    if(!ctx || disposed) return;
    if(!force && ctx.currentTime-lastState<.045) return;
    lastState=ctx.currentTime;
    target(master.gain,audible()?.62:0,.035);
    target(bed.gain,audible()?Math.pow(clamp(state.hole),1.45)*.072:0,.22);
    target(air.frequency,270+clamp(state.hole)*580+clamp(state.dream)*220,.3);
    target(sub.frequency,hz(chord()[0]-12)*clamp(state.transport?.rate??1,.25,2),.6);
    target(shimmer.gain,audible()?clamp(state.pulse)*.023:0,.25);
    const harmony=chord(), rate=clamp(state.transport?.rate??1,.25,2);
    shimmerTones.forEach((osc,i)=>target(osc.frequency,hz(harmony[1+i*2]+12)*rate,.6));
    if(panNode.pan) target(panNode.pan,clamp(state.pan,-1,1),.14);
  }
  async function unlock() {
    if(disposed) return false;
    try {
      if(!ctx) {
        const Constructor=AudioContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!Constructor) return false;
        ctx=new Constructor();
        master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination);
        panNode=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain(); panNode.connect(master);
        noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
        const samples=noise.getChannelData(0);
        let smooth=0;
        for(let i=0;i<samples.length;i++){smooth=.84*smooth+.16*(Math.random()*2-1);samples[i]=smooth;}
        bed=ctx.createGain(); bed.gain.value=0; bed.connect(panNode);
        air=ctx.createBiquadFilter(); air.type='bandpass'; air.frequency.value=420; air.Q.value=2.3; air.connect(bed);
        const breath=ctx.createBufferSource(); breath.buffer=noise; breath.loop=true; breath.connect(air); breath.start(); persistent.push(breath);
        // Slow noise-formant modulation gives a nonverbal whisper, without speech samples.
        const murmur=ctx.createOscillator(), modulation=ctx.createGain();
        murmur.frequency.value=.67; modulation.gain.value=145; murmur.connect(modulation); modulation.connect(air.frequency); murmur.start(); persistent.push(murmur,modulation);
        sub=ctx.createOscillator(); sub.type='sine'; sub.frequency.value=hz(26);
        const low=ctx.createGain(); low.gain.value=.35; sub.connect(low); low.connect(bed); sub.start(); persistent.push(sub,low,air,bed,panNode,master);
        shimmer=ctx.createGain(); shimmer.gain.value=0; shimmer.connect(panNode);persistent.push(shimmer);
        // Two preallocated soft overtones breathe together as pulse presence changes.
        for(let i=0;i<2;i++){
          const osc=ctx.createOscillator(), amplitude=ctx.createGain();
          osc.type='sine';osc.frequency.value=hz(65+i*7);osc.detune.value=i?3:-3;
          amplitude.gain.value=.48;osc.connect(amplitude);amplitude.connect(shimmer);osc.start();
          shimmerTones.push(osc);persistent.push(osc,amplitude);
        }
        const shimmerLFO=ctx.createOscillator();
        shimmerLFO.frequency.value=.8;
        // Detune modulation cannot leak sound through the silent parent bus.
        for(const osc of shimmerTones){const drift=ctx.createGain();drift.gain.value=2;shimmerLFO.connect(drift);drift.connect(osc.detune);persistent.push(drift);}
        shimmerLFO.start();persistent.push(shimmerLFO);
      }
      if(ctx.state==='suspended') await ctx.resume();
      update(true); return ctx.state==='running';
    } catch { return false; }
  }
  function voice({frequency=440,endFrequency=frequency,duration=.3,volume=.04,delay=0,noiseVoice=false,filter=1800,type='sine',attack=.012}) {
    if(voices.size>=18) return;
    const source=noiseVoice?ctx.createBufferSource():ctx.createOscillator();
    if(noiseVoice) source.buffer=noise;
    else {source.type=type;source.frequency.setValueAtTime(frequency,ctx.currentTime+delay);source.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),ctx.currentTime+delay+duration);}
    const gain=ctx.createGain(), tone=ctx.createBiquadFilter();
    tone.type=noiseVoice?'bandpass':'lowpass'; tone.frequency.value=filter; tone.Q.value=noiseVoice?.7:.5;
    const at=ctx.currentTime+delay;
    gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(volume,at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    // Only the distant hole bed follows the source. Body pickups and shields
    // stay anchored to the player instead of sliding toward the hazard.
    source.connect(tone);tone.connect(gain);gain.connect(master);
    let ended=false;
    const record={stop(){if(ended)return;ended=true;try{source.stop();}catch{}source.disconnect();tone.disconnect();gain.disconnect();voices.delete(record);}};
    source.onended=record.stop;voices.add(record);if(noiseVoice)source.start(at,Math.random()*1.5);else source.start(at);source.stop(at+duration+.025);
  }
  function play(type,options={}) {
    if(!ctx||ctx.state!=='running'||!audible())return;
    const aliases={collect:'pickup',resonate:'pickup',shell:'pickup',bellwind:'flash',luminance:'pulse',blackhole:'hole',dark:'hole',dream:'hole',wake:'shield'};
    type=aliases[type]||type;
    const now=ctx.currentTime, intervals={pickup:.11,flap:.085,boost:.2,hit:.22,pulse:.7,guardian:.6,shield:.45,clear:.8,flash:.6,hole:1};
    if(now-(last.get(type)??-Infinity)<(intervals[type]??.15))return;
    last.set(type,now);
    const strength=.5+.5*clamp(options.strength??1), notes=chord(), index=(serial++)%4+1;
    const rate=clamp(state.transport?.rate??1,.25,2);
    const tone=(midi,duration,volume,delay=0)=>voice({frequency:hz(midi)*rate,duration,volume:volume*strength,delay,filter:2400});
    if(type==='pickup') {
      // A soft shell fracture carries crowded pickups; tonal accents have their own slower gate.
      voice({noiseVoice:true,duration:.07,volume:.075*strength,filter:1100,attack:.003});
      if(now-(last.get('pickupTone')??-Infinity)>.29){
        last.set('pickupTone',now);
        const tier=Math.round(clamp(options.tier??1,1,3)), collector=String(options.via||'').includes('collector');
        const base=notes[index]+(tier===1?12:0), energy=.052/Math.sqrt(tier+1);
        tone(base,collector?.85:.48+tier*.09,energy);
        tone(tier===1?notes[index]:notes[1]+12,.38+tier*.09,energy*.55,.025);
        if(tier===3)tone(notes[3],.74,energy*.65,.045);
        if(collector)voice({noiseVoice:true,duration:.38,volume:.045*strength,filter:2300,attack:.055});
      }
    } else if(type==='shield') {
      tone(notes[0]+12,.65,.034);tone(notes[2],.72,.027,.09);
      voice({noiseVoice:true,duration:.22,volume:.055,filter:650,attack:.025});
    } else if(type==='flash') {
      notes.slice(1).forEach((note,i)=>tone(note+24,.62,.019,i*.045));
      voice({noiseVoice:true,duration:.55,volume:.055,filter:3300,attack:.09});
    } else if(type==='clear') {
      tone(notes[0]+12,1.3,.032);
      notes.slice(1).forEach((note,i)=>tone(note,1.45,.021,.055+i*.025));
    } else if(type==='pulse'||type==='guardian') {
      notes.slice(1).forEach((note,i)=>tone(note+12,type==='pulse'?1.7:1.1,.027,i*.065));
      voice({noiseVoice:true,duration:1.1,volume:.09,filter:2600,attack:.2});
    } else if(type==='flap'||type==='boost') {
      voice({noiseVoice:true,duration:type==='boost'?.42:.15,volume:type==='boost'?.14:.09,filter:type==='boost'?1300:700,attack:.012});
      if(type==='boost')voice({frequency:hz(notes[0])*rate,endFrequency:hz(notes[1])*rate,duration:.42,volume:.045});
    } else if(type==='hit') {
      voice({noiseVoice:true,duration:.22,volume:.14,filter:480,attack:.004});
      voice({frequency:110,endFrequency:45,duration:.25,volume:.055});
    } else if(type==='hole')voice({noiseVoice:true,duration:1.2,volume:.11,filter:390,attack:.18});
  }
  function visibility(){if(hidden())stopVoices();update(true);}
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  return {
    unlock,
    setMuted(value){muted=Boolean(value);if(muted)stopVoices();update(true);},
    setState(next={}){const wasPaused=state.paused;state={...state,...next};if(state.paused&&!wasPaused)stopVoices();update(wasPaused!==state.paused);},
    play,
    destroy(){if(disposed)return;disposed=true;if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);stopVoices();for(const node of persistent){try{node.stop?.();node.disconnect();}catch{}}if(ctx){try{const closing=ctx.close();closing?.catch?.(()=>{});}catch{}}},
  };
}
