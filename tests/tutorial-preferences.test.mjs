import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,saveState,loadState} from '../dist/model.mjs';
import {automaticTipsEnabled} from '../dist/onboarding.mjs';
import {flightEntryMarkup} from '../dist/flight-entry.mjs';

test('the tutorial preference defaults to lessons and survives save/load in either position',()=>{
 const s=newState();let data;
 const storage={getItem:()=>data,setItem:(_,value)=>{data=value}};
 assert.equal(s.settings.skipTutorial,false);
 for(const value of [true,false]){
  s.settings.skipTutorial=value;
  assert.ok(saveState(s,storage));
  assert.equal(loadState(storage).settings.skipTutorial,value);
 }
 const old=JSON.parse(data);delete old.settings.skipTutorial;data=JSON.stringify(old);
 assert.equal(loadState(storage).settings.skipTutorial,false);
 old.settings.skipTutorial='true';data=JSON.stringify(old);
 assert.equal(loadState(storage).settings.skipTutorial,false);
});

test('automatic lessons can be disabled while explicit practice remains a learning path',()=>{
 assert.equal(automaticTipsEnabled({skipTutorial:false},{isTutorial:false}),true);
 assert.equal(automaticTipsEnabled({skipTutorial:true},{isTutorial:false}),false);
 assert.equal(automaticTipsEnabled({skipTutorial:true},{isTutorial:true}),true);
});

test('skipping tips removes splash trivia while preserving fuel, hearts and safe start',()=>{
 const run={flame:100,mapIndex:0,lives:3,skills:{},stats:{flights:0},artifacts:[]};
 for(const node of [{name:'First flight'},{name:'Storm Shepherd',boss:true,bossId:'storm-shepherd'}]){
  assert.match(flightEntryMarkup(run,node),/class="entry-tip"/);
  const markup=flightEntryMarkup(run,node,{showTips:false});
  assert.doesNotMatch(markup,/class="entry-tip"/);
  assert.match(markup,/entry-resources/);
  assert.match(markup,/Starts paused/);
 }
});
