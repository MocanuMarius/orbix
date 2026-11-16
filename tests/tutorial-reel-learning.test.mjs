import test from 'node:test';
import assert from 'node:assert/strict';
import {WispCompanion} from '../dist/wisp.mjs';
import {WISP_ART} from '../dist/companion-art.mjs';
import {createTutorialState,recordTutorialPickup,updateTutorial,demonstratedTutorialTopics,getTutorialWorldFocus} from '../dist/tutorial.mjs';

test('ordinary practice reel teaches busy-to-ready without an obsolete post-delivery cooldown',()=>{
 const e={player:{x:110,y:310,radius:WISP_ART.worldRadius},width:900,height:620,time:0,distance:0,previousDistance:0,baseSpeed:154,lastFlapTime:0,flaps:1,
  mod:{wispCooldown:.4},companions:['collector'],companionRole:'collector',wispBoost:0,layout:{embers:[]},tutorial:createTutorialState({tutorialLesson:'glide'}),
  hasCompanion:r=>r==='collector',getDraftPuffs:()=>[],getLightState:()=>({radius:500,intensity:1}),
  collect(p){assert.ok(!p.collected);p.collected=true;recordTutorialPickup(this,p);},shatterPickupRing(){}};
 e.tutorial.directPickups=1;e.wisp=new WispCompanion(e.player);e.getWispState=()=>e.wisp.state(e);
 const packet={kind:'light',id:'practice:miss',x:70,y:335};e.layout.embers=[packet];
 let focus=null;
 for(let i=0;i<900&&!packet.collected;i++){
  e.time+=1/60;e.previousDistance=e.distance;e.distance+=e.baseSpeed/60;e.wisp.update(e,1/60);updateTutorial(e,1/60,{});
  if(e.wisp.cargo)focus ||= getTutorialWorldFocus(e,new Set(['luminance']));
 }
 assert.equal(packet.deliveredByWisp,true);assert.equal(e.tutorial.carrierDeliveries,1);
 assert.equal(e.tutorial.sawReel,true);assert.equal(e.tutorial.sawCooldown,false);
 assert.equal(e.wisp.phase,'ready');assert.ok(demonstratedTutorialTopics(e).includes('collector-recovery'));
 assert.equal(focus?.id,'carrier-return');assert.match(focus.text,/reeling/);
});
