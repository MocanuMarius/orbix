import {newState,createRun,ARTIFACTS,getChoices,selectNode,beginFlightAttempt,markFlightAttemptStarted,finishFlight,settleCheckpoint} from '../model.mjs?v=cord-2';
import {makeSkillCard} from '../skill-cards.mjs?v=cord-2';
import {prepareRouteOffer} from '../route-offers.mjs?v=cord-2';

/** Preview-only data. Never load/persist a player save or start a flight. */
export function createComponentFixture(family,variant){
  const state=newState();
  state.profile.difficulty=3;
  state.profile.tutorialComplete=true;
  const run=state.run=createRun(state.profile,family==='route'&&variant==='wayfinder'?'travel-guide-6':'shared-ui-workshop',2,{cards:true});
  run.artifacts=['wayward-seed','glow-wick','flash-stone','echo-bell','hollow-covenant','sunheart-engine','cache-cup','reed-charm','moon-glass'].filter(id=>ARTIFACTS[id]);
  run.artifactCharges={'glow-wick':1,'flash-stone':2};
  run.mountedCards=['echo','body-spark','spark-cache'].map((id,i)=>makeSkillCard(id,`sample-mounted-${i}`));
  run.reserveCards=['deep-vessel','tight-packing','chameleon','body-spark','rhythm','harvest-legendary'].map((id,i)=>makeSkillCard(id,`sample-reserve-${i}`));
  run.condensedGlow=75;
  if(family==='route'&&variant==='wayfinder'){
    // A naturally generated first stop: no replacement level or forced quest.
    // Offers follow the course layout, so look the Wayfinder stop up instead of naming a level.
    const node=run.map[0].find(item=>prepareRouteOffer(run,item,{profile:state.profile,width:900,height:405})?.id==='wayfinder');
    if(!node)throw Error('Wayfinder gate fixture changed.');
  }
  if(family==='collection'){
    run.restReady=['rest','confirm'].includes(variant);
    if(variant==='empty')run.artifacts=[];
  }
  if(family==='rewards'||family==='dialogs'){
    run.phase='victory';
    run.lastFlight={elite:true,success:true,completionBonus:12,pickupCondensedGlow:3,routeBonus:{id:'precision',amount:8,message:'+8 Stored Sparks'}};
    run.flightReward={offers:['glass-lantern','echo-vessel'],claimed:variant==='acquired',chosen:variant==='acquired'?'echo-vessel':null};
    if(variant==='clear')run.flightReward={offers:[],claimed:true};
    if(family==='rewards'&&['pedestal','horizontal','compact'].includes(variant)){
      run.artifacts.push('dawn-loom');
      run.lastFlight={elite:true,success:true,completionBonus:12,pickupCondensedGlow:3,routeBonus:{id:'wild-circuit',amount:0,message:'Objective met: +15 Stored Sparks'}};
      run.flightReward={offers:['dawn-loom','echo-vessel'],claimed:true,chosen:'dawn-loom'};
    }
  }
  if(family==='cards'&&variant==='empty'){run.mountedCards=[null,null,null];run.reserveCards=[];}
  if(family==='cards'&&['workshop','rest'].includes(variant)){
    run.startingGiftId='card:body-spark';run.current=run.map[4][0];run.step=4;run.path=[run.current.id];run.phase='support';
    run.mountedCards=['body-spark','spark-cache','rhythm'].map((id,i)=>makeSkillCard(id,`sample-workshop-${i}`));
    run.mountedCards[1].charges=1;
    run.reserveCards=[makeSkillCard('deep-vessel','sample-workshop-reserve'),{...makeSkillCard('cluster-heart','sample-workshop-cluster'),charges:1},makeSkillCard('growth-seed-common','sample-workshop-seed')];
    run.condensedGlow=100;run.lives=2;run.flame=30;
  }
  if(family==='cards'&&(variant==='draft'||variant==='draftCeremony')){
    run.startingGiftId='card:body-spark';
    const node=getChoices(run).find(node=>node.type!=='support');
    if(!selectNode(run,node.id)||!beginFlightAttempt(run)||!markFlightAttemptStarted(run)||!finishFlight(run,{success:true,flame:50}))throw Error('Draft fixture clear failed.');
    settleCheckpoint(state);
  }
  if(family==='cards'&&variant==='combos'){
    run.companions=['collector'];run.companionRole='collector';
    run.artifacts=['dawn-loom','echo-bell','wayward-seed'];
    run.mountedCards=['rhythm','harvest-common','ring-spring'].map((id,i)=>makeSkillCard(id,`sample-mounted-${i}`));
    run.reserveCards=['toll-bell','echo','deep-vessel','harvest-rare'].map((id,i)=>makeSkillCard(id,`sample-reserve-${i}`));
  }
  if(family==='cards'&&variant.startsWith('reward')){
    run.phase='map';
    const card=makeSkillCard(variant==='rewardSeed'?'growth-seed-common':variant==='rewardLong'?'devourer':'twin-wick','sample-reward');
    run.cardReward={id:'sample-reward-receipt',source:'flight',claimed:true,card,uiAcknowledged:false};
    run.reserveCards.push(card);
    if(variant==='rewardLong')run.mountedCards=['body-spark','long-spool','cast-line'].map((id,i)=>makeSkillCard(id,`sample-mounted-${i}`));
    if(variant==='rewardFive'){
      run.cardSlots=5;
      run.mountedCards.push(makeSkillCard('twin-wick','sample-mounted-3'),null);
    }
  }
  if((family==='route'&&variant==='progress')||(family==='menus'&&variant==='resume')){
    for(let index=0;index<3;index++){
      const node=getChoices(run)[0];
      if(!node)break;
      selectNode(run,node.id);run.step++;run.phase='map';
    }
  }
  if(family==='hud'){
    run.flame=variant==='low'?20:76;run.lives=variant==='low'?1:2;
  }
  return state;
}
