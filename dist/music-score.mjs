// v1.1-music: a lo-fi album that is a sibling of the current score ("Lantern
// Hours"), as composed data plus the pure helpers around it (phrase parsing,
// compiling a piece into timed note events, the shuffled rotation, the
// intensity picker). No audio here: this runs in Node for tests too.
//
// STYLE SHEET, taken from the reference (scripts/compose-adaptive-music.py):
// - 88 BPM 4/4, swung eighths (off-beats late by 0.09 beat, ratio about 1.44),
//   snare/rim about 23 ms behind, bass 12 ms, melody 18 ms, ±7 ms humanising.
// - Warm electric piano (sine tine with short 2nd/3rd/5th partials), felt
//   piano calls, rounded sine bass with 2nd and 3rd harmonics, soft kick on 1,
//   snare on 2 and 4, eighth "hats" (here: soft pitched ticks, never noise).
// - Rootless jazz voicings (m9, maj9, 13, m7b5, 7sus, 7b9), one chord per two
//   bars, chords struck as lazy broken chords, a comp stab on the "and" of 3.
// - Sparse melody: two- to four-note motifs on chord tones in phrases 1 and 3
//   of each four-bar sentence, rests in between. Sections alternate walking,
//   double-time ticks and half-time breathing. Whole mix low-passed (5.2 kHz).
//
// TEMPO LOCK: the efficient Lift cycle in still air is 2 x 205 / 300 =
// 1.3667 s (Lift resets vy to -205 px/s, gravity 300 px/s², the wisp is back
// at its take-off height after 2·impulse/gravity). Every synthesized piece
// runs at exactly one Lift per two beats, 87.80 BPM, and the kick plays on
// every Lift beat (beats 1 and 3) at every intensity level.

// The same numbers as FLIGHT_TUNING.flapImpulse and .gravity in flight.mjs (a test keeps them equal;
// importing flight.mjs here would pull the whole engine into the music module).
export const FLIGHT_TUNING_LIFT=Object.freeze({impulse:205,gravity:300});
export const MUSIC_TWO_CODE='v1.1-music';
export const LIFT_PERIOD=2*FLIGHT_TUNING_LIFT.impulse/FLIGHT_TUNING_LIFT.gravity;
export const LIFT_BPM=120/LIFT_PERIOD; // two beats per Lift
export const MODES={major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],mixolydian:[0,2,4,5,7,9,10]};
const NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
export const noteName=midi=>NAMES[((midi%12)+12)%12]+(Math.floor(midi/12)-1);

