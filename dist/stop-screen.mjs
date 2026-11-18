// One screen for every event and chest stop (owner request 2026-11-18, JOB E), in the house parchment style of Rest and the Workshop:
// a header with the stop's name and status chips, the stop's picture whole at the left, and the options as large equal tiles side by side.
// Tap-to-pick (tap-pick.mjs): the first tap selects, the second takes. A disabled option stays on screen with its reason. Never scrolls.
// Pure markup; the handlers live in app.mjs (data-action="support" index N, "chest-choice" id, "event-card" id, "event-pick-back").
import {resourceSymbol} from './game-symbols.mjs?v=guide-clarity-1';
import {livesMarkup} from './lives.mjs?v=guide-clarity-1';
import {uiIcon} from './ui-icons.mjs?v=guide-clarity-1';
import {cardArt} from './card-art.mjs?v=guide-clarity-1';
import {getGlowCapacity,getLifeCapacity,formatGlow} from './vitality.mjs?v=guide-clarity-1';
import {oathShort} from './oaths.mjs?v=guide-clarity-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=guide-clarity-1';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=guide-clarity-1';
import {chestSparks,CHEST_CARD_LINE,describeChestFind} from './treasure.mjs?v=guide-clarity-1';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const STOP_HINT='Tap an option, tap again to take it.';

/** Status chips: hearts, Spark Meter, Stored Sparks. */
export function stopChips(run){
 const max=getLifeCapacity(run),cap=getGlowCapacity(run);
 return `<ul class="rest2-chips" aria-label="Status"><li class="rest2-chip" aria-label="Hearts ${run.lives} of ${max}">${livesMarkup(run)}</li><li class="rest2-chip" aria-label="Spark Meter ${formatGlow(run.flame)} of ${formatGlow(cap)}">${resourceSymbol('glow')}<b>${formatGlow(run.flame)}/${formatGlow(cap)}</b></li></ul>`; // Stored Sparks show once, in the app bar's chip
}
/** Approved icons are sized only through --ui-size (ui-icons.css), always a whole multiple of their grid: show them at 48. */
const big=s=>String(s).replace(/--ui-size:\d+px/g,'--ui-size:48px').replace(/(<svg[^>]*?) width="\d+" height="\d+"/,'$1 width="48" height="48"');
/** One option tile: picture, title, one short line. `off` keeps it visible with its reason and no action. */
export function stopTile({icon,title,line,off='',action,attrs='',aria=''}){
 const body=`<span class="stop2-ico" aria-hidden="true">${big(icon)}</span><b class="stop2-name">${esc(title)}</b><span class="stop2-line">${esc(line)}</span>${off?`<em class="stop2-why">${esc(off)}</em>`:''}`;
 const label=esc(aria||`${title}: ${off||line}`);
 return off?`<button type="button" class="stop2-tile is-off" aria-disabled="true" aria-label="${label}">${body}</button>`
  :`<button type="button" class="stop2-tile" data-tap-pick data-action="${action}" ${attrs} aria-pressed="false" aria-label="${label}">${body}</button>`;
}
/** The shell: header (name, chips), picture, body. `main` is the tiles (or the card pick). */
export function stopScreen({run,name,art,found='',hint=STOP_HINT,kind,count=2,main,back=''}){
 return `<section class="rest2 stop2 wb-ground" data-stop="${esc(kind)}" aria-label="${esc(name)}"><header class="rest2-head"><h1 class="rest2-place">${esc(name)}<small>Map ${run.mapIndex+1}/3</small></h1>${stopChips(run)}<div class="rest2-head-end">${back}</div></header>
 <div class="stop2-body"><figure class="stop2-art"><div class="stop2-art-pic" aria-hidden="true">${art}</div>${found}</figure><div class="stop2-main"><p class="stop2-hint">${esc(hint)}</p>${main}</div></div></section>`;
}
export const stopTiles=(tiles,count=tiles.length)=>`<div class="stop2-tiles" data-tap-pick-group data-count="${count}">${tiles.join('')}</div>`;

