import {newState,createRun,ARTIFACTS,getChoices,selectNode} from '../model.mjs?v=relic-guide-1';
import {makeSkillCard} from '../skill-cards.mjs?v=relic-guide-1';
import {prepareRouteOffer} from '../route-offers.mjs?v=relic-guide-1';

/** Preview-only data. Never load/persist a player save or start a flight. */
export function createComponentFixture(family,variant){
  const state=newState();
  state.profile.difficulty=3;
  state.profile.tutorialComplete=true;
  const run=state.run=createRun(state.profile,family==='route'&&variant==='wayfinder'?'travel-guide-6':'shared-ui-workshop',2,{cards:true});
  run.artifacts=['wayward-seed','glow-wick','flash-stone','echo-bell','hollow-covenant','sunheart-engine','cache-cup','reed-charm','moon-glass'].filter(id=>ARTIFACTS[id]);
  run.artifactCharges={'glow-wick':1,'flash-stone':2};
  run.mountedCards=['echo','body-spark','spark-cache'].map((id,i)=>makeSkillCard(id,`sample-mounted-${i}`));
  run.reserveCards=['deep-vessel','tight-packing','chameleon','field-impulse','rhythm','harvest-legendary'].map((id,i)=>makeSkillCard(id,`sample-reserve-${i}`));
  run.condensedGlow=75;
  if(family==='route'&&variant==='wayfinder'){
    // A naturally generated first stop: no replacement level or forced quest.
    const node=run.map[0].find(item=>item.levelId==='thorn-thorn-steeple');
    if(!node||prepareRouteOffer(run,node,{profile:state.profile,width:900,height:405})?.id!=='wayfinder')throw Error('Thorn Steeple Wayfinder fixture changed.');
  }
  if(family==='collection'){
    run.restReady=['rest','confirm'].includes(variant);
    if(variant==='empty')run.artifacts=[];
  }
  if(family==='rewards'||family==='dialogs'){
    run.phase='victory';
    run.lastFlight={elite:true,success:true,completionBonus:12,pickupCondensedGlow:3,routeBonus:{amount:5,message:'Wayfinder challenge completed.'}};
    run.flightReward={offers:['glass-lantern','echo-vessel'],claimed:variant==='acquired',chosen:variant==='acquired'?'echo-vessel':null};
    if(variant==='clear')run.flightReward={offers:[],claimed:true};
    if(family==='rewards'&&['pedestal','horizontal','compact'].includes(variant)){
      run.artifacts.push('dawn-loom');
      run.lastFlight={elite:true,success:true,completionBonus:12,pickupCondensedGlow:3,routeBonus:{id:'wild-circuit',amount:0,message:'Wild Circuit completed. Companion recovery 20% faster for 3 cleared flights.'}};
      run.flightReward={offers:['dawn-loom','echo-vessel'],claimed:true,chosen:'dawn-loom'};
      run.passageBoons={'wild-circuit':3};
    }
  }
  if(family==='cards'&&variant==='empty'){run.mountedCards=[null,null,null];run.reserveCards=[];}
  if(family==='cards'&&variant.startsWith('reward')){
    run.phase='map';
    const card=makeSkillCard(variant==='rewardSeed'?'growth-seed-common':variant==='rewardLong'?'devourer':'twin-wick','sample-reward');
    run.cardReward={id:'sample-reward-receipt',source:'flight',claimed:true,card,uiAcknowledged:false};
    run.reserveCards.push(card);
    if(variant==='rewardLong')run.mountedCards=['field-impulse','long-spool','cast-line'].map((id,i)=>makeSkillCard(id,`sample-mounted-${i}`));
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
