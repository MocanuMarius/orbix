/** Small, read-only explanations for the actual chain. */
import {SKILL_CARDS, getMountedCards, getEffectiveCardSources, getCardRowRule, previewCardRowEvent, CARD_ROW_EVENTS, getUseDoublerTarget, getEmberFeederTargets, getCardFeederCapacity, getAlwaysOnCardBoosts} from './skill-cards.mjs?v=cards-hidden-2';
import {getCardRuleBands} from './card-rule-bands.mjs?v=cards-hidden-2';
import {getEquippedCardStatuses} from './card-status.mjs?v=cards-hidden-2';
import {ARTIFACTS} from './model.mjs?v=cards-hidden-2';
import {artifactDescription} from './artifact-copy.mjs?v=cards-hidden-2';
import {artifactPixelPortrait} from './artifact-pixel-art.mjs?v=cards-hidden-2';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number(Number(value||0).toFixed(3));
const contextButton=(key,label,extra='')=>`<button type="button" class="deck-context-link" data-deck-context-open="${esc(key)}" ${extra}>${esc(label)} <span aria-hidden="true">↗</span></button>`;

// Trigger name, then what happens (docs/card-teaching-plan.md §1).
const eventNames={
  [CARD_ROW_EVENTS.body]:'Collect · your wisp touches a Spark',
  [CARD_ROW_EVENTS.wave]:'Pulse · a Pulse crosses a Spark you have not collected',
  [CARD_ROW_EVENTS.flash]:'Flash · you or Collector pick up Flash',
  [CARD_ROW_EVENTS.flashExpiry]:'Flash ends · a Flash’s light runs out',
  [CARD_ROW_EVENTS.lift]:'Falling Lift · a paid Lift while falling, at least 0.75 s after your last Lift',
  [CARD_ROW_EVENTS.overfill]:'Overfill · a Spark brings more than your meter can hold',
  [CARD_ROW_EVENTS.delivery]:'Delivery · Collector brings you a pickup',
  [CARD_ROW_EVENTS.rhythm]:'Rhythm · 3 even Lifts complete',
  [CARD_ROW_EVENTS.guard]:'Save · Collector stops a fatal crash',
  [CARD_ROW_EVENTS.clear]:'Clear · you clear a flight',
  [CARD_ROW_EVENTS.victory]:'You defeat the third guardian',
  [CARD_ROW_EVENTS.attach]:'Latch · Collector grabs a missed pickup',
};
const stepResult=steps=>{
  const sum=key=>number(steps.reduce((total,step)=>total+(step[key]||0),0)),parts=[];
  if(sum('amount'))parts.push(`+${sum('amount')} Sparks`);
  if(sum('stored'))parts.push(`+${sum('stored')} Stored Sparks`);
  if(sum('futureCapacity'))parts.push(`+${sum('futureCapacity')} future maximum Sparks`);
  if(sum('cruisingSpeed'))parts.push(`+${sum('cruisingSpeed')}% cruising speed`);
  if(sum('recoverySeconds'))parts.push(`${sum('recoverySeconds')}s recovery saved`);
  if(sum('reelSeconds'))parts.push(`${sum('reelSeconds')}s reel saved`);
  return parts.join(' · ')||'No extra payout';
};

