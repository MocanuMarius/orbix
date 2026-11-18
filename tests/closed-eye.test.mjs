import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardInspectorState} from '../dist/card-inspector.mjs';
import {cardsBenchMarkup} from '../dist/card-ui.mjs';
import {getRunModifiers} from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {LIGHT_PACKET_TUNING} from '../dist/vitality.mjs';

function challenge() {
  const state=createCardInspectorState(new URLSearchParams());
  const run=state.run;
  run.mountedCards=['chameleon','lantern-lens','harvest-common'].map((id,i)=>makeSkillCard(id,'mounted-'+i));
  run.pendingOath={id:'closed-eye'};
  run.reserveCards=['climb','double-lift'].map((id,i)=>makeSkillCard(id,'reserve-'+i));
  return state;
}

test('Closed Eye flags both a borrowed Lens and a reserve Climb, then clears the Deck badges',()=>{
  const state=challenge();
  const badges=markup=>(markup.match(/class="card-sight-warning"/g)||[]).length;
  assert.equal(badges(cardsBenchMarkup(state)),2);
  assert.equal(badges(cardsBenchMarkup(state,{browsing:true})),1);
  assert.match(cardsBenchMarkup(state,{browsing:true,inspecting:true,selectedId:'reserve-0'}),/Spark crossings still work/);
  delete state.run.pendingOath;
  assert.equal(badges(cardsBenchMarkup(state)),0);
});

test('Closed Eye keeps the card combo running in darkness and permits passage lights',()=>{
  const {run}=challenge();
  const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    preflight:true,seed:'eye-test',companions:['collector'],modifiers:getRunModifiers(run)});
  e.running=true;e.render=()=>{}; e.notify=()=>{};
  const {x,y}=e.player, packet={x:e.distance+x+65,y,kind:'light'};
  e.layout.embers=[packet];e.getNearbyPickups=()=>[packet];e.flame=0;
  assert.equal(e.getLightState().baseRadius,LIGHT_PACKET_TUNING.baseRadius*.38);
  const dark=e.radiateLight({once:true,source:'card-climb',sourceKind:'card'});
  assert.equal(dark.reveal,false);
  e.luminanceWaves.update(.25);
  assert.ok(e.flame>0);
  assert.equal(packet.collected,undefined);
  assert.equal(e.luminanceWaves.revealCount,0);
  for(const sourceKind of ['map','pickup']){
    assert.ok(e.radiateLight({once:true,sourceKind}).reveal);
  }
});
