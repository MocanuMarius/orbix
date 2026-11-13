import {encounterIntent,THEME_INKS} from './replay-ui.mjs?v=living-biomes-1';
import {getRouteMapState} from './model.mjs?v=living-biomes-1';
import {getMapStopInfo,mapStopIconMarkup} from './map-guide.mjs?v=living-biomes-1';
import {getGlowCapacity} from './vitality.mjs?v=living-biomes-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const edgeKey=([a,b])=>`${a}|${b}`;
const wisp=(x,y)=>`<g class="route-player-wisp" transform="translate(${x} ${y})"><circle r="16" fill="url(#routeWispGlow)"/><path d="M-4-7h8v2h3v3h2v4H7v3H4v2H-4V5H-7V2H-9V-2H-7V-5H-4Z" fill="#fff8d3"/><path d="M-3-5h6v2h2v6H3v2H-3V3H-5V-3H-3Z" fill="#fffef0"/></g>`;
const splitName=name=>{const lines=[''];for(const word of name.split(' ')){const i=lines.length-1;if((lines[i]+' '+word).length>19&&i<1)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;};

/** One model-owned reachability snapshot drives both brightness and permissions. */
export function landscapeRouteView(run){
 const width=run.map.length*166+140,height=320,all=run.map.flat(),byId=new Map(all.map(n=>[n.id,n])),state=getRouteMapState(run);
 const available=new Set(state.availableIds),future=new Set(state.reachableIds),completed=new Set(state.completedIds),takenEdges=new Set(state.pathEdges.map(edgeKey)),futureEdges=new Set(state.reachableEdges.map(edgeKey));
 const currentId=state.currentId||'start',pos=new Map([['start',{x:42,y:152}]]);
 for(const n of all)pos.set(n.id,{x:146+n.row*166,y:[55,152,249][n.lane??1]});
 const next=n=>(n.nextIds||[]).map(id=>byId.get(id)).filter(Boolean);
 const edge=(from,to)=>{
  const a=pos.get(from),b=pos.get(to);if(!a||!b)return '';
  const key=`${from}|${to}`,isNext=from===currentId&&available.has(to),cls=takenEdges.has(key)?'path-taken':isNext?'path-open':futureEdges.has(key)?'path-future':'path-locked';
  const d=`M${a.x+(from==='start'?13:27)} ${a.y}C${a.x+82} ${a.y},${b.x-82} ${b.y},${b.x-27} ${b.y}`;
  return `<g class="map-route-line ${cls}" data-route-from="${esc(from)}" data-route-to="${esc(to)}"><path class="route-shadow" d="${d}"/><path class="route-thread" d="${d}"/>${isNext?`<path class="route-current" d="${d}"/>`:''}</g>`;
 };
 let paths='',nodes='';
 for(const a of all)for(const b of next(a))paths+=edge(a.id,b.id);
 for(const id of run.startNodeIds||run.map[0].map(n=>n.id))paths+=edge('start',id);
 for(const n of all){
  const p=pos.get(n.id),reachable=available.has(n.id),possible=future.has(n.id),seen=completed.has(n.id),here=currentId===n.id;
  const routeState=here?'current':reachable?'next':seen?'complete':possible?'future':'closed',info=getMapStopInfo(n,getGlowCapacity(run)),label=n.boss?'BOSS':n.elite?'ELITE':n.type==='finale'?'EXIT':encounterIntent(n)?.short||info.label,name=info.name||n.name,themeInk=THEME_INKS[n.rewardTheme],interactive=reachable||possible&&!seen;
  const environment=n.type!=='support'&&n.biomeName?`${n.biomeName}. ${n.interactionHint||''} `:'';
  const aria=here?`You are here: ${label}, ${name}. Choose a lit next stop.`:reachable?`Next stop. Choose ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:possible?`Future stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:seen?`Completed: ${label}, ${name}.`:`Closed branch: ${label}, ${name}. Not reachable from your path.`;
  nodes+=`<g class="world-map-node route-state-${routeState} ${reachable?'reachable':''} ${seen?'taken':''} ${!possible&&!seen?'unreachable':''} ${here?'current-position':''}" data-route-state="${routeState}" ${interactive?`data-action="${reachable?'node':'preview-node'}" data-id="${esc(n.id)}" tabindex="0" role="button"`:'role="img"'} ${here?'aria-current="location"':''} aria-label="${esc(aria)}">
   <title>${esc(aria)}</title><rect class="route-node-hit" x="${p.x-66}" y="${p.y-32}" width="132" height="94" fill="transparent"/>
   ${reachable||here?`<circle class="route-node-halo" cx="${p.x}" cy="${p.y}" r="40" fill="url(#${here?'routeHereGlow':'routeNextGlow'})"/>`:''}
   ${reachable?`<circle class="route-next-ring" cx="${p.x}" cy="${p.y}" r="29" fill="none" stroke="#fff0b6" stroke-width="1.5"/>`:''}
   <circle class="route-node-disc" cx="${p.x}" cy="${p.y}" r="23"/>
   ${here?`<circle class="route-here-ring" cx="${p.x}" cy="${p.y}" r="29" fill="none" stroke="#f4d78b" stroke-width="2"/>`:''}
   ${themeInk?`<circle class="route-theme-pip" cx="${p.x+20}" cy="${p.y-19}" r="4" fill="${themeInk}" stroke="#14251e" stroke-width="2"><title>${esc(n.rewardThemeLabel||n.rewardTheme)} relics</title></circle>`:''}
   <g class="map-support-symbol">${mapStopIconMarkup(n).replace('<svg ',`<svg x="${p.x-16}" y="${p.y-16}" width="32" height="32" `)}</g>
   <ellipse cx="${p.x}" cy="${p.y+46}" rx="71" ry="22" fill="url(#routeMist)"/>
   <text class="map-node-type" x="${p.x}" y="${p.y+36}" text-anchor="middle">${esc(label)}</text>
   <text class="map-node-name" x="${p.x}" y="${p.y+49}" text-anchor="middle">${splitName(name).map((line,i)=>`<tspan x="${p.x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>
   ${here?`${wisp(p.x-34,p.y-12)}<text class="route-state-caption route-node-caption route-here-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">HERE</text>`:reachable?`<text class="route-state-caption route-node-caption route-next-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">NEXT</text>`:''}
   ${seen&&!here?`<path class="route-completed-mark" d="m${p.x-5} ${p.y+21} 4 4 7-8" fill="none" stroke="#e4c78e" stroke-width="2"/>`:''}
  </g>`;
 }
 const atStart=currentId==='start',start=`<g class="route-start ${atStart?'current-position':''}" role="img" ${atStart?'aria-current="location"':''} aria-label="${atStart?'You are here at the start. Choose a lit next stop.':'Start of the completed route.'}">${atStart?wisp(42,152):'<circle cx="42" cy="152" r="6" fill="#c8b57e"/>'}<text class="route-state-caption ${atStart?'route-here-caption':''}" x="42" y="${atStart?124:177}" text-anchor="middle">${atStart?'HERE':'START'}</text></g>`;
 const markup=`<defs><linearGradient id="routeSky" x2="1" y2="1"><stop stop-color="#11262a"/><stop offset="1" stop-color="#101f1e"/></linearGradient><radialGradient id="routeMist"><stop offset=".35" stop-color="#142626" stop-opacity=".98"/><stop offset="1" stop-color="#142626" stop-opacity="0"/></radialGradient><radialGradient id="routeNextGlow"><stop stop-color="#e0d39b" stop-opacity=".4"/><stop offset=".55" stop-color="#d2d39a" stop-opacity=".14"/><stop offset="1" stop-color="#d2d39a" stop-opacity="0"/></radialGradient><radialGradient id="routeHereGlow"><stop stop-color="#f3ce80" stop-opacity=".4"/><stop offset="1" stop-color="#f3ce80" stop-opacity="0"/></radialGradient><radialGradient id="routeWispGlow"><stop stop-color="#fff5c9" stop-opacity=".8"/><stop offset="1" stop-color="#fff5c9" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#routeSky)"/>${Array.from({length:8},(_,i)=>`<path d="M0 ${35+i*40} Q${width*.25} ${i*20} ${width*.5} ${35+i*40} T${width} ${35+i*40}" fill="none" stroke="#8da286" opacity=".045"/>`).join('')}${paths}${nodes}${start}`;
 return{markup,width,height,currentId,currentX:pos.get(currentId)?.x||42,nextX:pos.get(state.availableIds[0])?.x??null};
}
export function drawLandscapeMap(svg,viewport,run){
 const view=landscapeRouteView(run);svg.classList.add('landscape-route');svg.setAttribute('viewBox',`0 0 ${view.width} ${view.height}`);svg.setAttribute('data-current-node',view.currentId);svg.setAttribute('aria-label','Expedition route. HERE marks your position. Lit NEXT stops are selectable; dim branches are closed.');svg.innerHTML=view.markup;
 if(viewport){const scale=svg.getBoundingClientRect().height/view.height;viewport.scrollTop=0;viewport.scrollLeft=Math.max(0,view.currentX*scale-Math.min(120,viewport.clientWidth*.17));}
}