/** A concrete, read-only quote for THIS acting slot. Uses and rank are live. */
export function getDeckCardExplanation(run,card){
  if(!card?.mounted)return null;
  const cards=getMountedCards(run),status=getEquippedCardStatuses(run)[card.slot];
  const source=getEffectiveCardSources(run.mountedCards||[]).find(source=>source.index===card.slot);
  const rule=source&&getCardRowRule(source.def,source.source);
  const printedBands=getCardRuleBands(card,SKILL_CARDS[card.cardId]);
  const requirements=[];
  const when=rule?.when||{};
  if(when.pickupKind)requirements.push(`${when.pickupKind==='light'?'Spark':when.pickupKind==='cache'?'Cache':when.pickupKind==='cluster'?'cluster':when.pickupKind} pickup`);
  if(when.meterAtMost!==undefined)requirements.push(`meter at or below ${number(when.meterAtMost*100)}% before pickup`);
  if(when.firstCrossing)requirements.push('first crossing of this Pulse');
  if(when.direction)requirements.push(`${when.direction} swipe`);
  if(when.guardRecovering)requirements.push('Collector is recovering after a save');
  if(when.collectorReeling)requirements.push('Collector is actively reeling a pickup');
  if(['shorten-recovery','shorten-reel'].includes(rule?.operation))requirements.push('Collector still has time left to shorten');
  if(when.pass)requirements.push(when.pass===2?'in an Encore only':'first firing only');
  if(when.lastOccupied)requirements.push('rightmost occupied slot');
  if(rule?.minimumEarlierPayers)requirements.push(`${rule.minimumEarlierPayers===1?'a + card':`${rule.minimumEarlierPayers} + cards`} before it, on the same Trigger`);
  if(rule?.operation==='multiply')requirements.push('a card to its left that gives something on the same Trigger');
  const ordered=['multiply','add-last-payout','multiply-future-capacity'].includes(rule?.operation)||rule?.minimumEarlierPayers||when.lastOccupied;
  const placement=['echo','chameleon','use-doubler'].includes(card.kind)
    ? `Next card: Slot ${card.slot+2} · ${cards[card.slot+1]?.name||'empty or outside the chain'}. No empty Slot between them.`
    : card.kind==='ember-feeder' ? 'Targets the first two occupied cards to its right, skipping empty slots. Their destruction happens only after a successful clear.'
    : card.kind==='devourer' ? `Next card: Slot ${card.slot+2} · ${cards[card.slot+1]?.name||'empty or outside the chain'}. A clear with a heart missing eats that Rare card to heal.`
    : card.kind==='refrain' ? 'Refrain can sit anywhere. It gives one Encore for the same Trigger; all Refrains share it.'
    : rule?.operation==='multiply' ? 'Order matters: it strengthens only the cards to its left, so put it to their right. Each firing starts at 0 Sparks.'
    : ordered ? 'Order matters: only the cards to its left, on the same Trigger, can feed it. Each firing starts at 0 Sparks.'
    : 'Its place does not matter for its own Trigger. A Boost to its right still strengthens it.';
  let example=null;
  if(rule&&status?.state!=='blocked'){
    const kinds=rule.event==='*'?Object.values(CARD_ROW_EVENTS):[rule.event];
    for(const kind of kinds){
      const event={kind,firstCrossing:true,pickupKind:when.pickupKind||'light',meterFraction:when.meterAtMost??.2,direction:when.direction||'up',guardRecovering:!!when.guardRecovering,collectorReeling:!!when.collectorReeling,availableRecovery:10,availableReel:when.collectorReeling?10:0,carriedStored:Math.floor(run.carriedCondensedGlow||run.condensedGlow||0)};
      const trace=previewCardRowEvent(run.mountedCards,event),steps=trace.steps.filter(step=>step.slot===card.slot&&step.success&&step.operation!=='replay-row');
      if(steps.length){example={trace,steps,event};break;}
    }
  }else if(card.kind==='refrain'&&status?.state==='ready'){
    for(const kind of Object.values(CARD_ROW_EVENTS)){
      const event={kind,firstCrossing:true,pickupKind:'light',meterFraction:.2,direction:'up',availableRecovery:10,availableReel:10,collectorReeling:true,carriedStored:Math.floor(run.condensedGlow||0)};
      const trace=previewCardRowEvent(run.mountedCards,event);
      if(trace.steps.some(step=>step.pass===2&&step.success&&step.operation!=='replay-row'&&getEquippedCardStatuses(run)[step.slot]?.state!=='blocked')){example={trace,steps:[],event};break;}
    }
  }
  let summary=card.effectiveSummary||card.copyPreview||printedBands.filter(band=>band.type==='effect').map(band=>band.text).join(' ');
  // Detail G: a boosted always-on card says what it really gives, and which card boosts it.
  const boosts=getAlwaysOnCardBoosts(run.mountedCards||[]).filter(entry=>entry.slot===card.slot&&entry.multiplier>1);
  if(boosts.length){const base=boosts.reduce((s,e)=>s+e.base,0),boosted=boosts.reduce((s,e)=>s+e.boosted,0),unit=boosts[0].unit,by=[...new Set(boosts.flatMap(e=>e.boostedBy.map(b=>b.name)))].join(' and ');
    summary=`+${number(base)}${unit.startsWith('%')?'':' '}${unit} → +${number(boosted)}${unit.startsWith('%')?'':' '}${unit}, boosted by ${by}. ${summary}`;}
  if(card.kind==='use-doubler'){const target=getUseDoublerTarget(run.mountedCards,card.slot);if(target)summary=`On real flight entry: consume Use Doubler. ${SKILL_CARDS[target.cardId].name} (slot ${card.slot+2}) keeps ${target.charges} → ${target.charges*2} uses. No effect in preview or Dream.`;}
  if(card.kind==='ember-feeder'){const targets=getEmberFeederTargets(run.mountedCards,card.slot),growth=getCardFeederCapacity(card);if(targets.length)summary=`After clear: permanently destroy ${targets.map(({card:target,slot})=>`${SKILL_CARDS[target.cardId].name} (slot ${slot+1})`).join(' + ')}. This Feeder: +${growth} → +${growth+1} maximum Sparks while equipped. No refill.`;}
  return {status,usesPass:!!rule||card.kind==='refrain',trigger:rule&&rule.event!=='*'?eventNames[rule.event]:printedBands.find(band=>band.type==='condition')?.text||'Always on',requirements,placement,ordered:!!ordered||rule?.operation==='multiply',example,summary,boosts};
}

