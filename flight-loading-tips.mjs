import {selectDepartureTip,tipIcon} from './depart-tips.mjs?v=rates-1';
import {art} from './depart-art.mjs?v=rates-1';

// The paused "Ready to depart" field note (look v1.0-depart-A). Tips, picker and history live in depart-tips.mjs,
// the pictures in depart-art.mjs. Every slot has a fixed size in flight-loading-tips.css, so a different tip,
// picture or loading state never moves anything.
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** One selection per departure. Returns null when tips are switched off. */
export function selectFlightLoadingTip({run,node,profile,showTips=true,storage,rand}={}){
 return selectDepartureTip({run,node,profile,showTips,...(storage?{storage}:{}),...(rand?{rand}:{})});
}

/** The page: label and count, picture, context line, headline, sentence and the reserved Lift line.
 *  With no selection the same slots are drawn empty, so tips on or off never changes the layout. */
export function renderFlightLoadingTip(selection,courseName=''){
 const tip=selection?.tip,biomeId=tip?.context?.startsWith('biome:')?tip.context.slice(6).split(/[&|]/)[0]:null;
 return `<header class="entry-top"><span class="entry-kind">Field note${courseName?` · <b class="entry-course">${esc(courseName)}</b>`:''}</span><span class="entry-count">${tip?`Note ${selection.note} of ${selection.total}`:''}</span></header>`
  +`<div class="entry-body"><div class="entry-pic" aria-hidden="true">${art(tip?tipIcon(tip):'lantern',{biome:biomeId})}</div>`
  +`<div class="entry-copy" data-flight-loading-tip="${esc(tip?.id||'none')}"><span class="entry-why">${esc(tip?selection.why:'')}</span><h2 class="entry-head">${esc(tip?tip.headline:'Ready when you are')}</h2><p class="entry-text">${esc(tip?tip.text:'')}</p>`
  +`<p class="entry-lift" data-entry-note>${selection?.liftHint?'Tap again in flight to Lift.':''}</p></div></div>`;
}
