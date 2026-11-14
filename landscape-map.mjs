import {landmarkArt,landmarkCategory,biomeGroundArt} from './map-landmarks.mjs?v=moonwell-menu-1';
import {THEME_INKS} from './replay-ui.mjs?v=moonwell-menu-1';
import {getRouteMapState} from './model.mjs?v=moonwell-menu-1';
import {getMapStopInfo} from './map-guide.mjs?v=moonwell-menu-1';
import {getGlowCapacity} from './vitality.mjs?v=moonwell-menu-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const edgeKey=([a,b])=>`${a}|${b}`;
const wisp=(x,y)=>`<g class="route-player-wisp" transform="translate(${x} ${y})"><path d="m-23 1 9-15 13-7L16-9 22 3 11 13-17 8Z" fill="url(#routeWispGlow)"/><path d="M-4-7h8v2h3v3h2v4H7v3H4v2H-4V5H-7V2H-9V-2H-7V-5H-4Z" fill="#fff8d3"/><path d="M-3-5h6v2h2v6H3v2H-3V3H-5V-3H-3Z" fill="#fffef0"/></g>`;
const splitName=(name,compact=false)=>{if(compact)return[name.length>18?name.slice(0,17).trimEnd()+'…':name];const lines=[''];for(const word of name.split(' ')){const i=lines.length-1;if((lines[i]+' '+word).length>19&&i<1)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;};
const landmark=(n,x,y)=>{const kind=landmarkCategory(n);return `<g class="route-landmark landmark-${kind}" data-landmark-family="${kind==='elite'?'boss':kind}" ${n.boss?`data-guardian="${esc(n.bossId||'hollow-warden')}"`:''} transform="translate(${x} ${y})" shape-rendering="crispEdges">${landmarkArt(n)}</g>`;};
const ground=(n,x,y)=>{const biome=biomeGroundArt(n);return `<g class="route-biome-ground biome-${esc(biome.id)}" transform="translate(${x} ${y})" aria-hidden="true"><path class="biome-bed" d="m-71 27 17-9 22 4 18-4 26 3 25-2 21 12-18 6-24-2-25 3-28-5-20 1Z"/>${biome.art}</g>`;};

/** One model-owned reachability snapshot drives both brightness and permissions. */
export function landscapeRouteView(run,{compact=false}={}){
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
  const environment=n.type!=='support'&&n.biomeName?`${n.biomeName}. ${n.interactionHint||''} `:'';
  const aria=here?`You are here: ${label}, ${name}. Choose a lit next stop.`:reachable?`Next stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:possible?`Future stop. Preview ${label}: ${name}. ${environment}${info.summary} ${n.rewardPreview||''}`:seen?`Completed: ${label}, ${name}.`:`Closed branch: ${label}, ${name}. Not reachable from your path.`;
  nodes+=`<g class="world-map-node route-state-${routeState} ${reachable?'reachable':''} ${seen?'taken':''} ${!possible&&!seen?'unreachable':''} ${here?'current-position':''}" data-route-state="${routeState}" data-route-label="${showName?'full':showType?'type':'none'}" ${interactive?`data-action="preview-node" data-id="${esc(n.id)}" tabindex="0" role="button"`:'role="img"'} ${here?'aria-current="location"':''} aria-label="${esc(aria)}">
   <title>${esc(aria)}</title>${interactive?`<rect class="route-node-hit" x="${p.x-(compact?82:66)}" y="${p.y-32}" width="${compact?164:132}" height="${showName?94:showType?75:64}" fill="transparent"/>`:''}
   <g class="route-node-art" aria-hidden="true">
   ${reachable||here?`<path class="route-node-halo" d="m${p.x-49} ${p.y+13} 11-26 21-16 28 3 27 18 10 26-23 20-29-2-32 1Z" fill="url(#${here?'routeHereGlow':'routeNextGlow'})"/>`:''}
   ${routeState!=='closed'?landmark(n,p.x,p.y):`<path class="route-closed-ground" d="m${p.x-29} ${p.y+22} 12-4 13 3 13-2 12 5-15 3-17-2-11 1Z"/><path class="route-closed-mark" d="m${p.x-10} ${p.y+8} 20 18m-20 0 20-18"/>`}
   ${reachable?`<path class="route-next-light" d="m${p.x-30} ${p.y+25} 10 2 6-1m19 1 10-2 7 1" fill="none" stroke="#fff0b6" stroke-width="1.5"/>`:''}
   ${seen&&!here?`<path class="route-completed-mark" d="m${p.x-5} ${p.y+21} 4 4 7-8" fill="none" stroke="#e4c78e" stroke-width="2"/>`:''}
   ${themeInk&&routeState!=='closed'?`<path class="route-theme-pip" d="m${p.x+30} ${p.y+10} 2-6 3 4-1 7-4 1Z" fill="${themeInk}"><title>${esc(n.rewardThemeLabel||n.rewardTheme)} relics</title></path>`:''}
   </g>
   ${showType?`<ellipse class="route-label-mist" cx="${p.x}" cy="${p.y+46}" rx="${compact?85:71}" ry="22" fill="url(#routeMist)"/><text class="map-node-type" x="${p.x}" y="${p.y+36}" text-anchor="middle">${esc(label)}</text>`:''}
   ${showName?`<text class="map-node-name" x="${p.x}" y="${p.y+(compact?54:49)}" text-anchor="middle">${splitName(name,compact).map((line,i)=>`<tspan x="${p.x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>`:''}
   ${here?`${wisp(p.x-34,p.y-12)}<text class="route-state-caption route-node-caption route-here-caption" x="${p.x+35}" y="${p.y-18}" text-anchor="start">HERE</text>`:reachable?`<path class="route-next-arrow" d="M${p.x-48} ${p.y-7}l8 7-8 7m-7-14 8 7-8 7" fill="none" stroke="#fff0b6" stroke-width="2"/>`:''}
  </g>`;
 }
 const atStart=currentId==='start',start=`<g class="route-start ${atStart?'current-position':''}" role="img" ${atStart?'aria-current="location"':''} aria-label="${atStart?'You are here at the start. Choose a lit next stop.':'Start of the completed route.'}">${atStart?wisp(42,152):'<path d="m34 153 7-3 8 2-3 3-9 1Z" fill="#8c9074"/>'}<text class="route-state-caption ${atStart?'route-here-caption':''}" x="42" y="${atStart?124:177}" text-anchor="middle">${atStart?'HERE':'START'}</text></g>`;
 const markup=`<defs><linearGradient id="routeSky" x2="1" y2="1"><stop stop-color="#11262a"/><stop offset="1" stop-color="#101f1e"/></linearGradient><radialGradient id="routeMist"><stop offset=".35" stop-color="#142626" stop-opacity=".98"/><stop offset="1" stop-color="#142626" stop-opacity="0"/></radialGradient><radialGradient id="routeNextGlow"><stop stop-color="#e0d39b" stop-opacity=".4"/><stop offset=".55" stop-color="#d2d39a" stop-opacity=".14"/><stop offset="1" stop-color="#d2d39a" stop-opacity="0"/></radialGradient><radialGradient id="routeHereGlow"><stop stop-color="#f3ce80" stop-opacity=".4"/><stop offset="1" stop-color="#f3ce80" stop-opacity="0"/></radialGradient><radialGradient id="routeWispGlow"><stop stop-color="#fff5c9" stop-opacity=".8"/><stop offset="1" stop-color="#fff5c9" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#routeSky)"/>${Array.from({length:8},(_,i)=>`<path d="M0 ${35+i*40} Q${width*.25} ${i*20} ${width*.5} ${35+i*40} T${width} ${35+i*40}" fill="none" stroke="#8da286" opacity=".045"/>`).join('')}<g class="route-biome-layer" aria-hidden="true">${groundLayer}</g>${paths}${nodes}${start}`;
 return{markup,width,height,currentId,currentX:pos.get(currentId)?.x||42,nextX:pos.get(state.availableIds[0])?.x??null};
}
export function drawLandscapeMap(svg,viewport,run){
 const compact=!!viewport&&viewport.clientHeight<260,view=landscapeRouteView(run,{compact});svg.classList.add('landscape-route');svg.setAttribute('viewBox',`0 0 ${view.width} ${view.height}`);svg.setAttribute('data-current-node',view.currentId);svg.setAttribute('aria-label','Expedition route. HERE marks your position. Bright chevrons mark the next stops. Tap a reachable stop to preview before committing. Muted future stops can be previewed; crossed empty branches are closed.');svg.innerHTML=view.markup;
 if(viewport){const scale=Math.max(.4,svg.getBoundingClientRect().height/view.height);svg.style.setProperty('--route-label-size',`${Math.max(11,Math.min(18,11/scale))}px`);svg.style.setProperty('--route-type-size',`${Math.max(10,Math.min(15,9/scale))}px`);viewport.scrollTop=0;viewport.scrollLeft=Math.max(0,view.currentX*scale-Math.min(120,viewport.clientWidth*.17));}
}
