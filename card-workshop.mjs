import {getOwnedCards,getCardImprovePreview,getCardRefillPreview,getCardForgePreview,canUseCardCampServices} from './model.mjs?v=collector-cards-1';
import {cardFace,cardName} from './card-ui.mjs?v=collector-cards-1';
import {resourceSymbol} from './game-symbols.mjs?v=collector-cards-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const wallet=run=>`<span class="card-bench-wallet">${resourceSymbol('packed')} ${Math.floor(run.condensedGlow||0)}<small>Stored Sparks</small></span>`;
const offer=(card,preview,action,detail,label)=>`<button class="secondary card-workshop-offer ${preview.eligible?'':'card-workshop-unavailable'}" data-action="${action}" data-id="${esc(card.instanceId)}"><strong>${esc(cardName(card))}</strong><span>${detail}</span><b>${esc(label)}</b>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</button>`;

/** The same owned-card quotes used by each confirmation, presented together. */
export function cardWorkshopMarkup(run,{notice=''}={}) {
  if(!canUseCardCampServices(run))return '';
  const owned=getOwnedCards(run), improvements=owned.map(card=>({card,preview:getCardImprovePreview(run,card.instanceId)})).filter(({preview})=>preview.kind),
    refills=owned.map(card=>({card,preview:getCardRefillPreview(run,card.instanceId)})).filter(({preview})=>preview.supported),
    forges=['rare','legendary'].map(rarity=>getCardForgePreview(run,rarity));
  return `<section class="card-workshop"><header class="card-heading"><div><small>AT REST · NO REST ACTION</small><h2>Workshop</h2></div>${wallet(run)}</header><div class="card-workshop-services">
    <article><header><h3>Improve / Evolve</h3><p>Strengthen a card you own.<br>Remaining uses stay.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Owned cards to improve">${improvements.map(({card,preview})=>offer(card,preview,'card-workshop-improve',`${esc(cardName(preview.after))} · rank ${card.rank} → ${preview.after.rank}`,`${preview.kind==='evolution'?'Evolve':'Improve'} · ${preview.price}`)).join('')||'<p class="card-workshop-empty">Your cards are at their highest rank. Find or Forge another card.</p>'}</div></article>
    <article><header><h3>Refill</h3><p>Restore uses on an owned card.<br>Pay only for missing uses.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Owned cards to refill">${refills.map(({card,preview})=>offer(card,preview,'card-workshop-refill',`Uses ${card.charges} → ${preview.maximum}`,preview.missing?`Refill · ${preview.price}`:'Full')).join('')||'<p class="card-workshop-empty">No refillable card owned. Consumed and one-use cards cannot be refilled.</p>'}</div></article>
    <article><header><h3>Forge</h3><p>Add a shown new card to Deck.<br>Keep your owned cards.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Visible Forge offers">${forges.map(preview=>`<button class="secondary card-workshop-offer ${preview.eligible?'':'card-workshop-unavailable'}" data-action="card-workshop-forge" data-rarity="${preview.rarity}"><strong>${esc(cardName(preview.card))}</strong><span>${preview.rarity==='rare'?'Rare':'Legendary'} · new card</span><b>Review · ${preview.price}</b>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</button>`).join('')}</div></article>
  </div>${notice?`<p class="card-workshop-notice" role="status">${esc(notice)}</p>`:''}<footer class="card-dialog-actions"><p>Choose a named card, review its rules, then confirm.</p><button class="primary" data-action="card-workshop-back">Back to Rest</button></footer></section>`;
}

export function cardRefillMarkup(run,preview) {
  const card=preview.before;
  if(!card)return '';
  return `<section class="card-exchange card-refill-confirm"><header class="card-heading"><div><small>RESTORE THIS CARD'S USES</small><h2>Refill ${esc(cardName(card))}?</h2></div>${wallet(run)}</header><div class="card-exchange-body"><div class="card-forge-card">${cardFace(card)}</div><div class="card-exchange-result"><h3>Uses ${card.charges} → ${preview.maximum}</h3><strong>−${preview.price} Stored Sparks</strong><p>${preview.missing} missing ${preview.missing===1?'use':'uses'} · full refill price ${preview.fullPrice}, prorated and rounded up.</p><p>Same card, rank and ability. No Rest action.</p><small>${preview.eligible?`Wallet ${Math.floor(run.condensedGlow)} → ${Math.floor(run.condensedGlow)-preview.price}`:esc(preview.reason)}</small></div></div><footer class="card-dialog-actions"><button class="secondary" data-action="card-workshop">Back to Workshop</button><button class="primary" data-action="card-confirm-refill" data-id="${esc(card.instanceId)}" data-token="${esc(preview.token)}" ${preview.eligible?'':'disabled'}>Refill · ${preview.price} →</button></footer></section>`;
}
