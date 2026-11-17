import {pickupArtSvg} from './pickup-art.mjs?v=reskin-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=reskin-1';
const art={
 gilded:['#f2c76c','M4 6h10v2H4zm-1 4h12v2H3zm1 4h10v2H4z'],
 'three-suns':['#f6979c','M3 5h4v2h2V5h4v2h2v4h-2v2h-2v2H9v2H7v-2H5v-2H3v-2H1V7h2z'],
 precision:['#f4cd8c','M7 2h2v4H7zm0 10h2v4H7zM1 8h4v2H1zm10 0h4v2h-4zM7 8h2v2H7z'],
 'wild-circuit':['#90d7aa','M2 12h2v-2h2V7h2V5h4V3h3v5h-2v3H9v2H5v2H2z'],
 'flash-relay':['#f6dea2','M9 1h5l-4 6h4l-9 9 2-7H3z'],
 'long-glide':['#9ad5e5','M2 5h4v2h4V5h5v2h-3v2H9v3H7v-2H5V8H2zM3 13h4v2H3z'],
 edgeweaver:['#a8cbef','M2 3h4V2h4v1h4v7h-2v3h-2v2H8v2H6v-3H4v-3H2z'],
 'night-sail':['#c9a5df','M2 7h2V5h3V3h5v2h2v3h-2v3H9v2H5v-2H2zm4 0v3h4V7z'],
 wayfinder:['#b4d9bd','M8 1l6 7-6 8-6-8zM8 5L5 9l3 3z'],
 'spark-trail':['#d4d68c','M1 12h3v3H1zm4-4h4v4H5zm5-6h4v2h2v5h-2v2h-4V9H8V4h2z'],
 constellation:['#e8c88c','M1 10h4v4H1zM6 6h4v4H6zm6-4h4v4h-4zM5 9h2v2H5zm5-5h2v3h-2z']
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bonusIcon(id) {
 const artId=art[id]?id:ROUTE_BONUSES[id]?.boonId,pair=art[artId];
 if(!pair)return '';
 const central=artId==='flash-relay'||artId==='spark-trail'
   ? pickupArtSvg(artId==='flash-relay'?'sight':'light').replace('<svg ', '<svg x="-3" y="-3" ').replace('width="36" height="36"','width="22" height="22"')
   : `<path fill="#544d49" transform="translate(0 1)" d="${pair[1]}"/><path fill="${pair[0]}" fill-rule="evenodd" d="${pair[1]}"/>`;
 return `<svg class="passage-bonus-icon" viewBox="-4 -4 25 25" shape-rendering="crispEdges" aria-hidden="true"><path fill="#c5a36a" d="M-3 4v-6h6v2h-4v4zm23 8v6h-6v-2h4v-4z"/>${central}<path class="bonus-glint" fill="#fff0af" d="M-3-2h3v1h-3zm20 18h3v1h-3z"/></svg>`;
}
export function boonMarkup(value){
 const entries=typeof value==='string'?[[value,1]]:Object.entries(value||{});
 return entries.filter(([id,left])=>ROUTE_BONUSES[id]&&left>0).map(([id,left])=>`<span class="passage-boon">${bonusIcon(id)}<span><b>${left} cleared ${left===1?'flight':'flights'} left</b> ${esc(ROUTE_BONUSES[id].reward.replaceAll('3 cleared flights','the remaining flights'))} Failures do not spend it.</span></span>`).join('');
}
export function bonusProgressText(bonus){
 const b=ROUTE_BONUSES[bonus?.id];if(!b)return '';
 if(bonus.failed)return '×';if(bonus.complete)return '✓';
 if(bonus.id==='reserve-finish')return `${b.target} Sparks at exit`;
 const progress=Math.min(b.target,Math.max(0,Number(bonus.progress)||0));
 return bonus.unit==='s'?`${progress.toFixed(1)}/${b.target}s`:`${progress}/${b.target}`;
}
export function updateBonusGauge(el,bonus){
 if(!el)return;
 const b=ROUTE_BONUSES[bonus?.id];if(!b||bonus.eligible===false){el.hidden=true;return;}
 const key=[b.id,bonus.progress,bonus.current,bonus.target,bonus.complete,bonus.failed,bonus.waitingForExit].join(':');
 if(key===el.dataset.state&&!el.hidden)return;
 el.hidden=false;el.dataset.state=key;
 el.innerHTML=`${bonusIcon(b.id)}<b>${bonusProgressText(bonus)}</b>`;
 const current=Math.min(b.target,Math.max(0,Number(bonus.progress)||0));
 const progress=bonus.id==='reserve-finish'?`Currently ${Number(bonus.current)||0} Sparks. Checked at the exit.`:`${bonus.unit==='s'?current.toFixed(1):current} of ${b.target}${bonus.unit==='s'?' seconds':''}.`;
 el.setAttribute('aria-label','Optional challenge. '+b.condition+' '+(bonus.failed?'Missed.':bonus.complete?'Goal met, clear to claim.':progress));
}