export function deckCardExplanationMarkup(run,card,{status:presentedStatus=null}={}){
  const info=getDeckCardExplanation(run,card);if(!info)return '';
  const {example}=info,status=presentedStatus||info.status;
  const blocked=status?.state==='blocked';
  const own=example?.trace.cards?.[card.slot],keys=[['sparks','Sparks'],['stored','Stored Sparks'],['futureCapacity','max Sparks forever'],['cruisingSpeed','% speed'],['recoverySeconds','s recovery saved'],['reelSeconds','s reel saved']];
  // The card's own figure after repeats and Boosts (base struck through when different).
  const plate=own?keys.filter(([key])=>own.effective[key]||own.base[key]).map(([key,unit])=>`${own.base[key]!==own.effective[key]?`<s>+${number(own.base[key])}</s> `:''}+${number(own.effective[key])}${unit.startsWith('%')||unit.startsWith('s ')?'':' '}${unit}`).join(' · '):'';
  const sample=example?`<details class="deck-card-example"><summary>Example · ${esc(eventNames[example.event.kind]||info.trigger)}</summary><p class="deck-context-note">Preview from your current cards and remaining uses${example.trace.recoverySeconds||example.trace.reelSeconds?' · assumes 10 s left to shorten':''}. Card Sparks are shown before the meter limit.</p>${plate?`<p><strong>${esc(card.name)} gives</strong> · ${plate}</p>`:''}${example.trace.passes>1?[1,2].map(pass=>`<p><strong>${pass===1?'First firing':'Encore'}</strong> · ${esc(card.kind==='refrain'?stepResult(example.trace.steps.filter(step=>step.pass===pass&&step.success&&step.operation!=='replay-row')):stepResult(example.steps.filter(step=>step.pass===pass)))}</p>`).join(''):`<p><strong>${esc(card.name)}</strong> · ${esc(stepResult(example.steps))}</p>`}<p class="deck-context-note">Whole chain: +${number(example.trace.sparks)} Sparks${example.trace.stored?` · +${number(example.trace.stored)} Stored Sparks`:''}${example.trace.futureCapacity?` · +${number(example.trace.futureCapacity)} max Sparks forever`:''}${example.trace.passes>1?' · with an Encore':''}.</p>${example.steps.some(step=>Number.isFinite(step.chargesBefore))?`<p>Uses · ${esc(SKILL_CARDS[example.steps[0].sourceCardId]?.name||card.name)}: ${example.steps[0].chargesBefore} → ${example.steps.at(-1).chargesAfter}</p>`:''}</details>`:'';
  return `<div class="deck-live-explanation"><p class="deck-card-verdict deck-verdict-${esc(status?.state||'ready')}"><strong>${esc(status?.label||'Equipped')}</strong>${blocked?` · ${esc(status.reason)} ${esc(status.fix)}`:['shared','partial'].includes(status?.state)?` · ${esc(status.reason)}`:''}</p>${info.summary?`<p class="deck-live-result">${esc(info.summary)}</p>`:''}<p><strong>When</strong> · ${esc(info.trigger).replace(/^When /,'')}</p>${info.requirements.length?`<details class="deck-card-requirements"><summary>Requirements · ${info.requirements.length}</summary><ul>${info.requirements.map(requirement=>`<li>${esc(requirement)}</li>`).join('')}</ul></details>`:''}${sample}<details class="deck-card-placement"><summary>Placement${info.ordered?' · order matters':''}</summary><p>${esc(info.placement)}</p></details><details class="deck-pass-help"><summary>${info.usesPass?'How does the chain fire?':'Always on · it does not fire'}</summary>${!info.usesPass?`<p>${esc(card.name)} works all the time while it is in your chain, so it never fires and an Encore does not repeat it. A Boost to its right still strengthens its bonus.</p>`:''}<p>When a Trigger happens, the cards with that Trigger fire from Slot 1 to the right. + cards add Sparks; a Boost multiplies every card to its left.</p><p>With Refrain, the chain fires once more for the same Trigger: an Encore, starting at 0 Sparks. Copies and Encores spend the real card’s uses and make no extra pickup or Pulse.</p></details></div>`;
}

