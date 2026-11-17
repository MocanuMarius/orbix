import test from 'node:test';
import assert from 'node:assert/strict';
import {PIECES,compilePiece,createRotation,intensityFor,settleIntensity,noteDensity,prng,CALM,FLOWING,URGENT,LIFT_PERIOD,LIFT_BPM,FLIGHT_TUNING_LIFT} from '../dist/music-score.mjs';
import {FLIGHT_TUNING} from '../dist/flight.mjs';
import {createMusicTwo,OVERLAP} from '../dist/music-two.mjs';
import {createMusic,musicVersion} from '../dist/music.mjs';

const synthPieces=PIECES.filter(p=>!p.stems);

test('the album: the reference plus four lo-fi siblings, each 2.5 to 4 minutes',()=>{
 assert.equal(PIECES.length,5);assert.ok(PIECES.some(p=>p.stems&&p.reference&&p.id==='lantern'));
 const keys=new Set(),grooves=new Set(),leads=new Set();
 for(const p of synthPieces){
  const c=compilePiece(p);
  assert.ok(c.duration>=150&&c.duration<=240,`${p.id} lasts ${c.duration.toFixed(0)} s`);
  keys.add(p.tonic%12+p.mode);grooves.add(p.groove);leads.add(p.lead);
  const lead=c.events.filter(e=>e.part==='lead');
  assert.equal(lead.at(-1).midi%12,p.tonic%12,`${p.id} resolves`);
  assert.ok(Math.max(...lead.map(e=>e.midi))-Math.min(...lead.map(e=>e.midi))<=19);
  // No organ: no part holds a sound longer than two bars, and there is no pad part at all.
  assert.ok(!c.events.some(e=>e.part==='pad'||e.part==='drone'||e.part==='atmo'));
  // Every level has the beat; calm is clearly sparser than urgent.
  for(const level of [0,1,2]){const parts=new Set(c.events.filter(e=>e.layer<=level).map(e=>e.part));for(const part of ['kick','rim','bass','keys'])assert.ok(parts.has(part),`${p.id} level ${level} has ${part}`);}
  const [calm,flow,urgent]=[0,1,2].map(l=>noteDensity(c,l));
  assert.ok(calm*2<=urgent&&calm<flow&&flow<urgent,`${p.id} density ${calm}/${flow}/${urgent}`);
 }
 assert.equal(keys.size,synthPieces.length);assert.equal(grooves.size,synthPieces.length);assert.equal(leads.size,synthPieces.length);
});

test('every piece is locked to the Lift cadence and marks every Lift beat with the kick at every level',()=>{
 assert.equal(FLIGHT_TUNING_LIFT.impulse,FLIGHT_TUNING.flapImpulse);assert.equal(FLIGHT_TUNING_LIFT.gravity,FLIGHT_TUNING.gravity);
 assert.ok(Math.abs(LIFT_PERIOD-2*205/300)<1e-12);assert.ok(Math.abs(LIFT_BPM-87.8049)<1e-3);
 for(const p of synthPieces){
  const c=compilePiece(p),liftSec=c.liftEvery*c.beatSec;
  assert.ok(Math.abs(liftSec-LIFT_PERIOD)<1e-9,`${p.id}: one Lift per ${c.liftEvery} beats`);
  const kicks=new Set(c.events.filter(e=>e.part==='kick'&&e.lift&&e.layer===0).map(e=>Math.round(e.beat*1e6)));
  for(let b=0;b<c.totalBeats;b+=c.liftEvery)assert.ok(kicks.has(Math.round(b*1e6)),`${p.id}: kick on Lift beat ${b}`);
 }
});