// ---------------------------------------------------------------- the pieces
// rhythm rows: [part, beat, length (beats), tone, layer, velocity]
//   parts: kick, rim, tick, bass (tone R root, 5 fifth, 3 third, A approach, 8 octave)
//   layer 0 calm (kick on the Lift beats + rim + bass + sparse keys),
//         1 flow (+ ticks, fuller bass, comping, melody),
//         2 urgent (+ double-time ticks, busier bass, counter-melody)
export const PIECES=[
 {
  id:'lantern',title:'Lantern Hours',stems:true,reference:true,
  character:'The reference: warm electric piano, felt keys, rounded bass, a soft swung beat.',
  keyName:'D minor',tonic:50,mode:'dorian',bpm:88,beatsPerBar:4,meter:'4/4',groove:'swung walk / double / half',
  totalBars:160,segments:[[0,80],[80,160]],
  stemMix:[[.25,.12,0],[.27,.27,0],[.25,.28,.17]],
  sections:[{name:'Window light',bars:16},{name:'Moss and rain',bars:16},{name:'Paper lanterns',bars:16},{name:'The quiet room',bars:16},{name:'Passing clouds',bars:16}],
 },
 {
  id:'moss',title:'Moss and Water',
  character:'Straight swung walk in F: felt-piano calls over electric piano, I-vi-ii-V.',
  keyName:'F major',tonic:53,mode:'major',beatsPerBar:4,meter:'4/4',groove:'swung walk',swing:.09,
  melodyRoot:65,lead:'felt',counter:'rhodes',
  liftEvery:2,
  rhythm:[['kick',0,0,'',0,.9],['kick',2,0,'',0,.72],['rim',1,0,'',0,.8],['rim',3,0,'',0,.8],['bass',0,1.4,'R',0,.95],['bass',2.5,.6,'5',0,.7],
   ['tick',0,0,'',1,.5],['tick',.5,0,'',1,.8],['tick',1,0,'',1,.5],['tick',1.5,0,'',1,.8],['tick',2,0,'',1,.5],['tick',2.5,0,'',1,.8],['tick',3,0,'',1,.5],['tick',3.5,0,'',1,.8],
   ['kick',1.5,0,'',1,.45],['bass',1.5,.5,'R',1,.6],['bass',3.25,.5,'8',1,.5],
   ['tick',.25,0,'',2,.45],['tick',1.75,0,'',2,.45],['tick',2.25,0,'',2,.45],['tick',3.75,0,'',2,.45],['bass',.75,.4,'8',2,.45],['bass',3.5,.4,'5',2,.5],['rim',3.75,0,'',2,.35]],
  phrases:{
   A1:{notes:'r:0.5 5:1 6:0.5 5:2 | 3:3 r:1 | r:0.5 6:1 5:0.5 3:1 2:1 | 3:2 r:2'},
   A2:{notes:'r:0.5 4:1 5:0.5 4:2 | 2:3 r:1 | r:0.5 3:1 2:0.5 7,:1 5,:1 | 7,:2 r:2'},
   B1:{notes:'r:1 4:0.5 5:0.5 6:2 | 5:2 3:1 r:1 | r:0.5 5:1 3:0.5 2:2 | r:4'},
   B2:{notes:'r:1 4:0.5 5:0.5 6:2 | 5:2 4:1 2:1 | 3:3 r:1 | r:4'},
   H: {notes:'r:2 6:2 | 5:4 | r:2 3:2 | 1:4'},
   E: {notes:'1:4 | r:4 | r:4 | r:4'},
  },
  sections:[
   {name:'Rain starts',feel:'intro',chords:['Fmaj7','Dm9'],melody:[]},
   {name:'Walking',feel:'walk',chords:['Fmaj7','Dm9','Gm9','C9','Fmaj7','Dm9','Gm9','C9'],melody:['A1','A2','A1','A2']},
   {name:'Quick steps',feel:'double',chords:['Bbmaj7','Am7','Gm7','Fmaj7','Bbmaj7','Am7','Gm9','C7sus'],melody:['B1','B2','B1','B2']},
   {name:'Under the eaves',feel:'half',chords:['Dm9','Bbmaj7','Gm9','C9'],melody:['H',null]},
   {name:'Walking home',feel:'walk',chords:['Fmaj7','Dm9','Gm9','C9','Bbmaj7','Am7','Gm9','C9'],melody:['A1','A2','B1','A2']},
   {name:'Last drops',feel:'outro',chords:['Fmaj7','Fmaj7'],melody:['E']},
  ],
 },
 {
  id:'pines',title:'Old Pines',
  character:'Lazy shuffle in G: a walking bass from the first bar, a mellow plucked guitar melody.',
  keyName:'G major',tonic:55,mode:'major',beatsPerBar:4,meter:'4/4',groove:'lazy shuffle',swing:.14,
  melodyRoot:67,lead:'pluck',counter:'felt',
  liftEvery:2,
  rhythm:[['kick',0,0,'',0,.9],['kick',2,0,'',0,.75],['rim',1,0,'',0,.75],['rim',3,0,'',0,.75],['bass',0,.9,'R',0,.9],['bass',2,.9,'5',0,.75],
   ['bass',1,.9,'3',1,.65],['bass',3,.9,'A',1,.65],['tick',.5,0,'',1,.75],['tick',1.5,0,'',1,.75],['tick',2.5,0,'',1,.75],['tick',3.5,0,'',1,.75],['tick',1,0,'',1,.4],['tick',3,0,'',1,.4],['kick',2.5,0,'',1,.4],
   ['bass',1.5,.4,'8',2,.45],['bass',3.5,.4,'5',2,.45],['tick',0,0,'',2,.4],['tick',2,0,'',2,.4],['tick',.25,0,'',2,.35],['tick',2.25,0,'',2,.35],['rim',1.5,0,'',2,.3]],
  phrases:{
   A1:{notes:'r:0.5 3:0.5 5:1 3:2 | 2:1 3:1 r:2 | r:0.5 5:1 3:0.5 2:2 | 3:2 r:2'},
   A2:{notes:'r:0.5 1\':0.5 7:1 6:2 | 5:2 r:2 | r:0.5 3:1 5:0.5 7,:1 2:1 | 1:2 r:2'},
   B1:{notes:'r:1 6:0.5 7:0.5 1\':2 | 7:2 6:1 r:1 | r:0.5 6:1 5:0.5 2:2 | r:4'},
   B2:{notes:'r:1 5:0.5 6:0.5 7:2 | 6:2 5:1 3:1 | 3:3 r:1 | r:4'},
   H: {notes:'r:2 5:2 | 3:4 | r:2 2:2 | 3:4'},
   E: {notes:'1:4 | r:4 | r:4 | r:4'},
   // The singing lead: an 8-bar phrase over Cmaj7 Bm7 Am7 Gmaj7 (S1), and its answer over Cmaj7 Bm7 Am9 D9 (S2: same first half, new second half).
   S1:{notes:'5:1 6:1 5:2 | 3:1 5:1 3:2 | 3:2 2:1 3:1 | 5:3 r:1 | 6:1 5:1 6:1 1\':1 | 5:2 3:1 2:1 | 3:1 5:1 7:2 | 1\':3 r:1'},
   S2:{notes:'5:1 6:1 5:2 | 3:1 5:1 3:2 | 3:2 2:1 3:1 | 5:3 r:1 | 6:1 1\':1 6:1 5:1 | 3:2 2:2 | 5:1 4:1 3:1 2:1 | 3:3 r:1'},
  },
  singLead:'vibes',
  sections:[
   {name:'Needle floor',feel:'intro',chords:['Cmaj7','Bm7'],melody:[]},
   {name:'The path',feel:'walk',chords:['Cmaj7','Bm7','Am7','Gmaj7','Cmaj7','Bm7','Am9','D9'],melody:['A1','A2','A1','A2'],sing:['S1','S2']},
   {name:'Clearing',feel:'double',chords:['Em9','A9','Dmaj7','Gmaj7','Em9','A9','Am7','D7sus'],melody:['B1','B2','B1','B2']},
   {name:'Resin and shade',feel:'half',chords:['Cmaj7','Bm7','Am9','D9'],melody:['H',null]},
   {name:'Ridge walk',feel:'walk',chords:['Cmaj7','Bm7','Am7','Gmaj7','Em9','A9','Am9','D9'],melody:['A1','A2','B1','A2'],sing:['S1','S2']},
   {name:'Homeward',feel:'outro',chords:['Gmaj7','Gmaj7'],melody:['E']},
  ],
 },
 {
  id:'ferry',title:'Night Ferry',
  character:'Half-time in C minor: soft vibraphone over slow electric-piano chords, the snare on 3.',
  keyName:'C minor',tonic:48,mode:'aeolian',beatsPerBar:4,meter:'4/4',groove:'half-time',swing:.08,
  melodyRoot:72,lead:'vibes',counter:'felt',
  liftEvery:2,
  rhythm:[['kick',0,0,'',0,.95],['kick',2,0,'',0,.62],['rim',2,0,'snare',0,.95],['bass',0,1.8,'R',0,.95],['bass',2.5,.9,'5',0,.65],
   ['tick',0,0,'',1,.5],['tick',1,0,'',1,.6],['tick',2,0,'',1,.5],['tick',3,0,'',1,.6],['tick',3.5,0,'',1,.45],['rim',3.5,0,'',1,.35],['kick',2.75,0,'',1,.4],['bass',1.75,.5,'R',1,.55],['bass',3.25,.5,'8',1,.45],
   ['tick',.5,0,'',2,.5],['tick',1.5,0,'',2,.5],['tick',2.5,0,'',2,.5],['bass',.75,.4,'R',2,.45],['bass',3.5,.4,'5',2,.45],['rim',1.75,0,'',2,.3]],
  phrases:{
   A1:{notes:'r:1 5:1 3:2 | 2:2 r:2 | r:1 3:1 5:1 1\':1 | 7:2 r:2'},
   A2:{notes:'r:1 5:1 7:2 | 5:2 r:2 | r:1 4:1 2:1 1:1 | 2:2 r:2'},
   B1:{notes:'r:1 1\':1 6:2 | 4:2 r:2 | r:1 2:1 4:1 6:1 | 5:2 r:2'},
   B2:{notes:'r:1 7:1 5:2 | 3:2 r:2 | r:1 3:1 5:1 7:1 | 1\':2 r:2'},
   H: {notes:'r:2 5:2 | 3:4 | r:2 1\':2 | 7:4'},
   E: {notes:'1:4 | r:4 | r:4 | r:4'},
  },
  sections:[
   {name:'Casting off',feel:'intro',chords:['Cm9','Abmaj7'],melody:[]},
   {name:'Open water',feel:'walk',chords:['Cm9','Abmaj7','Ebmaj7','Bb7sus','Cm9','Abmaj7','Fm9','G7b9'],melody:['A1','A2','A1','A2']},
   {name:'Lights ashore',feel:'double',chords:['Fm9','Bb9','Ebmaj7','Cm7','Fm9','Bb9','Abmaj7','G7sus'],melody:['B1','B2','B1','B2']},
   {name:'Fog',feel:'half',chords:['Cm9','Abmaj7','Fm9','G7b9'],melody:['H',null]},
   {name:'Far shore',feel:'walk',chords:['Cm9','Abmaj7','Ebmaj7','Bb7sus','Fm9','Bb9','Fm9','G7b9'],melody:['A1','A2','B1','A2']},
   {name:'Moored',feel:'outro',chords:['Cm9','Cm9'],melody:['E']},
  ],
 },
 {
  id:'paper',title:'Paper Lanterns',
  character:'A 6/8 lo-fi waltz in B-flat: kalimba melody, rolled electric-piano chords.',
  keyName:'B-flat major',tonic:46,mode:'major',beatsPerBar:12,meter:'6/8',groove:'6/8 waltz',swing:0,beatUnit:3,
  melodyRoot:70,lead:'kalimba',counter:'felt',
  // Written as 12/8 bars (two 6/8 bars): the eighth is the beat, a Lift every 6 eighths.
  liftEvery:6,
  rhythm:[['kick',0,0,'',0,.9],['kick',6,0,'',0,.8],['rim',3,0,'',0,.7],['rim',9,0,'',0,.7],['bass',0,4.5,'R',0,.95],['bass',6,4.5,'5',0,.75],
   ['tick',2,0,'',1,.6],['tick',4,0,'',1,.6],['tick',8,0,'',1,.6],['tick',10,0,'',1,.6],['bass',4,1,'R',1,.5],['bass',10,1,'8',1,.45],['kick',10,0,'',1,.35],
   ['tick',1,0,'',2,.4],['tick',5,0,'',2,.4],['tick',7,0,'',2,.4],['tick',11,0,'',2,.4],['bass',2,1,'3',2,.45],['bass',8,1,'R',2,.45],['rim',11,0,'',2,.3]],
  phrases:{
   A1:{notes:'r:3 3:2 5:1 6:6 | 5:6 3:3 r:3 | r:3 5:2 3:1 1:6 | 3:6 r:6'},
   A2:{notes:'r:3 2:2 4:1 6:6 | 4:6 2:3 r:3 | r:3 6:2 5:1 3:6 | 2:6 r:6'},
   B1:{notes:'r:3 5:2 6:1 7:6 | 6:6 5:3 r:3 | r:3 3:2 4:1 5:6 | 3:6 r:6'},
   B2:{notes:'r:3 4:2 5:1 6:6 | 5:6 4:3 r:3 | r:3 2:2 3:1 1:6 | r:12'},
   H: {notes:'r:6 5:6 | 3:12 | r:6 5:6 | 3:12'},
   E: {notes:'1:12 | r:12 | r:12 | r:12'},
  },
  sections:[
   {name:'Lighting the wicks',feel:'intro',chords:['Bbmaj7','Gm9'],melody:[]},
   {name:'Rising',feel:'walk',chords:['Bbmaj7','Gm9','Cm9','F9','Bbmaj7','Gm9','Ebmaj7','F7sus'],melody:['A1','A2','A1','A2']},
   {name:'Drifting',feel:'double',chords:['Ebmaj7','Dm7','Cm9','Bbmaj7','Ebmaj7','Dm7','Cm9','F9'],melody:['B1','B2','B1','B2']},
   {name:'High air',feel:'half',chords:['Gm9','Ebmaj7','Cm9','F9'],melody:['H',null]},
   {name:'Rising again',feel:'walk',chords:['Bbmaj7','Gm9','Cm9','F9','Ebmaj7','Dm7','Cm9','F9'],melody:['A1','A2','B1','A2']},
   {name:'Last light',feel:'outro',chords:['Bbmaj7','Bbmaj7'],melody:['E']},
  ],
 },
];
for(const p of PIECES)if(!p.stems)p.bpm=LIFT_BPM*(p.beatUnit===3?3:1);
export const PIECE_IDS=PIECES.map(p=>p.id);
export const pieceById=id=>PIECES.find(p=>p.id===id);
// The default rotation: the reference plus two siblings. Old Pines and Paper Lanterns keep their
// scores (the lab plays all four) but are not scheduled in the game for now.
export const ROTATION_IDS=['lantern','moss','ferry'];
export const ROTATION=ROTATION_IDS.map(pieceById);