export function getDeckComboLinks(run={}) {
  const cards=getMountedCards(run),statuses=getEquippedCardStatuses(run),sources=getEffectiveCardSources(run.mountedCards||[]);
  const eligible=kind=>sources.filter(source=>source.def.kind===kind&&statuses[source.index]?.state!=='blocked');
  // Mark the real printed condition, even when a copying slot acts first.
  const find=kind=>eligible(kind).find(source=>SKILL_CARDS[cards[source.index]?.cardId]?.kind===kind)||eligible(kind)[0];
  const rhythm=find('rhythm'),harvest=find('harvest'),ring=find('ring-spring'),links=[];
  if(rhythm&&harvest){
    const trace=previewCardRowEvent(run.mountedCards,{kind:CARD_ROW_EVENTS.wave,firstCrossing:true,pickupKind:'light',availableRecovery:0});
    const step=trace.steps.find(step=>step.sourceInstanceId===harvest.source.instanceId&&step.success);
    links.push({id:'rhythm-harvest',name:'Rhythm → Harvest',sourceSlot:rhythm.index,targetSlot:harvest.index,
      sourceText:'Send out one Pulse',targetText:'Pulse crosses a Spark',result:`+${number(step?.amount)} on crossing`,
      explanation:'3 evenly timed Lifts start the Pulse. Harvest leaves the crossed pickup in place.',
      note:'Either slot order works. A Pulse must reach a Spark; making the Pulse alone gives no Harvest payout.'});
  }
  if(ring&&(run.artifacts||[]).includes('dawn-loom')){
    const trace=previewCardRowEvent(run.mountedCards,{kind:CARD_ROW_EVENTS.overfill,availableRecovery:10,meterFraction:1});
    const step=trace.steps.find(step=>step.slot===ring.index&&step.success);
    links.push({id:'ring-dawn',name:'Ring Spring → Dawn Loom',sourceSlot:ring.index,targetArtifact:'dawn-loom',
      sourceText:'Shorten recovery',targetText:'Recovery actually shortened',result:`−${number(step?.recoverySeconds)}s → light ahead`,
      explanation:'A passage Spark overfills your meter. Ring Spring shortens an active Collector recovery; Dawn Loom reveals the route ahead for 1.5s.',
      note:'Collector must still be recovering. Dawn Loom allows one flash every 4s. A ready Collector gives no flash.'});
  }
  return links;
}

