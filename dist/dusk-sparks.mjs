import {getPickupSpec} from './pickups.mjs?v=storm-guide-1';

// Separate, optional warning lanes. Install after the funded fuel inventory is
// final: adding Dusk must never replace fuel or enter the reference budget.
export function installDuskSparks(layout,{seed=1,height,speed=154,startX=98,endX,clear,hazards=[],drafts=[]}={}) {
  if(!clear||!Number.isFinite(endX)||!(height>0))return [];
  const duration=(endX-startX)/speed,wanted=Math.min(4,Math.max(2,Math.ceil(duration/38)));
  const candidates=[],offset=Math.max(44,height*.105);
  let phase=0;for(const char of String(seed))phase=(phase*31+char.charCodeAt(0))>>>0;
  for(let x=startX+speed*6;x<endX-speed*4;x+=58){
    if(hazards.some(h=>Math.abs(x-h.x)<(h.influence||h.rx||h.radius||70)+110))continue;
    if(drafts.some(d=>Math.abs(x-d.x)<d.rx+100))continue;
    if((layout.flightForks||[]).some(f=>x>f.approachStart-100&&x<f.exitEnd+100))continue;
    if((layout.riskChains||[]).some(c=>x>c.start-120&&x<c.end+120))continue;
    const near=layout.obstacles.filter(o=>Math.abs(o.x-x)<o.width*2.5+100);
    const centers=[height*.5,...near.map(o=>o.center)];
    for(const center of centers)for(const side of [-1,1]){
      const y=center+side*offset,bypassY=center-side*offset*.65;
      if(y<60||y>height-60||Math.abs(y-height*.5)>height*.28)continue;
      if(![-90,0,90].every(dx=>clear(x+dx,y,32)&&clear(x+dx,bypassY,38)))continue;
      if(layout.embers.some(p=>Math.hypot(p.x-x,p.y-y)<(getPickupSpec(p).dim?145:120)
        ||Math.abs(p.x-x)<180&&Math.abs(p.y-y)<50))continue;
      candidates.push({x,y,bypassY,sideLane:true,accessible:true,clearance:32});
    }
  }
  const placed=[];
  for(let index=0;index<wanted;index++){
    const target=startX+(endX-startX)*(.18+index*.66/Math.max(1,wanted-1));
    const available=candidates.filter(site=>placed.every(p=>Math.abs(p.x-site.x)>speed*5));
    available.sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target)||((phase+index)%2?b.y-a.y:a.y-b.y));
    const site=available[0];if(!site)continue;
    const packet={...site,id:`dusk-lane-${index}`,kind:'dusk',manualOnly:true,value:0,fuel:false,
      feature:'dusk-side-lane',collected:false,attracted:false,phase:(phase%628)/100+index*1.7};
    layout.embers.push(packet);placed.push(packet);
  }
  layout.embers.sort((a,b)=>a.x-b.x);
  layout.duskEncounters={wanted,placed:placed.length};
  return placed;
}