// --------------------------------------------------------------- utilities
export function prng(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;s||=1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const scaleOf=piece=>MODES[piece.mode]||MODES.major;
export function stepSemis(piece,step){const scale=scaleOf(piece),o=Math.floor(step/7),i=((step%7)+7)%7;return scale[i]+12*o;}
export const scalePcs=piece=>scaleOf(piece).map(s=>(piece.tonic+s)%12);

/** Parse a phrase into [{beat,dur,midi|null}], checking every bar's length. */
export function parsePhrase(piece,text,{root=piece.melodyRoot}={}){
 const out=[],bars=String(text).split('|');let beat=0;
 bars.forEach((bar,b)=>{
  let barBeats=0;
  for(const token of bar.trim().split(/\s+/).filter(Boolean)){
   const m=/^(r|([b#]?)([1-7])(['\,]*))(?::([\d.]+))?$/.exec(token);
   if(!m)throw Error(`Bad token "${token}" in ${piece.id}`);
   const dur=m[5]?Number(m[5]):1;let midi=null;
   if(m[1]!=='r'){const step=Number(m[3])-1,octave=[...m[4]].reduce((n,c)=>n+(c==="'"?1:-1),0);midi=root+stepSemis(piece,step)+12*octave+(m[2]==='#'?1:m[2]==='b'?-1:0);}
   out.push({beat,dur,midi});beat+=dur;barBeats+=dur;
  }
  if(Math.abs(barBeats-piece.beatsPerBar)>1e-9)throw Error(`${piece.id}: bar ${b+1} of "${text}" has ${barBeats} beats, expected ${piece.beatsPerBar}`);
 });
 return {notes:out,bars:bars.length};
}

// Jazz chord symbols: root, then quality.
const QUALITIES={maj7:[0,4,7,11],maj9:[0,4,7,11,14],m7:[0,3,7,10],m9:[0,3,7,10,14],m11:[0,3,7,10,14,17],'7':[0,4,7,10],'9':[0,4,7,10,14],'13':[0,4,7,10,14,21],m7b5:[0,3,6,10],'7sus':[0,5,7,10],'7b9':[0,4,7,10,13],add9:[0,4,7,14],'6':[0,4,7,9],'69':[0,4,7,9,14]};
export function parseChord(name){
 const m=/^([A-G])(b|#)?(.*)$/.exec(name);if(!m||!QUALITIES[m[3]])throw Error(`Bad chord ${name}`);
 const pc=('C D EF G A B'.indexOf(m[1])+(m[2]==='b'?-1:m[2]==='#'?1:0)+12)%12;
 return {pc,intervals:QUALITIES[m[3]]};
}
const placeIn=(pc,low)=>low+((pc-low)%12+12)%12;
/** Rootless four-note voicing in 53-70 (the bass has the root), as the reference voices them. */
export function voicing(name,previous){
 const {pc,intervals}=parseChord(name);
 let tones=intervals.filter(i=>i!==0);if(tones.length>4)tones=tones.filter(i=>i!==7);tones=tones.slice(0,4);
 // Seventh chords get their ninth, as the reference voices them (Fmaj7 sounds as A C E G).
 if(tones.length<4&&!tones.includes(14)&&!tones.includes(13))tones.push(14);
 while(tones.length<4)tones.push(12);
 const base=tones.map(i=>placeIn((pc+i)%12,53)).sort((a,b)=>a-b);
 const options=[base];for(let i=1;i<4;i++){const p=options[i-1];options.push([...p.slice(1),p[0]+12]);}
 const fit=options.filter(v=>v[3]<=72);
 if(!previous)return fit[0];
 const cost=v=>v.reduce((s,n,i)=>s+Math.abs(n-previous[i]),0);
 return fit.reduce((best,v)=>cost(v)<cost(best)?v:best,fit[0]);
}
/** reactive-fx chord format: [bass 33-44, four tones 53-70]. */
export const fxChord=(name,voiced)=>[placeIn(parseChord(name).pc,33),...voiced];

// ----------------------------------------------------------------- compile
export const SING_VELOCITY=.5;
const cache=new Map();
export function compilePiece(piece){
 if(cache.has(piece.id))return cache.get(piece.id);
 if(piece.stems){
  const compiled={piece,beatSec:60/piece.bpm,barBeats:piece.beatsPerBar,totalBars:piece.totalBars,totalBeats:piece.totalBars*piece.beatsPerBar,events:[],bars:[],liftEvery:2,sections:piece.sections.map((s,i,all)=>({name:s.name,bars:s.bars,startBar:all.slice(0,i).reduce((n,x)=>n+x.bars,0)}))};
  compiled.duration=compiled.totalBeats*compiled.beatSec;cache.set(piece.id,compiled);return compiled;
 }
 const random=prng(piece.id),B=piece.beatsPerBar,U=piece.beatUnit===3?3:1,beatSec=60/piece.bpm,events=[],bars=[],sections=[];
 const swingBeats=piece.swing*U;
 // Behind-the-beat feel, in seconds, converted to beats.
 const late=s=>s/beatSec,jitter=s=>(random()*2-1)*s/beatSec;
 const swung=at=>{const frac=at/U%1;return Math.abs(frac-.5)<1e-9?at+swingBeats:at;};
 const push=(beat,dur,part,inst,midi,vel,layer,extra)=>events.push({beat:Math.max(0,beat),dur,part,inst,midi,vel:Math.min(1,vel),layer,...extra});
 let bar=0,prev=null,prevCounter=null;
 piece.sections.forEach((section,si)=>{
  const startBar=bar,feel=section.feel,sectionBars=section.chords.length*2;
  // Melody: one phrase per four bars; null leaves a rest.
  (section.melody||[]).forEach((key,k)=>{
   if(!key)return;const parsed=parsePhrase(piece,piece.phrases[key].notes);
   for(const n of parsed.notes)if(n.midi!==null)push((startBar+k*4)*B+swung(n.beat)+late(.018)+jitter(.007),n.dur,'lead',piece.lead,n.midi,.8*(.9+random()*.2)*(feel==='half'?.85:1),feel==='outro'?0:1);
  });
  // Singing lead (Old Pines, owner request 2026-11-18 "more melody"): a second, softer voice with phrases of any whole number of bars, one after
  // the other from the section start. Half the level of the plucked lead (velocity .5 on a gain-matched voice, about -6 dB), flat velocity, and no
  // random draws, so every other event of the piece keeps its exact humanising.
  {let at=startBar;for(const key of section.sing||[]){const parsed=parsePhrase(piece,piece.phrases[key].notes);
   for(const n of parsed.notes)if(n.midi!==null)push(at*B+swung(n.beat)+late(.018),n.dur,'sing',piece.singLead||'vibes',n.midi,SING_VELOCITY,1);at+=parsed.bars;}}
  section.chords.forEach((name,c)=>{
   const voiced=voicing(name,prev);prev=voiced;const {pc,intervals}=parseChord(name);
   const nextName=section.chords[c+1]||piece.sections[si+1]?.chords[0]||name;
   for(let half=0;half<2;half++){
    const b=startBar+c*2+half,beat=b*B,final=feel==='outro'&&b>=startBar+sectionBars-2,thin=feel==='intro'&&half===0&&c===0;
    bars.push({bar:b,beat,section:si,chord:name,voicing:voiced,fx:fxChord(name,voiced)});
    const root=placeIn(pc,36),fifth=root+7>48?root-5:root+7,third=root+intervals[1],next=placeIn(parseChord(nextName).pc,36);
    const tones={R:root,'5':fifth,'3':third,A:next+(next>root?-1:1),'8':root+12};
    // Drums and bass.
    for(const [part,at,len,tone,layer,vel] of piece.rhythm){
     if(final&&!(part==='kick'&&at%piece.liftEvery===0||part==='bass'&&at===0))continue;
     let L=layer;
     if(part==='tick'&&layer===1&&feel==='half'&&at%U!==0)continue; // half-time breathes: ticks only on the beat
     if(part==='tick'&&layer===2&&feel==='double')L=1;                 // double-time: the sixteenths join at flow
     const t=beat+swung(at),kickLift=part==='kick'&&at%piece.liftEvery===0;
     if(part==='kick')push(t+(kickLift?0:jitter(.003)),.3,'kick','kick',40,vel*(kickLift?1:.9+random()*.15),kickLift?0:L,kickLift?{lift:true}:undefined);
     else if(part==='rim')push(t+late(.023)+jitter(.007),.2,'rim',tone==='snare'?'snare':'rim',tone==='snare'?57:74,vel*(.9+random()*.15),L);
     else if(part==='tick')push(t+jitter(.006),.1,'tick','tick',100,vel*(.75+random()*.4),L);
     else if(part==='bass')push(t+late(.012)+jitter(.006),final?B:len*U,'bass','bass',tones[tone],vel*(.92+random()*.12),L);
    }
    // Keys: a lazy broken chord when the chord changes (calm), a comp stab on the "and" of 3 (flow).
    if(half===0&&!thin||final&&half===0){
     const order=si%2?voiced.slice().reverse():voiced;
     order.forEach((m,j)=>push(beat+late(.012+j*.021),final?B*2:1.6*U,'keys','rhodes',m,.72*(.9+random()*.15),0));
    }
    if(!final&&(half===1||feel==='double')&&feel!=='half'&&!thin){
     const at=beat+swung(2.5*U)+late(.01);[0,2,3].forEach((j,k)=>push(at+late(k*.018),.6*U,'keys','rhodes',voiced[j],.42*(.9+random()*.15),1));
    }
    // Counter-melody (urgent): felt guide tones, a half note per Lift.
    if(!final&&feel!=='intro'){
     const guides=[voiced[0],voiced[2]].map(m=>m+12>79?m:m+12);
     for(let k=0;k<B;k+=piece.liftEvery){
      if((k/piece.liftEvery)%2===1&&random()<.5)continue;
      const pick=prevCounter==null?guides[0]:guides.reduce((a,g)=>Math.abs(g-prevCounter)<Math.abs(a-prevCounter)?g:a);
      prevCounter=pick;push(beat+k+swungOff(k,U,swingBeats)+late(.02),piece.liftEvery*.9,'counter',piece.counter,pick-12,.5*(.9+random()*.2),2);
     }
    }
   }
  });
  bar+=sectionBars;
  sections.push({name:section.name,startBar,bars:sectionBars,feel});
 });
 events.sort((a,b)=>a.beat-b.beat);
 const compiled={piece,beatSec,barBeats:B,totalBars:bar,totalBeats:bar*B,events,bars,sections,liftEvery:piece.liftEvery};
 compiled.duration=compiled.totalBeats*beatSec;cache.set(piece.id,compiled);return compiled;
}
// The counter-melody enters a swung eighth after the Lift beat, so it never sits on the kick.
function swungOff(k,U,swingBeats){return .5*U+swingBeats;}

/** Notes per bar that a given intensity level plays. */
export function noteDensity(compiled,level,{fromBar=0,toBar=compiled.totalBars}={}){
 const B=compiled.barBeats,count=compiled.events.filter(e=>e.layer<=level&&e.beat>=fromBar*B&&e.beat<toBar*B).length;
 return count/Math.max(1,toBar-fromBar);
}
/** Pitch class shared by the outgoing scale and the incoming key (kept for the transport and tests). */
export function pivotPc(outgoing,incoming){
 const own=new Set(scalePcs(outgoing)),t=incoming.tonic%12;
 for(const semi of [0,7,(MODES[incoming.mode]||MODES.major)[2]]){const pc=(t+semi)%12;if(own.has(pc))return pc;}
 return outgoing.tonic%12;
}

// -------------------------------------------------------------- rotation
export function createRotation(ids=PIECE_IDS,random=Math.random){
 let bag=[],last=null;const history=[];
 const refill=()=>{
  bag=[...ids];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  if(bag.length>1&&bag[0]===last){const j=1+Math.floor(random()*(bag.length-1));[bag[0],bag[j]]=[bag[j],bag[0]];}
 };
 return {
  next(){if(!bag.length)refill();last=bag.shift();history.push(last);return last;},
  choose(id){bag=bag.filter(x=>x!==id);last=id;history.push(id);return id;},
  peek(){if(!bag.length)refill();return bag[0];},
  get last(){return last},history,
 };
}

// ------------------------------------------------------------ intensity
export const CALM=0,FLOWING=1,URGENT=2;
const unit=n=>Math.max(0,Math.min(1,Number(n)||0));
export function intensityFor(scene,s){
 if(scene==='pause'||scene==='menu'||scene==='rest'||scene==='clear'||scene==='loss'||scene==='dream')return {level:CALM,reason:scene};
 if(scene!=='flight'&&scene!=='boss')return {level:CALM,reason:scene||'menu'};
 if(!s)return {level:scene==='boss'?URGENT:FLOWING,reason:scene};
 if(s.paused)return {level:CALM,reason:'pause'};
 if(s.dying)return {level:CALM,reason:'loss'};
 if(s.completing||s.finished)return {level:CALM,reason:'clear'};
 if(s.dream?.mode==='record')return {level:CALM,reason:'dream'};
 if(s.boss||scene==='boss')return {level:URGENT,reason:'guardian'};
 const maxLives=Number(s.maxLives)||0;
 if(maxLives>=2&&Number.isFinite(s.lives)&&s.lives<=1)return {level:URGENT,reason:'last heart'};
 const max=Math.max(1,Number(s.maxFlame)||100);
 if(Number.isFinite(s.flame)&&s.flame<max*.2)return {level:URGENT,reason:'low sparks'};
 const distance=s.blackHole?.nearest?.distance;
 if(Number.isFinite(distance)&&distance<260||unit((s.blackHole?.rate||0)/80)>.4)return {level:URGENT,reason:'black hole'};
 if(s.boostActive)return {level:URGENT,reason:'flash'};
 return {level:FLOWING,reason:'flight'};
}
export function settleIntensity(state,target,now,{hold=6}={}){
 const current=state?.level??target;
 if(target>=current)return {level:target,lowerSince:null};
 const since=state?.lowerSince??now;
 return now-since>=hold?{level:target,lowerSince:null}:{level:current,lowerSince:since};
}
