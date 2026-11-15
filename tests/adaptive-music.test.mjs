import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusic,musicMix,musicReactivity} from '../dist/music.mjs';
test('music responds to flight pressure, guardians, dreams and pauses',()=>{
 assert.ok(musicMix('flight')[1]>musicMix('menu')[1]);assert.ok(musicMix('boss',1)[2]>musicMix('flight',1)[2]);
 assert.equal(musicMix('dream')[2],0);assert.ok(musicMix('pause')[1]<musicMix('flight')[1]);
});
test('black-hole tape slowdown stays shared, pulses lift melodic layers and scenes release it',()=>{
 const events={},players=[];let tick;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 class Audio{constructor(){this.currentTime=12;this.paused=true;players.push(this);}play(){this.paused=false;}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel(){}});
 events.pointerdown({});
 const near={flame:100,blackHole:{nearest:{distance:20},rate:100}};
 music.setFlight(near);tick();assert.ok(players[0].playbackRate<1&&players[0].playbackRate>.72);
 for(let i=0;i<120;i++)tick();
 assert.ok(players.every(p=>p.playbackRate===players[0].playbackRate&&p.preservesPitch===false));
 assert.ok(players[0].playbackRate<.721);assert.deepEqual(music.getTransport(),{time:12,rate:players[0].playbackRate,bpm:88});
 music.setFlight({flame:100});for(let i=0;i<160;i++)tick();const baseline=players.map(p=>p.volume);
 music.setFlight({flame:100,light:{forwardLight:{intensity:1}}});for(let i=0;i<160;i++)tick();
 assert.ok(players[0].volume>baseline[0]);assert.ok(players[2].volume>baseline[2]);assert.ok(players[1].volume<baseline[1]);
 assert.ok(players.reduce((sum,p)=>sum+p.volume,0)<.65);
 for(const state of [{paused:true},{dying:true},{completing:true},{dream:{mode:'record'}}]){
  assert.deepEqual(musicReactivity({...near,...state,light:{pickupReveal:1}}),{hole:0,pulse:0});
 }
 music.setFlight(near);for(let i=0;i<100;i++)tick();music.setScene('menu');
 const slowed=players[0].playbackRate;tick();assert.ok(players[0].playbackRate>slowed);
 for(let i=0;i<160;i++)tick();assert.ok(players[0].playbackRate>.999);
 music.destroy();const rate=players[0].playbackRate;music.setFlight(near);tick();assert.equal(players[0].playbackRate,rate);
});
test('three streamed layers ease their gains, mute completely, respect visibility and dispose their timer',()=>{
 const events={},players=[];let tick,cleared=0;
 const document={hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener:(key)=>delete events[key]};
 class Audio{constructor(src){this.src=src;this.paused=true;this.volume=0;this.currentTime=0;players.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}}
 const music=createMusic({document,AudioClass:Audio,storage:{getItem:()=>null,setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel:()=>cleared++});
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
 const music=createMusic({document,AudioClass:Audio,storage:{getItem(){},setItem(){}},schedule:fn=>{tick=fn;return 1;},cancel(){}});
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
