import {encounterIntent,THEME_INKS} from './replay-ui.mjs?v=relic-paths-1';
import {getChoices} from './model.mjs?v=relic-paths-1';
import {getMapStopInfo,mapStopIconMarkup} from './map-guide.mjs?v=relic-paths-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function drawLandscapeMap(svg,viewport,run){
 const width=run.map.length*166+140,height=276,all=run.map.flat(),byId=new Map(all.map(n=>[n.id,n]));
 const choices=getChoices(run),available=new Set(choices.map(n=>n.id)),visited=new Set(run.path),future=new Set(available),queue=[...choices],pos=new Map();
 const next=n=>(n.nextIds||[]).map(id=>byId.get(id)).filter(Boolean);
 while(queue.length)for(const n of next(queue.shift()))if(!future.has(n.id)){future.add(n.id);queue.push(n)}
 for(const n of all)pos.set(n.id,{x:142+n.row*166,y:[35,115,195][n.lane??1]});
 const taken=new Set(run.path.slice(1).map((id,i)=>`${run.path[i]}|${id}`)),last=run.path.at(-1);
 const edge=(a,b,cls)=>{const d=`M${a.x+25} ${a.y}C${a.x+80} ${a.y},${b.x-80} ${b.y},${b.x-25} ${b.y}`;return `<g class="map-route-line ${cls}"><path class="route-shadow" d="${d}"/><path class="route-thread" d="${d}"/>${cls==='path-open'?`<path class="route-current" d="${d}"/>`:''}</g>`};
 let paths='',nodes='';for(const a of all)for(const b of next(a))paths+=edge(pos.get(a.id),pos.get(b.id),taken.has(`${a.id}|${b.id}`)?'path-taken':a.id===last&&available.has(b.id)?'path-open':future.has(a.id)&&future.has(b.id)?'path-future':'path-locked');
 for(const id of run.startNodeIds||run.map[0].map(n=>n.id))paths+=edge({x:35,y:115},pos.get(id),run.path[0]===id?'path-taken':!run.path.length?'path-open':'path-locked');
 for(const n of all){
  const p=pos.get(n.id),reachable=available.has(n.id),possible=future.has(n.id),seen=visited.has(n.id),info=getMapStopInfo(n),label=n.boss?'BOSS':n.elite?'ELITE':n.type==='finale'?'EXIT':encounterIntent(n)?.short||info.label;
  const name=info.name||n.name,themeInk=THEME_INKS[n.rewardTheme],words=name.split(' '),lines=[''];for(const word of words){let i=lines.length-1;if((lines[i]+' '+word).length>19&&i<1){lines.push(word)}else lines[i]+=(lines[i]?' ':'')+word;}
  nodes+=`<g class="world-map-node ${reachable?'reachable':''} ${seen?'taken':''} ${!possible&&!seen?'unreachable':''}" ${possible?`data-action="${reachable?'node':'preview-node'}" data-id="${n.id}" tabindex="0" role="button" aria-label="${reachable?'Choose':'Preview'} ${esc(label)}: ${esc(name)}. ${esc(info.summary)} ${esc(n.rewardPreview||'')}"`:''}>
   <title>${esc(name)} · ${esc(info.summary)}</title><rect x="${p.x-66}" y="${p.y-26}" width="132" height="78" fill="transparent"/>
   ${reachable?`<circle cx="${p.x}" cy="${p.y}" r="29" fill="none" stroke="#e5dfaa" opacity=".65"/>`:''}<circle cx="${p.x}" cy="${p.y}" r="23" fill="${seen?'#3d5136':'#1c3530'}" stroke="${reachable?'#e9e0b7':'#91a081'}" stroke-width="${reachable?2:1}"/>
   ${themeInk?`<circle cx="${p.x+20}" cy="${p.y-19}" r="5" fill="${themeInk}" stroke="#14251e" stroke-width="2"><title>${esc(n.rewardThemeLabel||n.rewardTheme)} relics</title></circle>`:''}<g class="map-support-symbol">${mapStopIconMarkup(n).replace('<svg ',`<svg x="${p.x-16}" y="${p.y-16}" width="32" height="32" `)}</g>
   <ellipse cx="${p.x}" cy="${p.y+43}" rx="70" ry="23" fill="url(#routeMist)"/><text class="map-node-type" x="${p.x}" y="${p.y+35}" text-anchor="middle" fill="${n.elite?'#e4b77f':'#bfc9a9'}">${esc(label)}</text><text class="map-node-name" x="${p.x}" y="${p.y+48}" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${p.x}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text>${last===n.id?`<circle cx="${p.x}" cy="${p.y-29}" r="4" fill="#faf0cc"/>`:''}</g>`;
 }
 svg.classList.add('landscape-route');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 svg.innerHTML=`<defs><linearGradient id="routeSky" x2="1" y2="1"><stop stop-color="#142f32"/><stop offset="1" stop-color="#14251e"/></linearGradient><radialGradient id="routeMist"><stop offset=".5" stop-color="#162d2b" stop-opacity=".95"/><stop offset="1" stop-color="#162d2b" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#routeSky)"/>${Array.from({length:8},(_,i)=>`<path d="M0 ${30+i*36} Q${width*.25} ${i*18} ${width*.5} ${30+i*36} T${width} ${30+i*36}" fill="none" stroke="#8da286" opacity=".065"/>`).join('')}${paths}${nodes}<circle cx="35" cy="115" r="7" fill="#e4e6bf"/><text x="35" y="139" text-anchor="middle" fill="#c8d1b3" font-size="10">START</text>`;
 const target=pos.get(choices[0]?.id);if(viewport&&target){const scale=svg.getBoundingClientRect().height/height;viewport.scrollTop=0;viewport.scrollLeft=Math.max(0,target.x*scale-viewport.clientWidth*.22);}
}
