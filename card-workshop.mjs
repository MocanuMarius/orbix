import {getOwnedCards,getCardImprovePreview,getCardRefillPreview,getCardForgePreview,canUseCardCampServices} from './model.mjs?v=gpu-1';
import {cardFace,cardName} from './card-ui.mjs?v=gpu-1';
import {resourceSymbol} from './game-symbols.mjs?v=gpu-1';
import {uiIcon} from './ui-icons.mjs?v=gpu-1';
import {CARD_FORGE_RARITIES} from './skill-cards.mjs?v=gpu-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const wallet=run=>`<span class="card-bench-wallet">${resourceSymbol('packed')} ${Math.floor(run.condensedGlow||0)}<small>Stored Sparks</small></span>`;
const offer=(card,preview,action,detail,label)=>`<button class="secondary card-workshop-offer ${preview.eligible?'':'card-workshop-unavailable'}" data-action="${action}" data-id="${esc(card.instanceId)}"><strong>${esc(cardName(card))}</strong><span>${detail}</span><b>${esc(label)}</b>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</button>`;

/** The same owned-card quotes used by each confirmation, presented together. */
export function cardWorkshopMarkup(run,{notice='',only=null}={}) {
  if(!canUseCardCampServices(run))return '';
  const owned=getOwnedCards(run), improvements=owned.map(card=>({card,preview:getCardImprovePreview(run,card.instanceId)})).filter(({preview})=>preview.kind),
    refills=owned.map(card=>({card,preview:getCardRefillPreview(run,card.instanceId)})).filter(({preview})=>preview.supported),
    forges=CARD_FORGE_RARITIES.map(rarity=>getCardForgePreview(run,rarity));
  const tier=rarity=>rarity[0].toUpperCase()+rarity.slice(1),show=id=>!only||only===id,title={improve:'Improve a card',refill:'Refill uses'}[only]||'Workshop';
  return `<section class="card-workshop${only?' card-workshop-single':''}"><header class="card-heading"><button class="secondary card-back" data-action="card-workshop-back">Back to Rest</button><div><small>${only?'SPEND STORED SPARKS':'AT REST · NO REST ACTION'}</small><h2>${title}</h2></div>${wallet(run)}</header><div class="card-workshop-services">
    ${show('improve')?`<article><header><h3 class="rest-action-icon">${uiIcon('rest-improve',{size:32})}<span>Improve / Evolve</span></h3><p>Strengthen a card you own.<br>Evolve: 25 into Rare, 150 into Legendary.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Owned cards to improve">${improvements.map(({card,preview})=>offer(card,preview,'card-workshop-improve',`${esc(cardName(preview.after))} · rank ${card.rank} → ${preview.after.rank}`,`${preview.kind==='evolution'?'Evolve':'Improve'} · ${preview.price}`)).join('')||'<p class="card-workshop-empty">Your cards are at their highest rank. Find or Forge another card.</p>'}</div></article>`:''}
    ${show('refill')?`<article><header><h3 class="rest-action-icon">${uiIcon('rest-refill',{size:32})}<span>Refill</span></h3><p>Restore uses on an owned card.<br>Pay only for missing uses.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Owned cards to refill">${refills.map(({card,preview})=>offer(card,preview,'card-workshop-refill',`Uses ${card.charges} → ${preview.maximum}`,preview.missing?`Refill · ${preview.price}`:'Full')).join('')||'<p class="card-workshop-empty">No refillable card owned. Consumed and one-use cards cannot be refilled.</p>'}</div></article>`:''}
    ${show('forge')&&!only?`<article><header><h3 class="rest-action-icon">${uiIcon('rest-forge',{size:32})}<span>Forge</span></h3><p>Pay for a surprise card.<br>Each forge here raises that price by half.</p></header><div class="card-workshop-list" tabindex="0" aria-label="Forge prices">${forges.map(preview=>`<button class="secondary card-workshop-offer ${preview.eligible?'':'card-workshop-unavailable'}" data-action="card-workshop-forge" data-rarity="${preview.rarity}"><strong>Surprise ${tier(preview.rarity)} card</strong><span>Revealed after you pay · then ${preview.nextPrice}</span><b>Forge · ${preview.price}</b>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</button>`).join('')}</div></article>`:''}
  </div>${notice?`<p class="card-workshop-notice" role="status">${esc(notice)}</p>`:''}<footer class="card-dialog-actions"><p>Improve and Refill show the result first. Forge reveals its card after you pay.</p></footer></section>`;
}

export function cardRefillMarkup(run,preview) {
  const card=preview.before;
  if(!card)return '';
  return `<section class="card-exchange card-refill-confirm"><header class="card-heading"><button class="secondary card-back" data-action="card-workshop">Back to Workshop</button><div><small>RESTORE THIS CARD'S USES</small><h2>Refill ${esc(cardName(card))}?</h2></div>${wallet(run)}</header><div class="card-exchange-body"><div class="card-forge-card">${cardFace(card)}</div><div class="card-exchange-result"><h3>Uses ${card.charges} → ${preview.maximum}</h3><strong>Costs ${preview.price} Stored Sparks</strong><p>Same card, rank and ability. No Rest action.</p>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</div></div><footer class="card-dialog-actions"><button class="primary" data-action="card-confirm-refill" data-id="${esc(card.instanceId)}" data-token="${esc(preview.token)}" ${preview.eligible?'':'disabled'}>Refill · ${preview.price}</button></footer></section>`;
}
