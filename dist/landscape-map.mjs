import {encounterIntent,THEME_INKS} from './replay-ui.mjs?v=packed-light-1';
import {getRouteMapState} from './model.mjs?v=packed-light-1';
import {getMapStopInfo} from './map-guide.mjs?v=packed-light-1';
import {getGlowCapacity} from './vitality.mjs?v=packed-light-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const edgeKey=([a,b])=>`${a}|${b}`;
const wisp=(x,y)=>`<g class="route-player-wisp" transform="translate(${x} ${y})"><path d="m-23 1 9-15 13-7L16-9 22 3 11 13-17 8Z" fill="url(#routeWispGlow)"/><path d="M-4-7h8v2h3v3h2v4H7v3H4v2H-4V5H-7V2H-9V-2H-7V-5H-4Z" fill="#fff8d3"/><path d="M-3-5h6v2h2v6H3v2H-3V3H-5V-3H-3Z" fill="#fffef0"/></g>`;
const splitName=name=>{const lines=[''];for(const word of name.split(' ')){const i=lines.length-1;if((lines[i]+' '+word).length>19&&i<1)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;};
// Five small places, drawn in the map's own pixel language rather than framed icons.
const landmarks={
 flight:'<path class="landmark-dark" d="m-13 24 8-15 8-2 11 18Z"/><path class="landmark-body" d="M-24 22V-9h4v-9h13v7h-7v8h-2v25ZM12 23V-5h-1v-11h9v8h5v31Z"/><path class="landmark-face" d="M-24-9h6v31h-6ZM12-5h5v28h-5ZM-16-21h13v6h-13ZM5-21h12v5H5Z"/><path class="landmark-edge" d="M-22-11h6M-14-21h10M14-16h5M19 3h5M-23 6h6"/>',
 rest:'<path class="landmark-dark" d="M-23 21V-4L-2-21 24-5v27Z"/><path class="landmark-body" d="M-21 21V-5h6v26ZM15 22V-5h7v27Z"/><path class="landmark-face" d="m-29-3 9-8 7-1 10-12 8 5 6 8 8 2 10 8-3 5L2-15-24 3Z"/><path class="landmark-body" d="M-18 19h35v6h-35Z"/><path class="landmark-fire" d="m-7 16 2-8 4 3 3-12 5 9-1 8-6 3Z"/><path class="landmark-edge" d="m-26-2 8-7M-11-13l8-8M-13 23h27"/>',
 encounter:'<path class="landmark-dark" d="m-16 22 4-41 11-7 15 6 2 43Z"/><path class="landmark-body" d="m-13 20 3-37 9-6 11 5 2 39Z"/><path class="landmark-face" d="m-13 20 3-37 5-4-2 43Z"/><path class="landmark-rune" d="m-2-10 4-2 4 3-1 5-4 3v5M1 10v2"/><path class="landmark-edge" d="m-10-17 8-5M8-17l2 10M-11 19l19 1"/>',
 treasure:'<path class="landmark-dark" d="M-24-4-17-14H15l10 9v25h-48Z"/><path class="landmark-body" d="M-21-3h43v20h-43ZM-17-12h31l7 8h-41Z"/><path class="landmark-face" d="M-21 1h7v16h-7ZM10-12h6v29h-6ZM-16-12h4v12h-4Z"/><path class="landmark-edge" d="M-22 0h44M-20 17h40M-17-12h30"/><path class="landmark-fire" d="M-3-2h7v9h-7Z"/>',
 boss:'<path class="landmark-dark" d="M-30 25V-17l7-13 10 8h26l10-8 7 13v42Z"/><path class="landmark-body" d="M-28 24V-16l5-10 7 7v44ZM16 25v-44l7-7 5 10v40ZM-17-20h34v10h-34Z"/><path class="landmark-face" d="M-28-13h6v37h-6ZM16-13h5v38h-5ZM-17-20h34v4h-34Z"/><path class="landmark-body" d="m-13-8 13-6 13 6-4 18L0 18-9 10Z"/><path class="landmark-fire" d="m-9-3 7 3-2 3-5-2ZM9-3 2 0l2 3 5-2Z"/><path class="landmark-edge" d="M-27 8h8M20 9h7M-12-19h24M-4 10h8"/>'
};
const landmark=(n,kind,x,y)=>`<g class="route-landmark landmark-${kind}" transform="translate(${x} ${y})" shape-rendering="crispEdges"><path class="landmark-ground" d="m-35 22 9-7 8 3 10-4 16 3 10-2 14 8-7 6-13-1-12 3-17-3-11 1Z"/>${landmarks[kind]||landmarks.flight}${n.elite?'<path class="landmark-thorns" d="m-30 22 6-15-8-3m8 3 1-12 5 5m43 14 5-14 6-4m-6 4-2-9M-29 21l12-3m38 4 12-5"/>':''}<path class="landmark-grass" d="m-32 21-3-5m6 5 2-7m51 10 3-7m4 7 3-3"/></g>`;

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
  const sx=a.x+(from==='start'?13:29),sy=a.y+(from==='start'?3:22),ex=b.x-30,ey=b.y+22,bend=(b.y>=a.y?1:-1)*5;
  const trail=Array.from({length:9},(_,i)=>{const t=i/8,s=t*t*(3-2*t);return{x:Math.round(sx+(ex-sx)*t),y:Math.round(sy+(ey-sy)*s+Math.sin(t*Math.PI*3)*bend)};});
  let d=`M${sx} ${sy}`;for(let i=1;i<trail.length-1;i++){const p=trail[i],q=trail[i+1];d+=`Q${p.x} ${p.y} ${(p.x+q.x)/2} ${(p.y+q.y)/2}`;}d+=`T${ex} ${ey}`;
  const stones=trail.slice(1,-1).filter((_,i)=>i%2===0).map((p,i)=>`<path class="route-stone" d="m${p.x-3} ${p.y+(i%2?-3:2)} 4-1 3 2-2 2-5-1Z"/>`).join('');
  return `<g class="map-route-line ${cls}" data-route-from="${esc(from)}" data-route-to="${esc(to)}"><path class="route-shadow" d="${d}"/><path class="route-thread" d="${d}"/>${stones}${isNext?`<path class="route-current" d="${d}"/>`:''}</g>`;
 };
 let paths='',nodes='';
 for(const a of all)for(const b of next(a))paths+=edge(a.id,b.id);
 for(const id of run.startNodeIds||run.map[0].map(n=>n.id))paths+=edge('start',id);
 for(const n of all){
  const p=pos.get(n.id),reachable=available.has(n.id),possible=future.has(n.id),seen=completed.has(n.id),here=currentId===n.id;
  const routeState=here?'current':reachable?'next':seen?'complete':possible?'future':'closed',info=getMapStopInfo(n,getGlowCapacity(run)),label=n.boss?'BOSS':n.elite?'ELITE':n.type==='finale'?'EXIT':encounterIntent(n)?.short||info.label,name=info.name||n.name,themeInk=THEME_INKS[n.rewardTheme],interactive=run.phase==='map'&&(reachable||possible&&!seen);
  // Keep the next decision and useful route planning visible. Ordinary distant
  // flights retain their preview target, without repeating text along the path.
  const nearby=n.row<=run.step+1,planning=possible&&(nearby||n.type==='support'||n.elite||n.boss||n.type==='finale'),showType=here||reachable||planning,showName=here||reachable||planning&&(nearby||n.type==='support');
  const environment=n.type!=='support'&&n.biomeName?`${n.biomeName}. ${n.interactionHint||''} `:'';
  const aria=here?`You are here: ${label}, ${name}. Choose a lit next stop.`:reachable?`Next stop. Choose ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:possible?`Future stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:seen?`Completed: ${label}, ${name}.`:`Closed branch: ${label}, ${name}. Not reachable from your path.`;
  nodes+=`<g class="world-map-node route-state-${routeState} ${reachable?'reachable':''} ${seen?'taken':''} ${!possible&&!seen?'unreachable':''} ${here?'current-position':''}" data-route-state="${routeState}" data-route-label="${showName?'full':showType?'type':'none'}" ${interactive?`data-action="${reachable?'node':'preview-node'}" data-id="${esc(n.id)}" tabindex="0" role="button"`:'role="img"'} ${here?'aria-current="location"':''} aria-label="${esc(aria)}">
   <title>${esc(aria)}</title>${interactive?`<rect class="route-node-hit" x="${p.x-66}" y="${p.y-32}" width="132" height="${showName?94:showType?75:64}" fill="transparent"/>`:''}
   <g class="route-node-art" aria-hidden="true">
   ${reachable||here?`<path class="route-node-halo" d="m${p.x-49} ${p.y+13} 11-26 21-16 28 3 27 18 10 26-23 20-29-2-32 1Z" fill="url(#${here?'routeHereGlow':'routeNextGlow'})"/>`:''}
   ${routeState!=='closed'?landmark(n,info.kind,p.x,p.y):`<path class="route-closed-ground" d="m${p.x-29} ${p.y+22} 12-4 13 3 13-2 12 5-15 3-17-2-11 1Z"/>`}
   ${reachable?`<path class="route-next-light" d="m${p.x-30} ${p.y+25} 10 2 6-1m19 1 10-2 7 1" fill="none" stroke="#fff0b6" stroke-width="1.5"/>`:''}
   ${seen&&!here?`<path class="route-completed-mark" d="m${p.x-5} ${p.y+21} 4 4 7-8" fill="none" stroke="#e4c78e" stroke-width="2"/>`:''}
   ${themeInk&&routeState!=='closed'?`<path class="route-theme-pip" d="m${p.x+30} ${p.y+10} 2-6 3 4-1 7-4 1Z" fill="${themeInk}"><title>${esc(n.rewardThemeLabel||n.rewardTheme)} relics</title></path>`:''}
   </g>
   ${showType?`<ellipse class="route-label-mist" cx="${p.x}" cy="${p.y+46}" rx="71" ry="22" fill="url(#routeMist)"/><text class="map-node-type" x="${p.x}" y="${p.y+36}" text-anchor="middle">${esc(label)}</text>`:''}
   ${showName?`<text class="map-node-name" x="${p.x}" y="${p.y+49}" text-anchor="middle">${splitName(name).map((line,i)=>`<tspan x="${p.x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>`:''}
   ${here?`${wisp(p.x-34,p.y-12)}<text class="route-state-caption route-node-caption route-here-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">HERE</text>`:reachable?`<path class="route-next-arrow" d="M${p.x-43} ${p.y-5}l6 5-6 5" fill="none" stroke="#fff0b6" stroke-width="2"/><text class="route-state-caption route-node-caption route-next-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">NEXT</text>`:''}
  </g>`;
 }
 const atStart=currentId==='start',start=`<g class="route-start ${atStart?'current-position':''}" role="img" ${atStart?'aria-current="location"':''} aria-label="${atStart?'You are here at the start. Choose a lit next stop.':'Start of the completed route.'}">${atStart?wisp(42,152):'<path d="m34 153 7-3 8 2-3 3-9 1Z" fill="#8c9074"/>'}<text class="route-state-caption ${atStart?'route-here-caption':''}" x="42" y="${atStart?124:177}" text-anchor="middle">${atStart?'HERE':'START'}</text></g>`;
 const markup=`<defs><linearGradient id="routeSky" x2="1" y2="1"><stop stop-color="#11262a"/><stop offset="1" stop-color="#101f1e"/></linearGradient><radialGradient id="routeMist"><stop offset=".35" stop-color="#142626" stop-opacity=".98"/><stop offset="1" stop-color="#142626" stop-opacity="0"/></radialGradient><radialGradient id="routeNextGlow"><stop stop-color="#e0d39b" stop-opacity=".4"/><stop offset=".55" stop-color="#d2d39a" stop-opacity=".14"/><stop offset="1" stop-color="#d2d39a" stop-opacity="0"/></radialGradient><radialGradient id="routeHereGlow"><stop stop-color="#f3ce80" stop-opacity=".4"/><stop offset="1" stop-color="#f3ce80" stop-opacity="0"/></radialGradient><radialGradient id="routeWispGlow"><stop stop-color="#fff5c9" stop-opacity=".8"/><stop offset="1" stop-color="#fff5c9" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#routeSky)"/>${Array.from({length:8},(_,i)=>`<path d="M0 ${35+i*40} Q${width*.25} ${i*20} ${width*.5} ${35+i*40} T${width} ${35+i*40}" fill="none" stroke="#8da286" opacity=".045"/>`).join('')}${paths}${nodes}${start}`;
 return{markup,width,height,currentId,currentX:pos.get(currentId)?.x||42,nextX:pos.get(state.availableIds[0])?.x??null};
}
export function drawLandscapeMap(svg,viewport,run){
 const view=landscapeRouteView(run);svg.classList.add('landscape-route');svg.setAttribute('viewBox',`0 0 ${view.width} ${view.height}`);svg.setAttribute('data-current-node',view.currentId);svg.setAttribute('aria-label','Expedition route. HERE marks your position. Lit NEXT stops can be chosen. Muted future stops can be previewed; faint empty branches are closed.');svg.innerHTML=view.markup;
 if(viewport){const scale=svg.getBoundingClientRect().height/view.height;viewport.scrollTop=0;viewport.scrollLeft=Math.max(0,view.currentX*scale-Math.min(120,viewport.clientWidth*.17));}
}
