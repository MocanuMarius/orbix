import {atlasGlyph,ATLAS_FORECASTS} from './night-atlas.mjs?v=burn-1';
import {bonusIcon} from './route-bonus-ui.mjs?v=burn-1';
import {getRouteBonus} from './route-bonuses.mjs?v=burn-1';
import {landmarkCategory,biomeGroundArt} from './map-landmarks.mjs?v=burn-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=burn-1';
import {THEME_INKS} from './replay-ui.mjs?v=burn-1';
import {getRouteMapState} from './model.mjs?v=burn-1';
import {getMapStopInfo} from './map-guide.mjs?v=burn-1';
import {getGlowCapacity} from './vitality.mjs?v=burn-1';
import {actionAttributes} from './ui/primitives.mjs?v=burn-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const edgeKey=([a,b])=>`${a}|${b}`;
const wisp=(x,y)=>`<g class="route-player-wisp" transform="translate(${x} ${y})"><path d="m-23 1 9-15 13-7L16-9 22 3 11 13-17 8Z" fill="url(#routeWispGlow)"/><path d="M-4-7h8v2h3v3h2v4H7v3H4v2H-4V5H-7V2H-9V-2H-7V-5H-4Z" fill="#fff8d3"/><path d="M-3-5h6v2h2v6H3v2H-3V3H-5V-3H-3Z" fill="#fffef0"/></g>`;
const splitName=(name,compact=false)=>{if(compact)return[name.length>18?name.slice(0,17).trimEnd()+'…':name];const lines=[''];for(const word of name.split(' ')){const i=lines.length-1;if((lines[i]+' '+word).length>19&&i<1)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;};
// Stop icon: the approved 24-grid art at exactly 48 screen pixels (scale = screen pixels per map unit, measured when the map is drawn).
const landmark=(n,x,y,scale=1)=>{const kind=landmarkCategory(n),units=48/Math.max(.1,scale),icon=mapStopIconMarkup(n,{size:48}).replace(/ width="48" height="48" style="[^"]*"/,` x="${-units/2}" y="${-units/2}" width="${units}" height="${units}"`);return `<g class="route-landmark landmark-${kind}" data-landmark-family="${kind==='elite'?'boss':kind}" ${n.boss?`data-guardian="${esc(n.bossId||'hollow-warden')}"`:''} transform="translate(${x} ${y})" shape-rendering="crispEdges">${icon}</g>`;};
const ground=(n,x,y)=>{const biome=biomeGroundArt(n);return `<g class="route-biome-ground biome-${esc(biome.id)}" transform="translate(${x} ${y})" aria-hidden="true"><path class="biome-bed" d="m-71 27 17-9 22 4 18-4 26 3 25-2 21 12-18 6-24-2-25 3-28-5-20 1Z"/>${biome.art}</g>`;};

// Quiet irregular darkness separates the artwork from the trail without
// enclosing each destination in a token or drawing a rim around the text.
const artShadow=(x,y,variant=0)=>`<g class="route-art-shadow" transform="translate(${x} ${y}) scale(${variant%2?-1:1} 1)" pointer-events="none">
 <path class="route-shadow-fringe" d="M-57-8h6v-12h9v-9h13v-9h17v-7h16v5h18v6h14v10h11v9h8V0h5v13h-9v8H40v7H25v6H5v-4H-17v4h-14v-7h-13v-7h-10V9h-6V0h3Z"/>
 <path class="route-shadow-soft" d="M-43-10h6v-12h13v-10h16v-5H8v4h15v7h12v11h10V2h-5v14H27v8H9v-3H-10v5h-15v-6h-12v-9h-9V1h3Z"/>
 <path class="route-shadow-core" d="M-31-12h7v-12h15v-6H8v6h15v10h8V3h-5v12H11v4H-7v-3h-14v-6h-10Z"/>
 <path class="route-shadow-dither" d="M-49-27h5v3h-5Zm18-14h3v4h-3ZM17-42h4v3h-4Zm30 18h4v5h-4Zm10 18h3v3h-3ZM44 21h5v3h-5ZM22 34h3v3h-3Zm-51-5h6v3h-6ZM-57 14h3v5h-3Zm-7-14h4v4h-4Z"/>
</g>`;
const labelShadow=(x,y,half,height)=>`<g class="route-copy-shadow" transform="translate(${x} ${y}) scale(${half/77} ${height/28})" pointer-events="none">
 <path class="route-shadow-fringe" d="M-86 11h6V5h12V1h15v-3h20v-3H-8v3H19v-3h20v4h17v3h14v4h12v7h5v6h-9v5H65v4H45v3H21v-2H-4v3H-26v-4H-48v-3H-65v-3H-78v-5h-8Z"/>
 <path class="route-shadow-soft" d="M-74 10h8V5h15V2h26V0H0v2H29V1h19v4h17v5h10v9h-9v4H47v4H24v-2H0v3H-24v-3H-46v-3H-62v-4h-12Z"/>
 <path class="route-shadow-core" d="M-62 8h13V5h25V3H0v2H26V4h18v4h16v12H43v3H21v-2H-2v3H-25v-2H-45v-3H-62Z"/>
 <path class="route-shadow-dither" d="M-81 1h4v3h-4Zm31-8h6v3h-6ZM15-7h3v3h-3Zm63 9h4v4h-4ZM79 25h4v3h-4ZM45 32h6v2h-6Zm-84 0h4v3h-4Zm-39-9h4v3h-4Z"/>
</g>`;

/** One model-owned reachability snapshot drives both brightness and permissions. */
export function landscapeRouteView(run,{compact=false,scale=1}={}){
 const spacing=compact?186:166,width=run.map.length*spacing+140,height=320,all=run.map.flat(),byId=new Map(all.map(n=>[n.id,n])),state=getRouteMapState(run);
 const available=new Set(state.availableIds),future=new Set(state.reachableIds),completed=new Set(state.completedIds),takenEdges=new Set(state.pathEdges.map(edgeKey)),futureEdges=new Set(state.reachableEdges.map(edgeKey));
 const currentId=state.currentId||'start',pos=new Map([['start',{x:42,y:152}]]);
 for(const n of all)pos.set(n.id,{x:146+n.row*spacing,y:[55,152,249][n.lane??1]});
 const next=n=>(n.nextIds||[]).map(id=>byId.get(id)).filter(Boolean);
 const edge=(from,to)=>{
  const a=pos.get(from),b=pos.get(to);if(!a||!b)return '';
  const key=`${from}|${to}`,isNext=from===currentId&&available.has(to),cls=takenEdges.has(key)?'path-taken':isNext?'path-open':futureEdges.has(key)?'path-future':'path-locked';
  const sx=a.x+(from==='start'?13:29),sy=a.y+(from==='start'?3:22),ex=b.x-30,ey=b.y+22,bend=(b.y>=a.y?1:-1)*5;
  const trail=Array.from({length:9},(_,i)=>{const t=i/8,s=t*t*(3-2*t);return{x:Math.round(sx+(ex-sx)*t),y:Math.round(sy+(ey-sy)*s+Math.sin(t*Math.PI*3)*bend)};});
  let d=`M${sx} ${sy}`;for(let i=1;i<trail.length-1;i++){const p=trail[i],q=trail[i+1];d+=`Q${p.x} ${p.y} ${(p.x+q.x)/2} ${(p.y+q.y)/2}`;}d+=`T${ex} ${ey}`;
  const stones=trail.slice(1,-1).filter((_,i)=>i%2===0).map((p,i)=>`<path class="route-stone" d="m${p.x-3} ${p.y+(i%2?-3:2)} 4-1 3 2-2 2-5-1Z"/>`).join('');
  return `<g class="map-route-line ${cls}" data-route-from="${esc(from)}" data-route-to="${esc(to)}"><path class="route-shadow" d="${d}"/><path class="route-thread" d="${d}"/>${stones}${isNext?`<path class="route-current" d="${d}"/>`:''}</g>`;
 };
 let paths='',nodes='',groundLayer='';
 for(const n of all){const p=pos.get(n.id);groundLayer+=ground(n,p.x,p.y);}
 for(const a of all)for(const b of next(a))paths+=edge(a.id,b.id);
 for(const id of run.startNodeIds||run.map[0].map(n=>n.id))paths+=edge('start',id);
 for(const n of all){
  const p=pos.get(n.id),reachable=available.has(n.id),possible=future.has(n.id),seen=completed.has(n.id),here=currentId===n.id;
  const routeState=here?'current':reachable?'next':seen?'complete':possible?'future':'closed',info=getMapStopInfo(n,getGlowCapacity(run)),label=n.boss?'GUARDIAN':n.elite?'ELITE':n.type==='finale'?'EXIT':info.kind==='treasure'?'CHEST':info.kind==='encounter'?'EVENT':info.label,name=info.name||n.name,themeInk=n.elite||n.boss?THEME_INKS[n.rewardTheme]:null,interactive=run.phase==='map'&&(reachable||possible&&!seen);
  // Keep the next decision and useful route planning visible. Ordinary distant
  // flights retain their preview target, without repeating text along the path.
  const showType=here||reachable,showName=here||reachable;
  const labelHalf=compact?88:77,labelHeight=28;
  const weather=ATLAS_FORECASTS[n.atlasForecast];
  const environment=(weather?weather.name+'. ':'')+(n.type!=='support'&&n.biomeName?`${n.biomeName}. ${n.interactionHint||''} `:'');
  const bonus=n.bonusId?getRouteBonus(run,n):null,challenge=bonus?`Optional challenge. ${bonus.condition} ${bonus.reward}`:'';
  const aria=here?`You are here: ${label}, ${name}. Choose a lit next stop.`:reachable?`Next stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''} ${challenge}`:possible?`Future stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''} ${challenge}`:seen?`Completed: ${label}, ${name}.`:`Closed branch: ${label}, ${name}. Not reachable from your path.`;
  nodes+=`<g class="world-map-node route-state-${routeState} ${reachable?'reachable':''} ${seen?'taken':''} ${!possible&&!seen?'unreachable':''} ${here?'current-position':''}" data-route-state="${routeState}" data-route-label="${showName?'full':showType?'type':'none'}" ${interactive?actionAttributes('preview-node',{id:n.id,tabindex:0,role:'button'}):'role="img"'} ${here?'aria-current="location"':''} aria-label="${esc(aria)}">
   <title>${esc(aria)}</title>${interactive?`<rect class="route-node-hit" x="${p.x-(compact?82:66)}" y="${p.y-32}" width="${compact?164:132}" height="${showName?94:showType?75:64}" fill="transparent"/>`:''}
   <g class="route-node-art" aria-hidden="true">
   ${reachable||here?`<path class="route-node-halo" d="m${p.x-49} ${p.y+13} 11-26 21-16 28 3 27 18 10 26-23 20-29-2-32 1Z" fill="url(#${here?'routeHereGlow':'routeNextGlow'})"/>`:''}
   ${routeState!=='closed'?`${artShadow(p.x,p.y,n.row+(n.lane||0))}${landmark(n,p.x,p.y,scale)}`:`<path class="route-closed-ground" d="m${p.x-29} ${p.y+22} 12-4 13 3 13-2 12 5-15 3-17-2-11 1Z"/><path class="route-closed-mark" d="m${p.x-10} ${p.y+8} 20 18m-20 0 20-18"/>`}
   ${weather&&routeState!=='closed'?`<g transform="translate(${p.x-42} ${p.y-35})" pointer-events="none">${atlasGlyph(weather.id).replace('<svg ','<svg width="26" height="26" ')}</g>`:''}
   ${reachable&&n.bonusId?`<g transform="translate(${p.x+26} ${p.y-32})" pointer-events="none">${bonusIcon(n.bonusId).replace('<svg ','<svg width="24" height="24" ')}</g>`:''}
   ${reachable?`<path class="route-next-light" d="m${p.x-30} ${p.y+25} 10 2 6-1m19 1 10-2 7 1" fill="none" stroke="#fff0b6" stroke-width="1.5"/>`:''}
   ${seen&&!here?`<path class="route-completed-mark" d="m${p.x-5} ${p.y+21} 4 4 7-8" fill="none" stroke="#e4c78e" stroke-width="2"/>`:''}
   ${themeInk&&routeState!=='closed'?`<path class="route-theme-pip" d="m${p.x+30} ${p.y+10} 2-6 3 4-1 7-4 1Z" fill="${themeInk}"><title>${esc(n.rewardThemeLabel||n.rewardTheme)}</title></path>`:''}
   </g>
   ${showType?`${labelShadow(p.x,p.y+27,labelHalf,labelHeight)}<text class="map-node-type" x="${p.x}" y="${p.y+36}" text-anchor="middle">${esc(label)}</text>`:''}
   ${showName?`<text class="map-node-name" x="${p.x}" y="${p.y+49}" text-anchor="middle">${splitName(name,true).map((line,i)=>`<tspan x="${p.x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>`:''}
   ${here?`${wisp(p.x-34,p.y-12)}<text class="route-state-caption route-node-caption route-here-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">HERE</text>`:reachable?`<path class="route-next-arrow" d="M${p.x-48} ${p.y-7}l8 7-8 7m-7-14 8 7-8 7" fill="none" stroke="#fff0b6" stroke-width="2"/>`:''}
  </g>`;
 }
 const atStart=currentId==='start',start=`<g class="route-start ${atStart?'current-position':''}" role="img" ${atStart?'aria-current="location"':''} aria-label="${atStart?'You are here at the start. Choose a lit next stop.':'Start of the completed route.'}">${atStart?wisp(42,152):'<path d="m34 153 7-3 8 2-3 3-9 1Z" fill="#8c9074"/>'}<text class="route-state-caption ${atStart?'route-here-caption':''}" x="42" y="${atStart?124:177}" text-anchor="middle">${atStart?'HERE':'START'}</text></g>`;
 const markup=`<defs><linearGradient id="routeSky" x2="1" y2="1"><stop stop-color="#1d150e"/><stop offset="1" stop-color="#150f0a"/></linearGradient><radialGradient id="routeNextGlow"><stop stop-color="#e0d39b" stop-opacity=".4"/><stop offset=".55" stop-color="#d2d39a" stop-opacity=".14"/><stop offset="1" stop-color="#d2d39a" stop-opacity="0"/></radialGradient><radialGradient id="routeHereGlow"><stop stop-color="#f3ce80" stop-opacity=".4"/><stop offset="1" stop-color="#f3ce80" stop-opacity="0"/></radialGradient><radialGradient id="routeWispGlow"><stop stop-color="#fff5c9" stop-opacity=".8"/><stop offset="1" stop-color="#fff5c9" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#routeSky)"/>${Array.from({length:8},(_,i)=>`<path d="M0 ${35+i*40} Q${width*.25} ${i*20} ${width*.5} ${35+i*40} T${width} ${35+i*40}" fill="none" stroke="#c9ad74" opacity=".05"/>`).join('')}<g class="route-biome-layer" aria-hidden="true">${groundLayer}</g>${paths}${nodes}${start}`;
 return{markup,width,height,currentId,currentX:pos.get(currentId)?.x||42,nextX:pos.get(state.availableIds[0])?.x??null};
}
export function drawLandscapeMap(svg,viewport,run){
 const compact=!!viewport&&viewport.clientHeight<260;let view=landscapeRouteView(run,{compact});svg.classList.add('landscape-route');svg.setAttribute('viewBox',`0 0 ${view.width} ${view.height}`);svg.setAttribute('data-current-node',view.currentId);svg.setAttribute('aria-label','Expedition route. HERE marks your position. Bright chevrons mark the next stops. Tap a reachable stop to preview before committing. Muted future stops can be previewed; crossed empty branches are closed.');svg.innerHTML=view.markup;
 // Stop icons are sized in screen pixels (48), so draw once to learn the screen scale of the map, then draw again with it.
 {const ctm=svg.getScreenCTM?.(),drawn=ctm&&ctm.a>0?ctm.a:svg.getBoundingClientRect().height/view.height;if(drawn>0){view=landscapeRouteView(run,{compact,scale:Math.max(.4,drawn)});svg.innerHTML=view.markup;}}
 if(viewport){const scale=Math.max(.4,svg.getBoundingClientRect().height/view.height);svg.style.setProperty('--route-label-size',`${Math.max(11,Math.min(18,11/scale))}px`);svg.style.setProperty('--route-type-size',`${Math.max(10,Math.min(15,9/scale))}px`);viewport.scrollTop=0;viewport.scrollLeft=Math.max(0,view.currentX*scale-Math.min(120,viewport.clientWidth*.17));}
}
