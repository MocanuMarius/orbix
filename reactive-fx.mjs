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
  let ctx, master, bed, air, sub, shimmer, panNode, noise, disposed=false, muted=false, fxVolume=1;
  const shimmerTones=[];
  let chargeBus,chargeFilter,chargeTone;
  const crackleLayers=[];
  let state={hole:0,pulse:0,dream:0,paused:false,pan:0,proximity:0,proximityContact:false,transport:{time:0,rate:1,bpm:88}};
  let lastState=-Infinity, serial=0;
  // Three foreground events: decoration < world action < danger/contact.
  // Six source slots remain reserved for danger; fading stolen tails still count
  // against the physical 18-source ceiling, but no longer occupy the foreground.
  const persistent=[], voices=new Set(), last=new Map(),events=new Set();
  let buildingEvent,focusValue=0,focusStamp=0,dropped=0;
  const hidden=()=>typeof document!=='undefined' && document.hidden;
  const audible=()=>!disposed && !muted && !state.paused && state.alive!==false && !state.dying && !hidden();
  const chargeActive=()=>audible()&&state.proximityContact&&clamp(state.proximity)>0&&!state.proximityRecovery;
  function target(param,value,smoothing=.09) {
    param.cancelScheduledValues(ctx.currentTime);
    param.setTargetAtTime(value,ctx.currentTime,smoothing);
  }
  function chord() {
    const t=state.transport||{};
    // The v1.0-music rotation (default; ?music=1 is the original) reports its own chord; the original score does not.
    if(Array.isArray(t.chord)&&t.chord.length>=5)return t.chord;
    const bar=Math.floor(Math.max(0,Number(t.time)||0)*(Number(t.bpm)||88)/240)%160;
    return CHORDS[SECTIONS[Math.floor(bar/16)][Math.floor((bar%16)/2)]];
  }
  function stopVoices() {
    for (const voice of [...voices]) voice.stop();
    for(const event of events)event.bus.disconnect();
    events.clear();focusValue=0;
  }
  function getFocus(){return ctx&&audible()&&ctx.state==='running'?focusValue*Math.exp(-Math.max(0,ctx.currentTime-focusStamp)/.48):0;}
  function retire(event,fade=.035){
    events.delete(event);event.retiring=true;
    target(event.bus.gain,0,fade/3);
    for(const record of event.voices){
      // Cancel future delayed components too; the current component gets a short release.
      try{record.source.stop(ctx.currentTime+fade);}catch{}
      record.endAt=Math.min(record.endAt,ctx.currentTime+fade);
    }
  }
  function pruneEvents(){
    // Audio-clock cleanup also makes diagnostics deterministic without a timer.
    for(const record of [...voices])if(record.endAt<=ctx.currentTime)record.stop();
  }
  function beginEvent(priority,type){
    pruneEvents();
    // Fresh decorative accents must yield too, not just already playing tails.
    if(priority===0&&[...events].some(event=>event.priority===2)){dropped++;return null;}
    if(priority===0){
      const decorative=[...events].find(event=>event.priority===0);
      if(decorative){
        if(ctx.currentTime-decorative.born<.34){dropped++;return null;}
        retire(decorative);
      }
    }
    if(events.size>=3){
      const victim=[...events].filter(event=>event.priority<priority).sort((a,b)=>a.priority-b.priority||a.born-b.born)[0];
      if(!victim){dropped++;return null;}
      retire(victim);
    }
    if(priority>0)for(const event of events)if(event.priority<priority)target(event.bus.gain,priority===2?.18:.42,.035);
    const dominant=Math.max(priority,...[...events].map(event=>event.priority));
    const bus=ctx.createGain();bus.gain.value=dominant>priority?(dominant===2?.18:.42):1;bus.connect(master);
    const event={priority,type,bus,born:ctx.currentTime,voices:new Set(),retiring:false};events.add(event);
    if(priority===2){focusValue=Math.max(getFocus(),1);focusStamp=ctx.currentTime;}
    return event;
  }
  function update(force=false) {
    if(!ctx || disposed) return;
    if(!force && ctx.currentTime-lastState<.045) return;
    lastState=ctx.currentTime;
    target(master.gain,audible()?.62*fxVolume:0,.035);
    const focus=getFocus(),charging=chargeActive(),ambient=(1-.76*focus)*(charging?.38:1);
    target(bed.gain,audible()?Math.pow(clamp(state.hole),1.45)*.072*ambient:0,.15);
    target(air.frequency,270+clamp(state.hole)*580+clamp(state.dream)*220,.3);
    target(sub.frequency,hz(chord()[0]-12)*clamp(state.transport?.rate??1,.1,2),.6);
    target(shimmer.gain,audible()?clamp(state.pulse)*.023*ambient:0,.15);
    const harmony=chord(), rate=clamp(state.transport?.rate??1,.1,2);
    shimmerTones.forEach((osc,i)=>target(osc.frequency,hz(harmony[1+i*2]+12)*rate,.6));
    const charge=clamp(state.proximity);
    target(chargeBus.gain,charging?(1-.82*focus):0,charging?.07:.025);
    target(crackleLayers[0].gain,.09*(.3+.7*charge),.12);
    target(crackleLayers[1].gain,.11*charge*charge,.12);
    target(chargeFilter.frequency,750+charge*1650,.12);
    target(chargeTone.frequency,hz(harmony[2]+12)*rate*(1+.003*charge),.2);
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
        shimmer=ctx.createGain(); shimmer.gain.value=0; shimmer.connect(master);persistent.push(shimmer);
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
        chargeBus=ctx.createGain();chargeBus.gain.value=0;chargeBus.connect(master);
        chargeFilter=ctx.createBiquadFilter();chargeFilter.type='lowpass';chargeFilter.frequency.value=900;chargeFilter.Q.value=.55;chargeFilter.connect(chargeBus);
        persistent.push(chargeBus,chargeFilter);
        // Handmade irregular micro-bursts: two reusable loops blend as charge rises.
        // Raised-sine micro-envelopes soften every edge instead of sharp electrical clicks.
        for(let layer=0;layer<2;layer++){
          const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*2.37),ctx.sampleRate),data=buffer.getChannelData(0);
          const bursts=layer?74:23;
          for(let j=0;j<bursts;j++){
            const at=Math.floor(Math.random()*(data.length-ctx.sampleRate*.025));
            const length=Math.max(4,Math.floor(ctx.sampleRate*(.003+Math.random()*.014)));
            for(let k=0;k<length&&at+k<data.length;k++)data[at+k]+=(Math.random()*2-1)*Math.sin(Math.PI*k/length)**2*.65;
          }
          const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;
          gain.gain.value=0;source.connect(gain);gain.connect(chargeFilter);source.start();
          crackleLayers.push(gain);persistent.push(source,gain);
        }
        chargeTone=ctx.createOscillator();chargeTone.type='sine';chargeTone.frequency.value=hz(69);
        const tension=ctx.createGain();tension.gain.value=.009;chargeTone.connect(tension);tension.connect(chargeBus);chargeTone.start();persistent.push(chargeTone,tension);
      }
      if(ctx.state==='suspended') await ctx.resume();
      update(true); return ctx.state==='running';
    } catch { return false; }
  }
  function voice({frequency=440,endFrequency=frequency,duration=.3,volume=.04,delay=0,noiseVoice=false,filter=1800,type='sine',attack=.012,pan}) {
    const event=buildingEvent;
    if(!event||voices.size>=(event.priority===2?18:12))return;
    const source=noiseVoice?ctx.createBufferSource():ctx.createOscillator();
    if(noiseVoice) source.buffer=noise;
    else {source.type=type;source.frequency.setValueAtTime(frequency,ctx.currentTime+delay);source.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),ctx.currentTime+delay+duration);}
    const gain=ctx.createGain(), tone=ctx.createBiquadFilter();
    tone.type=noiseVoice?'bandpass':'lowpass'; tone.frequency.value=filter; tone.Q.value=noiseVoice?.7:.5;
    const at=ctx.currentTime+delay;
    gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(volume,at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    // Only the distant hole bed follows the source. Body pickups and shields
    // stay anchored to the player instead of sliding toward the hazard.
    let position;
    source.connect(tone);tone.connect(gain);
    if(pan!==undefined&&ctx.createStereoPanner){position=ctx.createStereoPanner();position.pan.value=clamp(pan,-1,1);gain.connect(position);position.connect(event.bus);}else gain.connect(event.bus);
    let ended=false;
    const record={source,endAt:at+duration+.025,stop(){if(ended)return;ended=true;try{source.stop();}catch{}source.disconnect();tone.disconnect();gain.disconnect();position?.disconnect();voices.delete(record);event.voices.delete(record);if(!event.voices.size){events.delete(event);event.bus.disconnect();}}};
    source.onended=record.stop;voices.add(record);event.voices.add(record);if(noiseVoice)source.start(at,Math.random()*1.5);else source.start(at);source.stop(at+duration+.025);
  }
  function play(type,options={}) {
    if(!ctx||ctx.state!=='running'||!audible())return;
    const aliases={collect:'pickup',resonate:'pickup',shell:'pickup',bellwind:'flash',luminance:'pulse',blackhole:'hole',dark:'hole',dream:'hole',wake:'shield'};
    type=aliases[type]||type;
    const now=ctx.currentTime, intervals={pickup:.34,flap:.17,boost:.2,hit:.22,pulse:.7,guardian:.6,shield:.45,clear:.8,flash:.6,hole:1,spore:.6,bubble:.35,crystal:.6,gravebell:.9,seedpod:.45,'ice-warning':1.1,debris:.5,vent:.8};
    const key=type+(options.warning?':warning':'');
    if(now-(last.get(key)??-Infinity)<(intervals[type]??.15)){dropped++;return;}
    if(clamp(options.attenuation??1)<.06){dropped++;return;}
    const priority=options.warning||type==='ice-warning'||type==='hit'||type==='shield'?2:
      ['pickup','flap','crystal','hole','gravebell','seedpod'].includes(type)?0:1;
    buildingEvent=beginEvent(priority,type);if(!buildingEvent)return;
    last.set(key,now);update(true);
    try {
    const strength=(.5+.5*clamp(options.strength??1))*clamp(options.attenuation??1), notes=chord(), index=(serial++)%4+1;
    const rate=clamp(state.transport?.rate??1,.1,2);
    const tone=(midi,duration,volume,delay=0)=>voice({frequency:hz(midi)*rate,duration,volume:volume*strength,delay,filter:2400,pan:options.pan});
    const texture=(duration,volume,filter,attack=.012,delay=0)=>voice({noiseVoice:true,duration,volume:volume*strength,filter,attack,delay,pan:options.pan});
    const glide=(from,to,duration,volume,delay=0)=>voice({frequency:hz(from)*rate,endFrequency:hz(to)*rate,duration,volume:volume*strength,delay,filter:1900,pan:options.pan});
    if(type==='pickup') {
      // A soft shell fracture carries crowded pickups; tonal accents have their own slower gate.
      voice({noiseVoice:true,duration:.07,volume:.075*strength,filter:1100,attack:.003});
      if(now-(last.get('pickupTone')??-Infinity)>=1/3){
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
    else if(type==='spore'){
      glide(notes[0]+12,notes[0],.08,.035);texture(.09,.07,500,.004);
      glide(notes[1],notes[3]+12,.52,.031,.025);
      for(let i=0;i<3;i++)texture(.16,.042,1250+i*380,.025,.13+i*.09);
    } else if(type==='bubble'){
      glide(notes[2]+12,notes[2],.11,.036);glide(notes[1],notes[1]+12,.3,.023,.065);texture(.12,.04,850,.012);
    } else if(type==='crystal'){
      tone(notes[1]+24,1.35,.023);tone(notes[3]+24,.95,.012,.03);texture(.08,.027,3100,.004);
    } else if(type==='gravebell'){
      tone(notes[0]+12,1.45,.036);tone(notes[2],1.05,.017,.018);tone(notes[2]+19,.5,.006);texture(.075,.035,480,.004);
    } else if(type==='seedpod'){
      texture(.045,.085,1250,.003);texture(.085,.045,650,.006,.03);tone(notes[1],.63,.029,.025);tone(notes[3],.49,.014,.07);
    } else if(type==='ice-warning'){
      texture(.4,.072,2400,.065);glide(notes[3]+24,notes[3]+23.65,.48,.011);texture(.055,.032,3300,.005,.19);
    } else if(type==='debris'){
      if(options.warning){texture(.2,.035,1250,.04);texture(.075,.025,650,.015,.09);return;}
      for(let i=0;i<4;i++)texture(.09+i*.035,.062-i*.009,950-i*150,.008,i*.07);
      glide(notes[0]+12,notes[0],.35,.018);
    } else if(type==='vent'){
      if(options.warning){texture(.36,.052,2100,.08);return;}
      texture(.8,.105,1650,.15);texture(.46,.043,550,.09,.07);
    }
    } finally {
      if(buildingEvent&&!buildingEvent.voices.size){events.delete(buildingEvent);buildingEvent.bus.disconnect();}
      buildingEvent=null;
    }
  }
  function visibility(){if(hidden())stopVoices();update(true);}
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  return {
    unlock,
    setMuted(value){muted=Boolean(value);if(muted)stopVoices();update(true);},
    // Player FX level as a gain multiplier (see sound-level.mjs); 1 is the original mix.
    setVolume(value){fxVolume=Math.max(0,Math.min(2,Number(value)||0));update(true);},
    get volume(){return fxVolume},
    setState(next={}){const wasAudible=audible(),wasCharging=chargeActive();state={...state,...next};if(wasAudible&&!audible())stopVoices();update(wasAudible!==audible()||wasCharging!==chargeActive());},
    play,
    getFocus,
    getMixState(){if(ctx&&!disposed)pruneEvents();const priorities=[0,0,0];for(const event of events)priorities[event.priority]++;return {events:events.size,voices:voices.size,focus:getFocus(),dropped,priorities};},
    destroy(){if(disposed)return;disposed=true;if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);stopVoices();for(const node of persistent){try{node.stop?.();node.disconnect();}catch{}}if(ctx){try{const closing=ctx.close();closing?.catch?.(()=>{});}catch{}}},
  };
}
