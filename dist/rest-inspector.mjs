import {newState,createRun,advanceMap,selectNode} from './model.mjs?v=deck-flow-1';
import {describeTreasure,TREASURE_KINDS} from './treasure.mjs?v=deck-flow-1';
import {getGlowCapacity,getLifeCapacity,REST_GLOW_TUNING} from './vitality.mjs?v=deck-flow-1';
// Deliberately independent of storage. Every refresh creates the same mock run.
export function createRestInspectorState(params=new URLSearchParams()){
 const state=newState();state.profile.difficulty=4;
 const r=state.run=createRun(state.profile,'rest-inspector',1);r.phase='map-clear';advanceMap(r);
 r.skills={'main-efficiency':1,'main-sight':1,'main-dream':1,'main-spare-spark':1};
 r.startingSkill='main-efficiency';r.skillPaid={};r.maxLives=4;r.lives=2;r.flame=60;r.condensedGlow=180;r.unlockedCompanionDifficulty=4;
 r.artifacts=['glow-wick','hearth-bloom','quiet-cinder'];r.artifactCharges={'glow-wick':5};r.seedEvolution={id:'hearth-bloom'};r.guideSkipped=true;r.stats.flights=6;
 const scenario=params.get('scenario');
 if(['full','exhausted','fuel-only'].includes(scenario))state.settings.skipTutorial=true;
 if(['full','exhausted','fuel-only'].includes(scenario))r.lives=getLifeCapacity(r);
 if(['exhausted','fuel-only'].includes(scenario))r.restGlowCapacity=REST_GLOW_TUNING.capacityLimit;
 if(['full','exhausted'].includes(scenario))r.flame=getGlowCapacity(r);
 const rest=r.map.flat().find(n=>n.kind==='camp');if(!rest)throw Error('Mock Rest missing');
 let child=rest;const path=[];for(let row=rest.row-1;row>=0;row--){const parent=r.map[row].find(n=>n.nextIds.includes(child.id));if(!parent)throw Error('Mock path missing');path.unshift(parent.id);child=parent;}
 r.step=rest.row;r.path=path;r.phase='map';if(!selectNode(r,rest.id))throw Error('Cannot open mock Rest');return state;
}

export function createTreasureInspectorState(kind='vessel'){
 const state=createRestInspectorState(),r=state.run;
 if(!TREASURE_KINDS.includes(kind))kind='vessel';
 Object.assign(r.current,describeTreasure(kind),{kind:'treasure',type:'support'});
 r.supportOffers=null;r.flame=100;state.settings.skipTutorial=true;
 return state;
}