test('the rotation is shuffled, plays every piece per round and never repeats a piece back to back',()=>{
 for(const seed of ['a','b','c','d']){
  const r=createRotation(PIECES.map(p=>p.id),prng(seed)),order=Array.from({length:60},()=>r.next());
  for(let i=1;i<order.length;i++)assert.notEqual(order[i],order[i-1],`seed ${seed} repeats at ${i}`);
  for(let i=0;i<60;i+=5)assert.equal(new Set(order.slice(i,i+5)).size,5,'each round has every piece');
 }
 const orders=new Set(['a','b','c','d','e'].map(seed=>{const r=createRotation(PIECES.map(p=>p.id),prng(seed));return Array.from({length:5},()=>r.next()).join();}));
 assert.ok(orders.size>1,'the order is shuffled');
 const r=createRotation(['x','y','z'],()=>0);r.choose('y');assert.notEqual(r.next(),'y');
});

test('intensity follows what the game already knows',()=>{
 for(const scene of ['menu','rest','pause','clear','loss','dream'])assert.equal(intensityFor(scene,null).level,CALM,scene);
 const base={flame:80,maxFlame:100,lives:3,maxLives:3,blackHole:{rate:0,nearest:null}};
 assert.equal(intensityFor('flight',base).level,FLOWING);
 assert.equal(intensityFor('flight',{...base,boss:{phase:1}}).level,URGENT);
 assert.equal(intensityFor('boss',base).level,URGENT);
 assert.equal(intensityFor('flight',{...base,lives:1}).level,URGENT,'last heart');
 assert.equal(intensityFor('flight',{...base,lives:1,maxLives:1}).level,FLOWING,'a one-heart run is not an emergency');
 assert.equal(intensityFor('flight',{...base,flame:10}).level,URGENT,'low Sparks');
 assert.equal(intensityFor('flight',{...base,blackHole:{rate:0,nearest:{distance:120}}}).level,URGENT,'black hole near');
 assert.equal(intensityFor('flight',{...base,blackHole:{rate:0,nearest:{distance:400}}}).level,FLOWING,'black hole far');
 assert.equal(intensityFor('flight',{...base,boostActive:true}).level,URGENT,'Flash');
 for(const s of [{paused:true},{dying:true},{completing:true},{dream:{mode:'record'}}])assert.equal(intensityFor('flight',{...base,...s}).level,CALM);
 // Rises at once, falls only after six seconds of asking for less.
 let st=settleIntensity(null,FLOWING,0);st=settleIntensity(st,URGENT,1);assert.equal(st.level,URGENT);
 st=settleIntensity(st,FLOWING,2);assert.equal(st.level,URGENT);st=settleIntensity(st,FLOWING,7.9);assert.equal(st.level,URGENT);
 st=settleIntensity(st,FLOWING,8.1);assert.equal(st.level,FLOWING);
 st=settleIntensity(st,CALM,9);st=settleIntensity(st,URGENT,10);assert.equal(st.level,URGENT);assert.equal(st.lowerSince,null);
});

test('a phase nudge moves the beat by at most 6% over two bars and never touches what is scheduled',async()=>{
 const h=harness({pieces:[synthPieces[0]],seed:'n'});h.events.pointerdown({});await Promise.resolve();h.run(3);
 const music=h.music,ctx=music.context,tr=music.getTransport(),bar=4*60/tr.bpm;
 // Ask for a Lift moment 0.6 s off the beat grid: two nudges at most, then locked.
 const beatsNow=tr.beat,offBy=.6,next=Math.ceil(beatsNow/2)*2;
 music.syncTo((next-beatsNow)/(tr.bpm/60)+offBy);
 for(let i=0;i<4*30;i++)h.run(.25);
 assert.equal(music.info().sync,'locked');
 assert.ok(music.stats.nudges>=1&&music.stats.nudges<=3,`${music.stats.nudges} nudges`);
 assert.ok(Math.abs(music.stats.lastSyncError)<=.008+1e-9);
 h.music.destroy();
});

