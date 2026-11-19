import {getCardImprovePreview,getCardRefillPreview,getCardForgePreview,canUseCardCampServices,eventCardOptions} from './model.mjs?v=noflag-1';
import {cardArt} from './card-art.mjs?v=noflag-1';
import {cardFace,cardName} from './card-ui.mjs?v=noflag-1';
import {resourceSymbol} from './game-symbols.mjs?v=noflag-1';
import {uiIcon} from './ui-icons.mjs?v=noflag-1';
import {CARD_FORGE_RARITIES} from './skill-cards.mjs?v=noflag-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const wallet=run=>`<span class="card-bench-wallet">${resourceSymbol('packed')} ${Math.floor(run.condensedGlow||0)}<small>Stored Sparks</small></span>`;
const tier=rarity=>rarity[0].toUpperCase()+rarity.slice(1);
const spark=n=>`${resourceSymbol('packed')}<b>${n}</b>`;
const plainPrice=(lo,hi)=>lo===hi?`${lo}`:`${lo} to ${hi}`;
const range=(lo,hi)=>lo===hi?spark(lo):`${spark(lo)}<span class="wk-dash" aria-hidden="true">–</span>${spark(hi)}`;

/** The Workshop's three services, each with its offers (the same quotes the confirmations use). Pure data, shared by the hub and the picks. */
export function workshopServices(run) {
  const services=canUseCardCampServices(run),stored=Math.floor(run.condensedGlow||0);
  const improve=services?eventCardOptions(run,'improve').map(o=>({...o,preview:getCardImprovePreview(run,o.instanceId)})):[],
    refill=services?eventCardOptions(run,'refill').map(o=>({...o,preview:getCardRefillPreview(run,o.instanceId)})):[],
    forge=services?CARD_FORGE_RARITIES.map(rarity=>getCardForgePreview(run,rarity)):[];
  const make=(id,icon,title,line,offers,none)=>{
    const prices=offers.map(o=>Math.floor((o.preview||o).price||0)),lo=prices.length?Math.min(...prices):null,hi=prices.length?Math.max(...prices):null;
    const ok=services&&offers.length>0&&stored>=lo;
    return {id,icon,title,line,lo,hi,ok,openable:services,reason:!services?'Not available now':!offers.length?none:ok?'':`Needs ${lo-stored} more`};
  };
  return {stored,services,improve,refill,forge,list:[
    make('improve','rest-improve','Improve','Rank up a card or evolve it',improve,'All cards at top rank'),
    make('refill','rest-refill','Refill','Restore a card’s uses',refill,'No card needs refilling'),
    make('forge','rest-forge','Forge','A surprise new card',forge,'Nothing to forge'),
  ]};
}

const hubTile=t=>`<button type="button" class="wk-tile${t.ok?'':' wk-off'}" data-action="card-workshop" data-service="${t.id}" data-wk-service="${t.id}"${t.openable?'':' disabled aria-disabled="true"'} aria-label="${esc(`${t.title}${t.lo!=null?`, ${plainPrice(t.lo,t.hi)} Stored Sparks`:''}: ${t.ok?t.line:t.reason}`)}">
 <span class="wk-ico" aria-hidden="true">${uiIcon(t.icon,{size:44})}</span><b class="wk-name">${esc(t.title)}</b><span class="wk-line">${esc(t.line)}</span>
 <span class="wk-price">${t.lo!=null?range(t.lo,t.hi):''}</span>${t.ok?'':`<small class="wk-why">${esc(t.reason)}</small>`}</button>`;

const needText=(price,stored)=>`Needs ${Math.max(1,Math.ceil(price-stored))} more Stored Sparks`;
const pickTile=(o,action,label,price,ok,reason,extra='')=>`<button type="button" class="wk-pick${ok?'':' wk-off'}" ${ok?'data-tap-pick':'disabled aria-disabled="true"'} data-action="${action}" ${extra} aria-label="${esc(`${o.name}: ${o.change}, ${price} Stored Sparks${ok?'':`. ${reason}`}`)}">
 <span class="wk-art" aria-hidden="true">${o.art}</span><b>${esc(o.name)}</b><small>${esc(o.change)}</small><i class="wk-cost">${esc(label)} ${spark(price)}</i>${ok?'':`<em class="wk-why">${esc(reason)}</em>`}</button>`;

