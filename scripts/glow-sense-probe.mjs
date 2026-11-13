import assert from 'node:assert/strict';
import {glowSenseCues} from '../dist/glow-sense.mjs';
import {newState,createRun,chooseStartingSkill,buyCheckpointSkill,getRunModifiers} from '../dist/model.mjs';
const s=newState();s.run=createRun(s.profile,'glow-sense-probe');s.run.embers=90;assert.equal(buyCheckpointSkill(s,'main-glow-sense'),false);chooseStartingSkill(s,'main-sight');assert.ok(buyCheckpointSkill(s,'main-glow-sense'));assert.equal(s.run.embers,50);assert.equal(getRunModifiers(s.run).glowSense,true);assert.equal(buyCheckpointSkill(s,'main-glow-sense'),false);
const light={radius:175,intensity:1,pickupReveal:0};
let packets=[];const e={width:390,height:620,distance:100,time:0,player:{x:100,y:310},mod:{glowSense:true},getNearbyPickups:()=>packets,getLightState:()=>light};
const p=(x=500,y=310,extra={})=>({kind:'light',x:x+e.distance,y,...extra});
packets=[p()];assert.equal(glowSenseCues(e).length,1);assert.equal(glowSenseCues(e)[0].y,310);assert.ok(glowSenseCues(e)[0].x>e.player.x&&glowSenseCues(e)[0].x<390);
for(const kind of ['light','cache','embers','charge','sight']){packets=[p(500,310,{kind})];assert.equal(glowSenseCues(e).length,1,kind);}
for(const extra of [{kind:'dark'},{kind:'dusk'},{collected:true},{carried:true},{generated:true},{harmful:true}]){packets=[p(500,310,extra)];assert.equal(glowSenseCues(e).length,0,JSON.stringify(extra));}
packets=[p(100),p(650)];assert.equal(glowSenseCues(e).length,0);
packets=[p(500,250),p(510,260),p(520,310),p(530,370),p(540,420)];assert.equal(glowSenseCues(e).length,3);const before=JSON.stringify(packets);glowSenseCues(e);assert.equal(JSON.stringify(packets),before);
packets=[p(200,310)];assert.equal(glowSenseCues(e).length,0,'Lit pickup needs no hint');
packets=[p(340,410)];const dark=glowSenseCues(e);assert.ok(dark.length);light.pickupReveal=1;assert.equal(glowSenseCues(e).length,0,'Full reveal suppresses on-screen cues');packets=[p(500)];assert.equal(glowSenseCues(e).length,1,'Off-screen cues survive full reveal');light.pickupReveal=0;
e.mod.glowSense=false;assert.equal(glowSenseCues(e).length,0);e.mod.glowSense=true;e.dying=true;assert.equal(glowSenseCues(e).length,0);e.dying=false;e.completionProgress=.1;assert.equal(glowSenseCues(e).length,0);
console.log('Glow Sense purchase, boon filters, clustering, visibility, offscreen and state-isolation checks passed');