export function deckRelicShelfMarkup(run={}) {
  const owned=[...new Set(run.artifacts||[])].filter(id=>ARTIFACTS[id]);
  if(!owned.length)return '';
  return `<div class="deck-relic-shelf" role="group" aria-label="Owned relics · inspect their effects"><span>Relics</span><div>${owned.map(id=>`<button type="button" data-deck-context-open="relic:${esc(id)}" data-deck-relic="${esc(id)}" aria-label="Inspect owned ${esc(ARTIFACTS[id].name)}" title="${esc(ARTIFACTS[id].name)}">${artifactPixelPortrait(id)}</button>`).join('')}</div></div>`;
}

function relatedMarkup(run,card){
  const kind=card?.kind,ids=kind==='ring-spring'?['dawn-loom','overflow-coil']:[];
  if(!ids.length)return '';
  return `<details class="deck-related"><summary>Related relics</summary><div>${ids.filter(id=>ARTIFACTS[id]).map(id=>`<div>${contextButton(`relic:${id}`,ARTIFACTS[id].name)}<small>${(run.artifacts||[]).includes(id)?'Owned':'Optional · not owned'} · ${id==='dawn-loom'?'Actual recovery creates light.':'Natural overfill can also shorten recovery.'}</small></div>`).join('')}</div></details>`;
}

function relicPanel(run,id,links){
  const artifact=ARTIFACTS[id];if(!artifact)return '';
  const owned=(run.artifacts||[]).includes(id),copy=artifactDescription(artifact,run),link=links.find(link=>link.targetArtifact===id);
  return `<section class="deck-context-panel" data-deck-context="relic:${esc(id)}" hidden><small>${owned?'OWNED RELIC':'OPTIONAL · NOT OWNED'}</small><header>${artifactPixelPortrait(id)}<h3>${esc(artifact.name)}</h3></header><p>${esc(copy.trigger)}</p><strong>${esc(copy.effect)}</strong><p class="deck-context-note">${esc(copy.limit)}</p>${link?contextButton(`combo:${link.id}`,link.name):''}${id==='dawn-loom'&&!link?'<p class="deck-context-note">Ring Spring can supply this trigger when a passage Spark overfills your meter during Collector recovery.</p>':''}<button type="button" class="deck-context-close" data-deck-context-close>Close explanation</button></section>`;
}

