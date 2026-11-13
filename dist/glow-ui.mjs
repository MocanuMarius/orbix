import {formatGlow,getGlowCapacity} from './vitality.mjs?v=pixel-landscape-1';
export function glowGaugeMarkup(run){
 const percent=formatGlow(run.flame,getGlowCapacity(run),0);
 return `<div class="flame-hud glow-side-gauge"><div class="afterglow-flight" id="afterglow-flight" aria-label="Afterglow reserve" ${run.afterglow>0?'':'hidden'}><i></i><b></b></div><span>GLOW</span><div id="flame-meter" role="meter" aria-label="Glow remaining" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${parseFloat(percent)}" aria-valuetext="${percent}"><i id="flame-fill" style="transform:scaleY(${parseFloat(percent)/100})"></i></div><b id="flame-value">${percent}</b></div>`;
}
