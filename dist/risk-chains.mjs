import {pickupKind,getPickupSpec} from './pickups.mjs?v=proximity-balance-1';

// Authored three-packet encounters, installed after solid scenery and recovery
// lights. Reuse two ordinary fuel packets rather than inflating the economy.
export function installRiskChains(layout,{duration,speed,height,stage,difficulty,elite,mapIndex},clear){
  layout.riskChains=[];
  if(duration<30)return;
  const first=stage===0&&mapIndex===0&&difficulty===1&&!elite;
  const wanted=first?1:Math.min(3,(duration>=70?2:1)+(elite||difficulty>=4?1:0));
  const gap=first?108:difficulty<=2&&!elite?100:84;
  const margin=Math.max(1500,speed*12),end=Math.max(...layout.obstacles.map(o=>o.x+o.width*2));
  const anchors=layout.obstacles.filter(o=>!o.hard&&!o.reservedDraft&&o.x>margin&&o.x<end-500);
  for(let index=0;index<wanted;index++){
    const target=margin+(end-margin-500)*(index+.5)/wanted;
    const candidates=anchors.filter(o=>layout.riskChains.every(chain=>Math.abs(chain.x-o.x)>1000))
      .sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target)).slice(0,24);
    let placed=false;
    for(const anchor of candidates){
      const x=anchor.x+anchor.width*.65;
      if(layout.sections.some(s=>(s.hard||s.authoredChallenge)&&x+gap+140>s.start&&x-gap-140<s.end))continue;
      const donors=layout.embers.filter(p=>pickupKind(p)==='light'&&!p.intro&&!p.accessible&&!p.challengeLandmark&&!p.riskChain&&!p.generated)
        .sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)).slice(0,2);
      if(donors.length<2||donors.some(p=>Math.abs(p.x-x)>1900))continue;
      const lean=first?0:((anchor.id+index)%3-1)*10;
      for(const y of [anchor.center,height*.5,anchor.center-24,anchor.center+24]){
        if(y<100||y>height-100)continue;
        const at=t=>({x:x+(t*2-1)*gap,y:y+(t*2-1)*lean});
        const near=layout.embers.filter(p=>!donors.includes(p)&&Math.abs(p.x-x)<gap+65);
        if(near.some(p=>Math.abs(p.y-y)<55||getPickupSpec(p).dim>0&&Math.abs(p.y-y)<110))continue;
        let straight=true;
        for(let n=0;n<=16;n++){const p=at(n/16);if(!clear(p.x,p.y,28)){straight=false;break;}}
        if(!straight)continue;
        // Preserve a complete, body-wide arcing bypass as well as the straight
        // risk-taking line. Never install a seed inside a compulsory pinch.
        const dodgeSide=[-1,1].find(side=>{
          for(let n=0;n<=16;n++){const t=n/16,p=at(t);if(!clear(p.x,p.y+side*Math.sin(t*Math.PI)*64,24))return false;}
          return true;
        });
        if(!dodgeSide)continue;
        const id=`risk-chain-${index}`;
        donors.forEach((p,i)=>Object.assign(p,{...at(i),riskChain:id,chainIndex:i*2,
          feature:'snare-glow',pocket:false,pocketSide:null,clearance:28}));
        layout.embers.push({id:`${id}-seed`,x,y,kind:'dark',harmful:true,manualOnly:true,
          value:0,fuel:false,feature:'snare-seed',riskChain:id,chainIndex:1,
          collected:false,attracted:false,phase:anchor.phase||0});
        layout.riskChains.push({id,x,y,start:x-gap,end:x+gap,gap,lean,dodgeSide});
        placed=true;break;
      }
      if(placed)break;
    }
  }
  layout.embers.sort((a,b)=>a.x-b.x);
}
