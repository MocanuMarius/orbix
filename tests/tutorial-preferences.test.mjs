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

test('each departure begins paused with its own disabled start action until the scene is ready',()=>{
 const run={flame:100,mapIndex:0,lives:3,skills:{},stats:{flights:0},artifacts:[]};
 for(const node of [{name:'First flight'},{name:'Storm Shepherd',boss:true,bossId:'storm-shepherd'}]){
  const markup=flightEntryMarkup(run,node);
  assert.match(markup,/<button[^>]+data-action="wake-flight"[^>]*disabled/);
  assert.doesNotMatch(markup,/entry-resources|entry-artifacts/);
  assert.match(markup,/Preparing passage/);assert.match(markup,/Starts paused/);
  assert.match(markup,/cancel-flight-entry/);
 }
 assert.match(flightEntryMarkup(run,{}, {dream:true}),/Preparing Dream/);
});
