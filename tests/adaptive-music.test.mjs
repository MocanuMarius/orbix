import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusic,musicMix,musicReactivity} from '../dist/music.mjs';
test('music responds to flight pressure, guardians, dreams and pauses',()=>{
 assert.ok(musicMix('flight')[1]>musicMix('menu')[1]);assert.ok(musicMix('boss',1)[2]>musicMix('flight',1)[2]);
 assert.equal(musicMix('dream')[2],0);assert.ok(musicMix('pause')[1]<musicMix('flight')[1]);
});
test('world-rate tape slowdown stays shared, pulses lift melodic layers and scenes release it',()=>{
 const events={},players=[];let tick;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{constructor(){this.currentTime=12;this.paused=true;players.push(this);}play(){this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel(){}});
 events.pointerdown({});
 const near={worldRate:.35,flame:100,blackHole:{nearest:{distance:20},rate:100}};
 music.setFlight(near);tick();assert.equal(players[0].playbackRate,.35);
 for(let i=0;i<120;i++)tick();
 assert.ok(players.every(p=>p.playbackRate===players[0].playbackRate&&p.preservesPitch===false));
 assert.deepEqual(music.getTransport(),{time:12,rate:.35,bpm:88});
 music.setFlight({flame:100});for(let i=0;i<160;i++)tick();const baseline=players.map(p=>p.volume);
 music.setFlight({flame:100,light:{forwardLight:{intensity:1}}});for(let i=0;i<160;i++)tick();
 assert.ok(players[0].volume>baseline[0]);assert.ok(players[2].volume>baseline[2]);assert.ok(players[1].volume<baseline[1]);
 assert.ok(players.reduce((sum,p)=>sum+p.volume,0)<.65);
 for(const state of [{paused:true},{dying:true},{completing:true},{dream:{mode:'record'}}]){
  assert.deepEqual(musicReactivity({...near,...state,light:{pickupReveal:1}}),{hole:0,pulse:0});
 }
 music.setFlight(near);for(let i=0;i<100;i++)tick();music.setScene('menu');
 assert.ok(players.every(p=>p.playbackRate===1));
 // Reactive gain pressure alone never invents another slowdown clock.
 music.setFlight({...near,worldRate:1});tick();assert.ok(players.every(p=>p.playbackRate===1));
 music.destroy();const rate=players[0].playbackRate;music.setFlight(near);tick();assert.equal(players[0].playbackRate,rate);
});
test('three streamed layers ease their gains, mute completely, respect visibility and dispose their timer',()=>{
 const events={},players=[];let tick,cleared=0;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener:(key)=>delete events[key]};
 class Audio{constructor(src){this.src=src;this.paused=true;this.volume=0;this.currentTime=0;players.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem:()=>null,setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel:()=>cleared++});
 assert.equal(players.length,0);events.pointerdown({});assert.equal(players.length,3);
 music.setFlight({boss:{phase:3},flame:10,maxFlame:100});assert.equal(music.mode,'boss');
 tick();assert.ok(players.every(p=>p.volume>0&&p.volume<.04));for(let i=0;i<200;i++)tick();
 assert.ok(Math.abs(players[2].volume-musicMix('boss',1)[2])<.004);
 music.setEnabled(false);assert.ok(players.every(p=>p.paused));music.setEnabled(true);assert.ok(players.every(p=>!p.paused));
 document.hidden=true;events.visibilitychange();assert.ok(players.every(p=>p.paused));
 music.destroy();assert.ok(cleared>=2);assert.equal(Object.keys(events).length,0);
});
test('important effects duck every music stem gently, release slowly and preserve transport',()=>{
 const events={},players=[];let tick,plays=0;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{constructor(){this.currentTime=24;this.paused=true;players.push(this);}play(){plays++;this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel(){}});
 events.pointerdown({});music.setFlight({boss:{phase:3},flame:100});for(let i=0;i<200;i++)tick();
 const normal=players.map(p=>p.volume),transport=music.getTransport();
 music.setFlight({boss:{phase:3},flame:100,audioFocus:1});tick();
 assert.ok(players.every((p,i)=>p.volume<normal[i]&&p.volume>normal[i]*.78));
 for(let i=0;i<30;i++)tick();
 assert.ok(players.every((p,i)=>Math.abs(p.volume/normal[i]-.78)<.003));
 assert.deepEqual(music.getTransport(),transport);assert.equal(plays,3);
 music.setFlight({boss:{phase:3},flame:100,audioFocus:0});tick();
 assert.ok(players.every((p,i)=>p.volume>normal[i]*.78&&p.volume<normal[i]*.9));
 for(let i=0;i<100;i++)tick();assert.ok(players.every((p,i)=>Math.abs(p.volume-normal[i])<.002));
 music.setFlight({boss:{phase:3},flame:100,audioFocus:1});for(let i=0;i<30;i++)tick();
 music.setScene('boss',1);for(let i=0;i<160;i++)tick();assert.ok(players.every((p,i)=>Math.abs(p.volume-normal[i])<.002));
 assert.ok(players.every(p=>p.playbackRate===1));music.destroy();
});