export function deckContextMarkup(run,{card=null,locked=false,moving=false,cardStatus=null}={}){
  const cards=getMountedCards(run),statuses=getEquippedCardStatuses(run),links=getDeckComboLinks(run);
  const relevant=card?links.filter(link=>link.sourceSlot===card.slot||link.targetSlot===card.slot):[];
  const status=cardStatus||(card?.mounted?statuses[card.slot]:null);
  const selected=card?.mounted?`<section class="deck-context-panel" data-deck-context="selected"><header class="deck-selected-title"><small>SLOT ${card.slot+1} · YOUR CURRENT ARRANGEMENT</small><h3>${esc(card.name)}</h3></header><div class="deck-selected-body">${deckCardExplanationMarkup(run,card,{status})}${relevant.length?`<details class="deck-selected-links"><summary>Connected effects · ${relevant.length}</summary>${relevant.map(link=>contextButton(`combo:${link.id}`,link.name)).join('')}</details>`:''}${relatedMarkup(run,card)}<button type="button" class="deck-context-close" data-action="card-cancel-equip">Clear selection</button></div><div class="deck-selected-actions"><button class="secondary" data-action="card-inspect" data-id="${esc(card.instanceId)}">Inspect & improve</button><button class="secondary" data-action="card-return-selected" ${locked?'disabled':''}>To Deck</button></div></section>`:'';
  const combos=links.map(link=>`<section class="deck-context-panel" data-deck-context="combo:${link.id}" data-combo-source-slot="${link.sourceSlot}" ${link.targetSlot!=null?`data-combo-target-slot="${link.targetSlot}"`:''} ${link.targetArtifact?`data-combo-target-relic="${link.targetArtifact}"`:''} hidden><small>CONNECTED IN THIS BUILD</small><h3>${esc(link.name)}</h3><div class="deck-combo-chain"><span class="deck-combo-action">${esc(link.sourceText)}</span><span aria-hidden="true">↓</span><span class="deck-combo-condition">${esc(link.targetText)}</span><strong>${esc(link.result)}</strong></div><p>${esc(link.explanation)}</p>${link.id==='rhythm-harvest'?'<button type="button" class="secondary" data-combo-lesson="rhythm-harvest">Try combo</button>':''}<p class="deck-context-note">${esc(link.note)}</p><button type="button" class="deck-context-close" data-deck-context-close>Close explanation</button></section>`).join('');
  const ids=[...new Set([...(run.artifacts||[]),...(cards.some(card=>card?.kind==='ring-spring')?['dawn-loom','overflow-coil']:[])])];
  return `<aside class="deck-context" aria-label="Selected card and linked effects">${selected}${combos}${ids.map(id=>relicPanel(run,id,links)).join('')}</aside>`;
}

/** Only decorate rules whose real mounted arrangement supplies a known link. */
export function deckLinkedCardFace(face,run,slot){
  const links=getDeckComboLinks(run),source=links.find(link=>link.sourceSlot===slot),target=links.find(link=>link.targetSlot===slot);
  if(source)face=face.replace('class="card-rule-stripe card-rule-effect"','class="card-rule-stripe card-rule-effect deck-linked-rule" role="button" tabindex="0" data-deck-context-open="combo:'+source.id+'" aria-label="'+esc(source.sourceText)+'. Explain '+esc(source.name)+'"');
  if(target)face=face.replace('class="card-rule-stripe card-rule-condition"','class="card-rule-stripe card-rule-condition deck-linked-condition" data-deck-link-target="'+target.id+'"');
  return face;
}

