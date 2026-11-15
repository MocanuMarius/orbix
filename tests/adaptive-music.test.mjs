import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusic,musicMix} from '../dist/music.mjs';
test('music responds to flight pressure, guardians, dreams and pauses',()=>{
 assert.ok(musicMix('flight')[1]>musicMix('menu')[1]);assert.ok(musicMix('boss',1)[2]>musicMix('flight',1)[2]);
 assert.equal(musicMix('dream')[2],0);assert.ok(musicMix('pause')[1]<musicMix('flight')[1]);
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