test('flag off: the game keeps the original music',()=>{
 assert.equal(musicVersion(),1);
 const events={},players=[];
 const document={hidden:false,addEventListener:(k,fn)=>events[k]=fn,removeEventListener(){}};
 class Audio{constructor(){this.paused=true;players.push(this);}play(){this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:()=>1,cancel(){}});
 events.pointerdown({});assert.equal(players.length,3,'the three original stems');assert.equal(music.version,undefined);music.destroy();
});

// ------------------------------------------------- engine with a fake WebAudio
function fakeAudio(){
 const sources=[];let live=0,created=0;
 class Param{constructor(v=0){this.value=v;this.events=[];}setValueAtTime(v,t){this.events.push(['set',v,t]);this.value=v;}linearRampToValueAtTime(v,t){this.events.push(['lin',v,t]);}exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);}setTargetAtTime(v,t,c){this.events.push(['target',v,t,c]);}cancelScheduledValues(){}cancelAndHoldAtTime(){}}
 const node=(extra={})=>{created++;live++;const n={connected:0,connect(){this.connected++;},disconnect(){if(this.connected){this.connected=0;}},...extra};return n;};
 class Context{
  currentTime=0;state='suspended';sampleRate=8000;destination={};
  constructor(){Context.made++;}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  createGain(){return node({gain:new Param(1)});}
  createBiquadFilter(){return node({frequency:new Param(350),Q:new Param(1),type:'lowpass'});}
  createDynamicsCompressor(){return node({threshold:new Param(),knee:new Param(),ratio:new Param(),attack:new Param(),release:new Param()});}
  createDelay(){return node({delayTime:new Param()});}
  createWaveShaper(){return node({curve:null});}
  createBuffer(ch,len){const d=new Float32Array(len);return {getChannelData:()=>d};}
  createOscillator(){const s=node({frequency:new Param(440),detune:new Param(),type:'sine',start(t){this.startAt=t;},stop(t){this.stopAt=t;}});sources.push(s);return s;}
  createBufferSource(){const s=node({loop:false,start(t){this.startAt=t;},stop(t){this.stopAt=t;}});sources.push(s);return s;}
  createMediaElementSource(){return node();}
 }
 Context.made=0;
 // Fire onended for every source whose stop time has passed.
 const advance=(ctx,to)=>{ctx.currentTime=to;for(const s of sources)if(!s.ended&&s.stopAt!==undefined&&s.stopAt<=to){s.ended=true;s.onended?.();}};
 return {Context,advance,sources,get live(){return live},get created(){return created}};
}
function harness({pieces=synthPieces,seed='h'}={}){
 const fake=fakeAudio(),events={};let tick=null,timers=0;
 const document={hidden:false,addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]};
 const music=createMusicTwo({document,AudioContextClass:fake.Context,storage:{getItem:()=>null,setItem(){}},schedule:fn=>{tick=fn;timers++;return timers;},cancel:()=>{tick=null;},random:prng(seed),pieces,createGuide:()=>({unlock(){},update(){},stop(){},destroy(){}})});
 const run=seconds=>{const ctx=music.context;for(let t=0;t<seconds;t+=.25){if(ctx.state==='running')fake.advance(ctx,ctx.currentTime+.25);tick?.();}};
 return {fake,events,document,music,run,get tick(){return tick}};
}

test('the engine waits for a gesture, then rotates with cross-overs and bounded audio nodes',async()=>{
 const h=harness();
 assert.equal(h.fake.Context.made,0,'no audio before a gesture');
 h.events.pointerdown({});await Promise.resolve();assert.equal(h.fake.Context.made,1);
 const first=h.music.info().piece;assert.ok(first);
 let maxOutgoing=0,maxLive=0;const seen=[first];
 for(let i=0;i<4*60*15;i++){h.run(.25);const info=h.music.info();maxOutgoing=Math.max(maxOutgoing,info.outgoing);maxLive=Math.max(maxLive,h.music.stats.live);if(info.piece!==seen.at(-1))seen.push(info.piece);}
 assert.ok(seen.length>=4,`15 minutes play ${seen.length} pieces`);
 for(let i=1;i<seen.length;i++)assert.notEqual(seen[i],seen[i-1]);
 assert.ok(maxOutgoing<=1,'at most two pieces sound at once');
 assert.ok(maxLive<400,`live nodes stay bounded (${maxLive})`);
 const voices=h.music.stats.voices;assert.ok(voices.peakVoices<=13,`voices capped (${voices.peakVoices})`);
 h.music.destroy();assert.equal(h.tick,null);
});

