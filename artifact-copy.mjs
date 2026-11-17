import {resourceSymbol} from './game-symbols.mjs?v=rest-2';
import {GUARDIAN_RELICS} from './guardian-artifacts.mjs?v=rest-2';
import {getArtifactInfo,CONSUMABLE_ARTIFACTS} from './artifact-info.mjs?v=rest-2';
import {getCompanionAbility,normalizeCompanionRole} from './companion-abilities.mjs?v=rest-2';
import {formatGlow,glowText,getGlowCapacity} from './vitality.mjs?v=rest-2';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const action={collector:'Collector delivers a Spark',protector:'Protector deflects a collision',swift:'Runner starts a burst',leveler:'Space Timer starts levitating'};
const chainLimit=(role,ending='')=>`${role==='collector'?'A Collector delivery resets the chain. ':''}Up to 5 activations per flight.${ending?` ${ending}`:''}`;

/** All text is in displayed Spark units; only the selected companion is named. */
export function artifactDescription(a,run={}, {fresh=false}={}){
 const info=getArtifactInfo(a.id),role=normalizeCompanionRole(run.companions?.[0]||run.companionRole);
 const name=getCompanionAbility(role).name,mod=a.modifiers||{};
 const points=amount=>formatGlow(Number(amount)||0);
 const convert=value=>glowText(value||'',getGlowCapacity(run));
 const companionWork=`After ${action[role]}`;
 const entries={
  'cache-cup':{trigger:'Collect a Cache Spark.',effect:'Restore 2 extra Sparks.',limit:'Automatic · permanent.'},
  'wayward-seed':{trigger:'Collect 3 Sparks in a row with your body.',effect:'Restore up to 1 Spark.',limit:chainLimit(role,'Evolves after Map 1.')},
  'hearth-bloom':{trigger:'Collect 3 Sparks in a row with your body.',effect:'Restore up to 3 Sparks.',limit:chainLimit(role,'Bonus Sparks cannot become Stored Sparks.')},
  'lantern-bloom':{trigger:'Collect 3 Sparks in a row with your body.',effect:'Reveal the whole scene for 1.5 seconds.',limit:chainLimit(role)},
  'glow-wick':{trigger:'Pick up a Spark while your meter is below full.',effect:'Restore up to 3 extra Sparks.',limit:'A full meter preserves the use. Bonus Sparks cannot become Stored Sparks.'},
  'flash-stone':{trigger:'Pick up a Spark.',effect:'Reveal the whole scene for 1.5 seconds.',limit:'Each pickup spends one use. Extra reveals do not stack.'},
  'quiet-cinder':{trigger:'',effect:'Every Lift costs 1 less Sparks.',limit:'A Lift always costs at least 1 Spark.'},
  'ember-lens':{trigger:'',effect:'Increase Luminance to see more terrain around you.',limit:'Permanently active.'},
  'silver-feather':{trigger:'',effect:'Every Lift pushes 6% more strongly.',limit:'Permanently active.'},
  'glass-lantern':{trigger:'Whenever you collect an Spark:',effect:`+${points(mod.cacheFuelBonus??40/3)} bonus Sparks per pickup. +1 Spark cost per Lift.`,limit:'The bonus is added to the Sparks already inside the Spark.'},
  'moss-heart':{trigger:'Touch a Spark yourself with Kindled Touch learned.',effect:`Kindled Touch restores ${points(mod.kindlerBonus??3)} extra Sparks.`,limit:'Requires Kindled Touch in the Sparks tree.'},
  'wayfinder-seed':{trigger:'While Collector is equipped.',effect:'Collector reaches 15% farther.',limit:role==='collector'?'Its orbit shows the increased reach.':'Requires Collector.'},
  'iron-petal':{trigger:'While Protector is equipped.',effect:'Protector rebuilds its shield 12% sooner.',limit:role==='protector'?'Deflecting a collision still spends Sparks.':'Requires Protector.'},
  'storm-knot':{trigger:'While Runner is equipped.',effect:'Runner recharges 10% sooner and resists more wind.',limit:'Draft resistance increases by 6 percentage points.'},
  'hollow-bell':{trigger:'While Space Timer is equipped.',effect:'Levitate for 0.25 seconds longer.',limit:'Release to fall and recharge.'},
  'dawn-thread':{trigger:'When Echo Luminance activates.',effect:'Its reveal lasts 1 second longer.',limit:'Requires Echo Luminance in the Light tree.'},
  'echo-vessel':{trigger:'Collect Sparks with a full meter.',effect:'Increase storage efficiency.',limit:'Without skills: 6 surplus Sparks become 2 Stored Sparks instead of 1. Skills add to this.'},
  'overflow-coil':{trigger:'Collect Sparks with a full meter.',effect:`Recharge ${name} faster.`,limit:'Up to 2 seconds per pickup and 12 seconds per flight. A ready companion spends none of the limit.'},
  'echo-bell':{trigger:`${companionWork}.`,effect:`Touch a Spark yourself within 8 seconds to gain +${points(mod.workFuel??8)} bonus Sparks.`,limit:'One charge at a time. Up to 5 empowered pickups per flight.'},
  'dawn-loom':{trigger:`When a pickup speeds up ${name} recovery.`,effect:'Reveal the route ahead for 1.5 seconds.',limit:'At least 4 seconds between flashes. Ordinary cooldown ticking does not trigger it.'},
  'sunspool':{trigger:'Pick up a Spark during a temporary reveal.',effect:'Store one free Lift.',limit:'One stored Lift. Up to 4 grants per flight, at least 4 seconds apart.'},
  'dreamcatcher':{trigger:'Collect Sparks during your saved Dream.',effect:`Recharge ${name} by 1.5 seconds per pickup.`,limit:'Requires a saved Dream opening.'},
  'second-dawn':{trigger:'Collect your first Spark after Dream playback.',effect:'Reveal the whole scene for 1.5 seconds.',limit:'Once per flight. Requires a saved Dream opening.'},
  'night-gardener':{trigger:'Pass a Dark Spark close to its red rim without touching it.',effect:'Each safe skim restores up to 6 missing Sparks.',limit:'Each Dark Spark blooms once. Up to 5 blooms per flight. A full meter preserves the allowance.'},
  'sunheart-engine':{trigger:'Pick up a Spark.',effect:`Gain ${points(mod.cacheFuelBonus??8)} extra Sparks. Overflow recharges ${name} and reveals ahead.`,limit:'Recharge: max 2s per pickup, 12s per flight. Reveal: 2s.'},
  'dream-sovereign':{trigger:'Collect Sparks during and after a saved Dream.',effect:`Dream pickups recharge ${name} by 2.5 seconds. The first waking pickup reveals the scene.`,limit:'Revealed pickups store a free Lift: up to 4 per flight. Extends Luminance.'},
  'hollow-covenant':{trigger:`${companionWork}, touch a Spark yourself within 8 seconds.`,effect:`Gain +${points(mod.workFuel??12)} bonus Sparks. Every Lift costs 1 less Sparks.`,limit:`Up to 5 empowered pickups per flight. Skim up to 5 Dark Sparks for ${points(mod.nightGarden??6)} Sparks each. Lift costs at least 1 Spark.`},
 };
 const selected={...(GUARDIAN_RELICS[a.id]||entries[a.id]||{effect:convert(a.description||info.effect),trigger:convert(info.trigger),limit:convert(info.limit)})};
 if(['echo-bell','hollow-covenant'].includes(a.id)&&(run.artifacts||[]).includes('echo-bell')&&(run.artifacts||[]).includes('hollow-covenant'))selected.limit+=' Their shared pickup bonus caps at 5 Sparks.';
 const spec=CONSUMABLE_ARTIFACTS[a.id],remaining=spec?(fresh?spec.charges:run.artifactCharges?.[a.id]??spec.charges):null;
 const lifetime=spec?(remaining>0?`${remaining} automatic ${remaining===1?'use':'uses'} · disappears when empty`:'Used up')
  :a.id==='wayward-seed'?'Automatic · evolves after Map 1':info.type==='passive'?'Permanent passive':'Automatic · permanent';
 return {...selected,lifetime,type:info.type,role,sequence:[selected.trigger,selected.effect].filter(Boolean)};
}