test('world transport freezes at zero, resumes the same phase and never assigns an invalid media rate',()=>{
 const events={},players=[],writes=[];let tick;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{
  constructor(){this.currentTime=12;this.paused=true;this._rate=1;players.push(this);}
  set playbackRate(value){assert.ok(value>0);writes.push(value);this._rate=value;}
  get playbackRate(){return this._rate;}
  play(){this.paused=false;}
  pause(){this.paused=true;}
  addEventListener(){}
 }
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel(){}});
 const advance=seconds=>{for(const p of players)if(!p.paused)p.currentTime+=seconds*p.playbackRate;};
 events.pointerdown({});advance(1);
 music.setFlight({worldRate:.35,flame:100});advance(2);
 assert.deepEqual(music.getTransport(),{time:13.7,rate:.35,bpm:88});
 const rateWrites=writes.length;
 for(let i=0;i<100;i++)music.setFlight({worldRate:.35,flame:100});
 assert.equal(writes.length,rateWrites,'unchanged snapshots do not touch the media rate');
 music.setScene('pause');advance(10);tick();
 assert.deepEqual(music.getTransport(),{time:13.7,rate:0,bpm:88});
 assert.ok(players.every(p=>p.paused&&p.playbackRate===.35));
 events.pointerdown({});music.setEnabled(false);music.setEnabled(true);
 document.hidden=true;events.visibilitychange();document.hidden=false;events.visibilitychange();
 assert.ok(players.every(p=>p.paused),'gesture, enable and visibility cannot bypass the paused world');
 music.setFlight({worldRate:.1,flame:100});advance(2);
 assert.ok(players.every(p=>!p.paused&&Math.abs(p.currentTime-13.9)<1e-10&&p.playbackRate===.1));
 for(const state of [{paused:true},{tutorialAwaitingLift:true},{dying:true},{completing:true},{finished:true}]){
  music.setFlight({...state,worldRate:0});const time=music.getTransport().time;advance(3);
  assert.ok(players.every(p=>p.paused));assert.equal(music.getTransport().time,time);
  music.setFlight({worldRate:.35});
 }
 music.setScene('menu');assert.ok(players.every(p=>p.playbackRate===1&&!p.paused));
 assert.ok(players.every(p=>Math.abs(p.currentTime-13.9)<1e-10),'scene changes never seek back to a new beat');
 music.destroy();
});

test('saved music-off remains silent through world-rate and visibility changes',()=>{
 const events={},players=[];
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{constructor(){this.paused=true;players.push(this);}play(){this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem:()=> 'false',setItem(){}},schedule:()=>1,cancel(){}});
 events.pointerdown({});music.setFlight({worldRate:.35});music.setFlight({worldRate:0});music.setFlight({worldRate:1});
 document.hidden=true;events.visibilitychange();document.hidden=false;events.visibilitychange();music.setScene('menu');
 assert.equal(music.enabled,false);assert.equal(players.length,0);
 music.setEnabled(true);assert.equal(players.length,3);assert.ok(players.every(p=>!p.paused));music.destroy();
});

test('guide shares music level and lifecycle without adding or moving streamed stems',()=>{
 const events={},players=[],updates=[];let unlocks=0,stops=0,disposals=0;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{constructor(){this.currentTime=12;this.paused=true;players.push(this);}play(){this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const guide={unlock(){unlocks++;},update(s,options){updates.push({s,options});},stop(){stops++;},destroy(){disposals++;}};
 const music=createMusic({version:1,document,AudioClass:Audio,createGuide:()=>guide,storage:{getItem:()=> 'false',setItem(){}},schedule:()=>1,cancel(){}});
 events.pointerdown({});assert.equal(unlocks,0,'saved off must not open a guide audio context');
 music.setLevel(2);assert.equal(unlocks,1);assert.equal(players.length,3);
 const snapshot={worldRate:.35,flame:100,liftGuide:{phase:'soon',targetIn:.2}};
 music.setFlight(snapshot);const update=updates.at(-1);
 assert.equal(update.s,snapshot);assert.equal(update.options.enabled,true);
 assert.ok(update.options.gain>0&&update.options.gain<1);assert.equal(update.options.hidden,false);
 assert.deepEqual(update.options.transport,{time:12,rate:.35,bpm:88});
 let before=stops;music.setScene('menu');assert.ok(stops>before);
 music.setFlight(snapshot);before=stops;document.hidden=true;events.visibilitychange();assert.ok(stops>before);
 music.setFlight(snapshot);assert.equal(updates.at(-1).options.hidden,true);
 before=stops;music.setEnabled(false);assert.ok(stops>before);
 music.setFlight(snapshot);assert.equal(updates.at(-1).options.enabled,false);
 music.destroy();assert.equal(disposals,1);assert.equal(players.length,3);
});

test('deferred media play cannot restart a stopped world or a destroyed player',async()=>{
 const events={},players=[],requests=[];
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{
  constructor(){this.currentTime=12;this.paused=true;this.events={};players.push(this);}
  play(){return new Promise(resolve=>requests.push(()=>{this.paused=false;this.events.playing?.();resolve();}));}
  pause(){this.paused=true;}
  addEventListener(name,fn){this.events[name]=fn;}
 }
 const music=createMusic({version:1,document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:()=>1,cancel(){}});
 events.pointerdown({});music.setFlight({worldRate:0,paused:true});
 for(const request of requests.splice(0))request();await Promise.resolve();
 assert.ok(players.every(p=>p.paused));
 music.setFlight({worldRate:.35});assert.equal(requests.length,3);
 music.destroy();for(const request of requests.splice(0))request();await Promise.resolve();
 assert.ok(players.every(p=>p.paused));
});