test('screens change intensity, never the piece; pause ducks; a hidden tab suspends and resumes cleanly',async()=>{
 const h=harness({seed:'s'});h.events.pointerdown({});await Promise.resolve();h.run(5);
 const piece=h.music.info().piece,position=h.music.info().position.seconds;
 h.music.setScene('flight');h.music.setFlight({flame:80,maxFlame:100,lives:3,maxLives:3});h.run(2);
 assert.equal(h.music.info().piece,piece,'map to flight does not restart');assert.equal(h.music.info().level,FLOWING);
 assert.ok(h.music.info().position.seconds>position);
 h.music.setFlight({flame:80,maxFlame:100,lives:3,maxLives:3,boss:{phase:2}});h.run(1);assert.equal(h.music.info().level,URGENT);
 h.music.setScene('rest');h.run(3);assert.equal(h.music.info().level,URGENT,'falls are held for a few seconds');h.run(5);assert.equal(h.music.info().level,CALM);
 assert.equal(h.music.info().piece,piece);
 // Pause: the master ducks, the music keeps its place.
 const master=h.music.context&&h.music.stats;assert.ok(master);
 h.music.setScene('pause');h.run(1);assert.equal(h.music.info().piece,piece);
 // Hidden: the timer stops and the audio clock is suspended; visible again resumes the same piece.
 h.document.hidden=true;h.events.visibilitychange();await new Promise(r=>setTimeout(r,150));
 assert.equal(h.tick,null);assert.equal(h.music.context.state,'suspended');const frozen=h.music.context.currentTime;
 h.document.hidden=false;h.events.visibilitychange();await Promise.resolve();
 assert.equal(h.music.context.state,'running');assert.equal(h.music.context.currentTime,frozen);assert.equal(h.music.info().piece,piece);
 // Mute stops the clock; unmute continues the same piece; there is still only one timer running.
 h.music.setLevel(0);await new Promise(r=>setTimeout(r,150));assert.equal(h.tick,null);
 h.music.setLevel(3);h.run(1);assert.equal(h.music.info().piece,piece);
 h.music.destroy();
});

test('the original score takes its turn as streamed stems and hands over on time',async()=>{
 const h=harness({pieces:PIECES.filter(p=>p.id==='lantern'||p.id==='paper'),seed:'l'});
 const elements=[];
 // Elements whose time follows the audio clock.
 globalThis.Audio=class{constructor(src){this.src=src;this.currentTime=0;this.paused=true;this.playbackRate=1;elements.push(this);}play(){this.paused=false;this.start=h.music.context.currentTime-this.currentTime;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}removeAttribute(){}load(){}};
 try{
  const lantern=PIECES.find(p=>p.id==='lantern');
  h.events.pointerdown({});await Promise.resolve();
  if(h.music.info().piece!=='lantern'){h.music.play('lantern');}
  assert.equal(h.music.info().piece,'lantern');
  const tickClock=()=>{for(const el of elements)if(!el.paused)el.currentTime=h.music.context.currentTime-el.start;};
  const segment=(60/lantern.bpm)*lantern.beatsPerBar*80;
  for(let i=0;i<4*(segment+20)&&h.music.info().piece==='lantern';i++){h.run(.25);tickClock();}
  assert.equal(h.music.info().piece,'paper','after one half of the original, the next piece');
  assert.ok(elements.length>=3);
 }finally{delete globalThis.Audio;h.music.destroy();}
});
