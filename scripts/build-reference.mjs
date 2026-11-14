import {writeFile} from 'node:fs/promises';
import {SKILLS,ARTIFACTS,getSkillPrice,getArtifactSalvageValue} from '../dist/model.mjs';
import {getArtifactInfo} from '../dist/artifact-info.mjs';
import {TREASURE_KINDS,describeTreasure,treasureChoices} from '../dist/treasure.mjs';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const groups={relics:[],skills:[],chests:[]};
function row(group,id,name,meta,details){
 groups[group].push('<article id="'+esc(id)+'"><h2><a href="#'+esc(id)+'">'+esc(name)+'</a></h2><small>'+esc(meta)+'</small>'+details.filter(Boolean).map(line=>'<p>'+esc(line)+'</p>').join('')+'</article>');
}
for(const a of Object.values(ARTIFACTS).sort((a,b)=>a.name.localeCompare(b.name))){
 const info=getArtifactInfo(a.id);
 row('relics',a.id,a.name,a.rarity+' · Melt value '+getArtifactSalvageValue(a.id)+' Stored Sparks',[a.description,info.limit,info.lifetime]);
}
for(const s of Object.values(SKILLS).sort((a,b)=>a.branch.localeCompare(b.branch)||a.name.localeCompare(b.name))){
 const names=ids=>[ids].flat().filter(Boolean).map(id=>SKILLS[id]?.name||id).join(', ');
 const costs=Array.from({length:s.maxRank},(_,rank)=>getSkillPrice({skills:{[s.id]:rank}},s.id));
 row('skills',s.id,s.name,s.branch+' · '+(s.retired?'Retired · ':'')+'Base price '+costs.join(' / ')+' Stored Sparks',[s.description,s.requires&&'Requires '+names(s.requires),s.excludes?.length?'Exclusive with '+names(s.excludes):'']);
}
const run={flame:50,lives:3,skills:{},companions:['collector']};
for(const kind of TREASURE_KINDS){
 const site=describeTreasure(kind),seen=new Set();
 function visit(state,condition){
  for(const o of treasureChoices(kind,{...run,...state})){
   const key=o.id+o.description;if(seen.has(key))continue;seen.add(key);
   row('chests',kind+'-'+seen.size,o.title,site.name+' · '+condition,[o.description,o.id==='tithe-pay'?'Requires at least 9 Sparks.':'']);
  }
 }
 visit({},'First visit');
 const gifts={vessel:2,farLens:1,quickLens:1,wick:1,toll:1,seal:1};
 visit({treasureGifts:gifts},'Gift already owned');
 for(const lives of [2,3])for(let n=0;n<=4;n++){
  visit({treasureGifts:gifts,treasurePact:'wager',lives,eventFavors:['feather','haste','wick','lens'].slice(0,n)},'Replacement when the usual gift is unavailable');
 }
}
const notes={relics:'Melt values are proceeds at Rest. Select a name to link directly to it.',skills:'Base prices are in Stored Sparks. Other training can raise the price in a run. Retired entries are marked.',chests:'Each chest offers a choice. Repeat visits can substitute rewards based on gifts owned, missing hearts and active preparations. Immediate refill values assume room in the meter.'};
for(const [group,rows] of Object.entries(groups)){
 const title=group[0].toUpperCase()+group.slice(1);
 const nav=Object.keys(groups).map(g=>'<a '+(g===group?'aria-current="page" ':'')+'href="reference-'+g+'.html">'+g+'</a>').join(' ');
 const page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' · Wispbound field guide</title><style>*{box-sizing:border-box}body{max-width:960px;margin:auto;padding:20px;background:#0d191b;color:#e3eddf;font:17px/1.45 system-ui}nav{display:flex;gap:18px;text-transform:capitalize}a{color:#d9d8ad}nav [aria-current]{color:white;font-weight:bold}h1{margin-bottom:0}small{color:#c4d9c1}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:14px}article{background:#18292b;padding:14px;border-top:2px solid #75897d}article:target{outline:2px solid #e3c78e}h2{font-size:20px;margin:0}h2 a{text-decoration:none}p{margin:.55em 0}input{background:#122224;color:white;font:inherit;padding:8px;width:min(100%,360px);margin:6px 0 18px;border:1px solid #829481}[hidden]{display:none}</style><body><nav>'+nav+'</nav><h1>'+title+'</h1><p>'+notes[group]+'</p><input type="search" aria-label="Search entries" placeholder="Find by name or effect"><section>'+rows.join('')+'</section><script>document.querySelector("input").oninput=e=>{for(const a of document.querySelectorAll("article"))a.hidden=!a.textContent.toLowerCase().includes(e.target.value.toLowerCase())}</script></body></html>';
 await writeFile(new URL('../dist/reference-'+group+'.html',import.meta.url),page);
 console.log(group,rows.length);
}