/** The Workshop: three large tiles (Improve, Refill, Forge). Tapping one swaps the same screen for its offers; Back returns to the tiles.
 * `view` is 'hub' (default), 'improve', 'refill' or 'forge'; `only` is the older name for the same choice. */
export function cardWorkshopMarkup(run,{notice='',only=null,view=null}={}) {
  if(!canUseCardCampServices(run))return '';
  const mode=['improve','refill','forge'].includes(view||only)?(view||only):'hub',data=workshopServices(run);
  const wallet=`<span class="card-bench-wallet">${resourceSymbol('packed')} ${data.stored}<small>Stored Sparks</small></span>`;
  const noticeLine=notice?`<p class="card-workshop-notice" role="status">${esc(notice)}</p>`:'';
  if(mode==='hub')return `<section class="card-workshop wk" data-wk="hub"><header class="card-heading"><button class="secondary card-back" data-action="card-workshop-back">Back to Rest</button><div><small>AT REST · NO REST ACTION</small><h2>Workshop</h2></div>${wallet}</header>
  <div class="wk-tiles">${data.list.map(hubTile).join('')}</div>${noticeLine}</section>`;
  const title={improve:'Improve a card',refill:'Refill a card',forge:'Forge a card'}[mode];
  const why=p=>/enough Stored Sparks/i.test(p.reason||'')?needText(p.price||0,data.stored):(p.reason||'');
  let tiles;
  if(mode==='improve')tiles=data.improve.map(o=>{const p=o.preview,price=Math.floor(p.price||0);
    return pickTile({...o,change:p.kind==='evolution'?`${o.change} · ${price}`:o.change,art:cardArt({...o.card,cardId:o.cardId},{compact:true})},'card-workshop-improve',p.kind==='evolution'?'Evolve':'Improve',price,!!p.eligible,why(p),`data-id="${esc(o.instanceId)}"`);});
  else if(mode==='refill')tiles=data.refill.map(o=>{const p=o.preview,price=Math.floor(p.price||0);
    return pickTile({...o,art:cardArt({...o.card,cardId:o.cardId},{compact:true})},'card-workshop-refill','Refill',price,!!p.eligible,why(p),`data-id="${esc(o.instanceId)}"`);});
  else tiles=data.forge.map(p=>pickTile({name:`Surprise ${tier(p.rarity)} card`,change:`Revealed after you pay · next ${Math.floor(p.nextPrice||0)}`,art:uiIcon('rest-forge',{size:34})},'card-workshop-forge','Forge',Math.floor(p.price||0),!!p.eligible,why(p),`data-rarity="${p.rarity}"`));
  const empty=!tiles.length?`<p class="card-workshop-empty">${esc(data.list.find(t=>t.id===mode).reason)}</p>`:'';
  return `<section class="card-workshop wk" data-wk="${mode}"><header class="card-heading"><button class="secondary card-back" data-action="card-workshop-hub">Back</button><div><small>TAP A CARD, TAP AGAIN TO TAKE IT</small><h2>${title}</h2></div>${wallet}</header>
  ${noticeLine}<div class="wk-picks" data-tap-pick-group data-count="${tiles.length}">${tiles.join('')}${empty}</div></section>`;
}

export function cardRefillMarkup(run,preview) {
  const card=preview.before;
  if(!card)return '';
  return `<section class="card-exchange card-refill-confirm"><header class="card-heading"><button class="secondary card-back" data-action="card-workshop">Back to Workshop</button><div><small>RESTORE THIS CARD'S USES</small><h2>Refill ${esc(cardName(card))}?</h2></div>${wallet(run)}</header><div class="card-exchange-body"><div class="card-forge-card">${cardFace(card)}</div><div class="card-exchange-result"><h3>Uses ${card.charges} → ${preview.maximum}</h3><strong>Costs ${preview.price} Stored Sparks</strong><p>Same card, rank and ability. No Rest action.</p>${preview.eligible?'':`<small>${esc(preview.reason)}</small>`}</div></div><footer class="card-dialog-actions"><button class="primary" data-action="card-confirm-refill" data-id="${esc(card.instanceId)}" data-token="${esc(preview.token)}" ${preview.eligible?'':'disabled'}>Refill · ${preview.price}</button></footer></section>`;
}
