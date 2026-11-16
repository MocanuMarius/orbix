/** Small, read-only explanations for the actual equipped row. */
import {SKILL_CARDS, getMountedCards, getEffectiveCardSources, previewCardRowEvent, CARD_ROW_EVENTS} from './skill-cards.mjs?v=combo-camp-1';
import {getEquippedCardStatuses} from './card-status.mjs?v=combo-camp-1';
import {ARTIFACTS} from './model.mjs?v=combo-camp-1';
import {artifactDescription} from './artifact-copy.mjs?v=combo-camp-1';
import {artifactPixelPortrait} from './artifact-pixel-art.mjs?v=combo-camp-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number(Number(value||0).toFixed(3));
const contextButton=(key,label,extra='')=>`<button type="button" class="deck-context-link" data-deck-context-open="${esc(key)}" ${extra}>${esc(label)} <span aria-hidden="true">↗</span></button>`;

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
      sourceText:'Send out one wave',targetText:'Wave crosses a Spark',result:`+${number(step?.amount)} on crossing`,
      explanation:'3 evenly timed Lifts start the wave. Harvest leaves the crossed pickup in place.',
      note:'Either slot order works. A wave must reach a Spark; making the wave alone gives no Harvest payout.'});
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

export function deckContextMarkup(run,{card=null,locked=false}={}){
  const cards=getMountedCards(run),statuses=getEquippedCardStatuses(run),links=getDeckComboLinks(run);
  const relevant=card?links.filter(link=>link.sourceSlot===card.slot||link.targetSlot===card.slot):[];
  const status=card?.mounted?statuses[card.slot]:null;
  const selected=card?.mounted?`<section class="deck-context-panel" data-deck-context="selected"><small>SLOT ${card.slot+1} · ${esc(status?.label||'Equipped')}</small><h3>${esc(card.name)}</h3>${relevant.length?relevant.map(link=>`${contextButton(`combo:${link.id}`,link.name)}<p>${esc(link.result)}</p>`).join(''):`<p>${esc(status?.reason||card.effect)}</p>`}${card.copyPreview?`<p class="deck-copy-target"><strong>Immediate right</strong><br>${esc(card.copyPreview)}</p>`:''}${relatedMarkup(run,card)}<div class="deck-selected-actions"><button class="secondary" data-action="card-equip" ${locked?'disabled':''}>Move</button><button class="secondary" data-action="card-inspect" data-id="${esc(card.instanceId)}">Inspect</button></div><button type="button" class="deck-context-close" data-action="card-cancel-equip">Cancel selection</button></section>`:'';
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
    else{root.classList.remove('deck-context-open');root.querySelectorAll('[data-deck-context]').forEach(node=>node.hidden=true);root.querySelectorAll('.deck-combo-source,.deck-combo-target').forEach(node=>node.classList.remove('deck-combo-source','deck-combo-target'));}
  },true);
  document.addEventListener('keydown',event=>{if(event.target.closest?.('[data-card-term],[data-card-term-trigger]'))return;const target=event.target.closest?.('[data-deck-context-open][role="button"]');if(target&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();target.click();}},true);
}