/** "Found: <picture> <name>" and one short line (linked words dotted), under the chest picture. */
export function foundMarkup(id){
 const f=id&&describeChestFind(id);if(!f)return '';
 const pic=f.inscription?inscriptionGlyph(f.glyph,{size:24,role:'presentation'}):uiIcon('meter-cap',{size:32});
 return `<figcaption class="stop2-found"><span class="stop2-found-head"><small>Found</small><span class="stop2-found-pic" aria-hidden="true">${pic}</span><b>${esc(f.name)}</b></span><span class="stop2-found-line">${cardTermTextMarkup(f.line)}</span></figcaption>`;
}
/** The chest: Stored Sparks or a surprise card, nothing else. */
export function chestStopMarkup(run,{art='',node=run.current}={}){
 const p=run.pendingChest;
 const tiles=[
  stopTile({icon:uiIcon('stored',{size:48}),title:`+${p.sparks} Stored Sparks`,line:'Taken now. Spend them at Rest.',action:'chest-choice',attrs:'data-id="sparks"'}),
  stopTile({icon:uiIcon('rest-forge',{size:48}),title:'A surprise card',line:'Free, straight to your Deck.',action:'chest-choice',attrs:'data-id="card"'})];
 return stopScreen({run,name:node?.name||'Chest',art,found:foundMarkup(p.find),kind:'chest',hint:p.find?'Take one gift; the other stays behind. The find is yours either way.':'The chest holds two gifts. Take one; the other stays behind.',main:stopTiles(tiles)});
}
export const chestPreviewLine=mapIndex=>`Choose: +${chestSparks(mapIndex)} Stored Sparks or ${CHEST_CARD_LINE}`;

/** The ONE short line of a tile: a wager's short form, the first sentence of a Marked Passage, else up to two short sentences. */
export function tileLine(run,c,count=2){
 const text=String(c.description||'');
 if(c.effect?.oath)return oathShort(run,c.effect.oath);
 const sentences=text.match(/[^.!?]+[.!?]+/g)?.map(s=>s.trim())||[text];
 if(c.effect?.routePreparation)return sentences[0]+(count>2?' Closes the other path.':'');
 return sentences.length>1&&(sentences[0]+' '+sentences[1]).length<=80?sentences[0]+' '+sentences[1]:sentences[0];
}
/** A picture for an outcome, from the approved icon set (never a retired skill or relic picture). */
export function outcomeIcon(c){
 const e=c.effect||{},name=e.improveCard?'rest-improve':e.refillCard?'rest-refill':e.eventCard||c.art==='card'?'rest-forge':e.lives?'heart-full':e.packedReward?'stored':e.flame?'rest-recover':e.routePreparation?'map':e.oath?(c.art==='companion'?'collector':'luminance'):e.dice?'spark':'spark';
 return uiIcon(name,{size:48});
}
/** An event with 2 options (3 for the Marked Passage). `icons(choice)` gives each tile its picture. */
export function eventStopMarkup(run,node,choices,{art='',icon=outcomeIcon}={}){
 const tiles=choices.map((c,i)=>stopTile({icon:icon(c),title:c.title,line:c.disabled?'':tileLine(run,c,choices.length),off:c.disabled?(c.disabledReason||c.description):'',action:'support',attrs:`data-index="${i}"`}));
 return stopScreen({run,name:node.name,art,kind:'event',count:choices.length,main:stopTiles(tiles)});
}
/** The card pick that follows Improve a card / Refill a card, on the same screen. */
export function eventCardStopMarkup(run,node,kind,cards,{art=''}={}){
 const improve=kind==='improve';
 const tiles=cards.map(c=>`<button type="button" class="stop2-card" data-tap-pick data-action="event-card" data-id="${esc(c.instanceId)}" aria-pressed="false" aria-label="${esc(c.name)}: ${esc(c.change)}"><span class="stop2-card-art" aria-hidden="true">${cardArt({...c.card,cardId:c.cardId},{compact:true})}</span><b>${esc(c.name)}</b><small>${esc(c.change)}</small><i>${c.slot===null?'Deck':'Slot '+(c.slot+1)}</i></button>`);
 const back=`<button type="button" class="rest2-btn" data-action="event-pick-back">Back</button>`;
 return stopScreen({run,name:improve?'Which card rises?':'Which card refills?',art,kind:`event-${kind}`,hint:improve?'Tap a card, tap again to take it. It gains a rank or evolves. Free.':'Tap a card, tap again to take it. Its uses return. Free.',main:`<div class="stop2-cards" data-tap-pick-group data-count="${tiles.length}">${tiles.join('')}</div>`,back});
}