export function artifactDescriptionMarkup(a,run,options={}){
 const copy=artifactDescription(a,run,options);
 return `<div class="artifact-explanation">${copy.trigger?`<p class="artifact-trigger-line">${esc(copy.trigger)}</p>`:''}<p class="artifact-effect-main">${effectMarkup(copy.effect)}</p>${copy.limit?`<p class="artifact-limit-line">${esc(copy.limit)}</p>`:''}<span class="artifact-duration">${esc(copy.lifetime)}</span></div>`;
}

// The comparison surface keeps the first rule in view. Full rules always retain
// every sentence, including unusual interactions and evolution requirements.
export const artifactLimitSummary=copy=>String(copy.limit||'').split(/(?<=[.!?])\s+/)[0]||'';

// Escape first. Meaning is conveyed with words and signs as well as color.
export function effectMarkup(text){
 return String(text||'').split(/(?<=[.!?])\s+/).map(sentence=>{
  const cost=/extra Sparks.*cost|Sparks cost|costs .*extra|but .*cost/i.test(sentence);
  const benefit=/^\+|restore|gain|increase|farther|recharge|sooner|free Lift|less Sparks|reveal|resist|bonus|longer|more slowly/i.test(sentence)&&!cost;
  return `<span class="effect-clause ${cost?'effect-cost':benefit?'effect-benefit':'effect-neutral'}">${esc(sentence).replace(/\bStored Sparks?\b/g,match=>resourceSymbol('packed')+' '+match).replace(/(\d+(?:\.\d+)?(?: extra| bonus| fewer| more| less)? )Spark(s?)\b/g,(_,n,pl)=>n+resourceSymbol('energy')+' Spark'+pl)}</span>`;
 }).join(' ');
}