export function deckSwapComboMarkup(before,after,incoming){
  const next=getMountedCards(after),statuses=getEquippedCardStatuses(after),beforeLinks=getDeckComboLinks(before),afterLinks=getDeckComboLinks(after),lines=[];
  for(const link of afterLinks)if(!beforeLinks.some(previous=>previous.id===link.id))lines.push(`<p class="deck-swap-gain"><strong>Connects ${esc(link.name)}.</strong> ${esc(link.explanation)}</p>`);
  for(const link of beforeLinks)if(!afterLinks.some(next=>next.id===link.id))lines.push(`<p class="deck-swap-warning"><strong>Breaks ${esc(link.name)}.</strong> ${link.id==='rhythm-harvest'?'This row loses its Rhythm-to-Harvest connection.':'Dawn Loom no longer has a Ring Spring trigger in this row.'}</p>`);
  const placedSlot=next.findIndex(card=>card?.instanceId===incoming?.instanceId),placed=next[placedSlot];
  if(placed?.kind==='toll-bell'){
    const status=statuses[placedSlot],trace=previewCardRowEvent(after.mountedCards,{kind:CARD_ROW_EVENTS.rhythm});
    const step=trace.steps.find(step=>step.slot===placedSlot&&step.success);
    lines.push(`<p class="${status?.state==='blocked'?'deck-swap-warning':'deck-swap-gain'}"><strong>${esc(status?.label)}.</strong> ${status?.state==='blocked'?esc(status.reason):`3 evenly timed Lifts also give +${number(step?.amount)} Sparks from Toll Bell.`}</p>`);
  }
  next.forEach((card,slot)=>{if(!card||!['echo','chameleon'].includes(card.kind))return;const previous=getMountedCards(before).find(old=>old?.instanceId===card.instanceId);if(card.instanceId===incoming?.instanceId||card.copyPreview!==previous?.copyPreview)lines.push(`<p class="deck-swap-copy"><strong>Slot ${slot+1} · ${esc(card.name)} → ${esc(next[slot+1]?.name||'empty slot')}.</strong> ${esc(card.copyPreview)}${statuses[slot]?.state==='blocked'?` ${esc(statuses[slot].reason)}`:''}</p>`);});
  next.forEach((card,slot)=>{if(!card||!['use-doubler','ember-feeder','devourer'].includes(card.kind))return;const previous=getMountedCards(before).find(old=>old?.instanceId===card.instanceId);if(card.instanceId===incoming?.instanceId||card.effectiveSummary!==previous?.effectiveSummary)lines.push(`<p class="${statuses[slot]?.state==='blocked'?'deck-swap-warning':'deck-swap-copy'}"><strong>Slot ${slot+1} · ${esc(card.name)}.</strong> ${esc(card.effectiveSummary)}${statuses[slot]?.state==='blocked'?` ${esc(statuses[slot].fix)}`:''}</p>`);});
  return lines.length?`<div class="deck-swap-combos" aria-label="Combo changes before equipping">${lines.join('')}</div>`:'';
}

if(typeof document!=='undefined'){
  const show=(root,key)=>{
    const panel=[...root.querySelectorAll('[data-deck-context]')].find(panel=>panel.dataset.deckContext===key);if(!panel)return;
    root.querySelectorAll('[data-deck-context]').forEach(node=>node.hidden=node!==panel);
    root.classList.add('deck-context-open');
    root.querySelectorAll('.deck-combo-source,.deck-combo-target').forEach(node=>node.classList.remove('deck-combo-source','deck-combo-target'));
    if(panel.dataset.comboSourceSlot!==undefined)root.querySelector(`[data-deck-mounted-slot="${panel.dataset.comboSourceSlot}"] .card-rule-effect`)?.classList.add('deck-combo-source');
    if(panel.dataset.comboTargetSlot!==undefined)root.querySelector(`[data-deck-mounted-slot="${panel.dataset.comboTargetSlot}"] .card-rule-condition`)?.classList.add('deck-combo-target');
    if(panel.dataset.comboTargetRelic)root.querySelector(`[data-deck-relic="${panel.dataset.comboTargetRelic}"]`)?.classList.add('deck-combo-target');
  };
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-card-term],[data-card-term-trigger],[data-card-status-help]'))return;
    const opener=event.target.closest?.('[data-deck-context-open]'),close=event.target.closest?.('[data-deck-context-close]'),root=(opener||close)?.closest('.card-equipped-foreground');
    if(!root)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(opener)show(root,opener.dataset.deckContextOpen);
    else{const selected=root.querySelector('[data-deck-context="selected"]');if(selected)show(root,'selected');else{root.classList.remove('deck-context-open');root.querySelectorAll('[data-deck-context]').forEach(node=>node.hidden=true);}root.querySelectorAll('.deck-combo-source,.deck-combo-target').forEach(node=>node.classList.remove('deck-combo-source','deck-combo-target'));}
  },true);
  document.addEventListener('keydown',event=>{if(event.target.closest?.('[data-card-term],[data-card-term-trigger]'))return;const target=event.target.closest?.('[data-deck-context-open][role="button"]');if(target&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();target.click();}},true);
}
