import {pickupKind,getPickupSpec} from './pickups.mjs?v=strip-2';
import {inLanternRoom} from './lantern-layout.mjs?v=strip-2';

// Rise from the launch mark to the first Spark, fall through the seed, then
// fly another half second in dim light before the third fuel pickup.
const fallTimes=[0,.25,.56,1.20,1.44];
function placeFall(layout,anchor,donors,options,clear,id) {
  if(donors.length<4)return false;
  const {height,speed,gravity,lift,terminal}=options;
  const crestX=anchor.x+anchor.width*.65;
  const riseTime=lift/gravity, rise=lift*riseTime/2, stopTime=terminal/gravity;
  const drop=t=>t<=stopTime ? gravity*t*t/2 : terminal*(t-stopTime/2);
  const endTime=fallTimes.at(-1), totalDrop=drop(endTime);
  const launchX=crestX-speed*riseTime, endX=crestX+speed*endTime;
  if(inLanternRoom(layout,(launchX+endX)/2,(endX-launchX)/2+70))return false;
  if(layout.sections.some(s=>(s.hard||s.authoredChallenge)&&launchX-45<s.end&&endX+70>s.start))return false;
  const escapeTime=fallTimes[1];
  const climb=t=>-lift*t+gravity*t*t/2;
  for(const mid of [anchor.center,height*.50,height*.45,height*.57,height*.40,height*.64]){
    const crestY=mid-totalDrop/2;
    const yAt=t=>t<0?crestY+gravity*t*t/2:crestY+drop(t);
    const afterEscape=t=>crestY+drop(escapeTime)+climb(t-escapeTime);
    if(crestY<40||crestY+totalDrop>height-46||crestY+drop(escapeTime)-rise<34)continue;
    const positions=fallTimes.map(t=>({x:crestX+speed*t,y:yAt(t)}));
    const seed=positions[2];
    // Keep unrelated pickups out of the dim stretch so it cannot cleanse early.
    if(layout.embers.some(p=>!donors.includes(p)&&p.x>=launchX-20&&p.x<=endX+24
      && Math.abs(p.y-yAt((p.x-crestX)/speed))<68))continue;
    let fits=true;
    for(let t=-riseTime;t<=endTime+.19;t+=.055){
      const x=crestX+speed*t;
      const y=t>endTime?crestY+totalDrop+climb(t-endTime):yAt(t);
      if(!clear(x,y,23)||(t>=escapeTime&&!clear(x,afterEscape(t),23))){fits=false;break;}
    }
    if(!fits)continue;
    [0,1,3,4].forEach((slot,i)=>Object.assign(donors[i],positions[slot],{riskChain:id,
      chainIndex:slot,feature:'fall-glow',pocket:false,pocketSide:null,clearance:23}));
    layout.embers.push({...seed,id:id+'-seed',kind:'dark',harmful:true,manualOnly:true,value:0,fuel:false,
      feature:'fall-seed',riskChain:id,chainIndex:2,collected:false,attracted:false,phase:anchor.phase||0});
    layout.riskChains.push({id,kind:'fall',...seed,start:launchX,end:endX,launch:{x:launchX,y:crestY+rise}});
    return true;
  }
  return false;
}

// Reserve fuel from the existing course for either kind of encounter.
export function installRiskChains(layout,{duration,speed,height,stage,difficulty,elite,mapIndex,fallPhysics,allowFall=true},clear){
  layout.riskChains=[];
  if(duration<30)return;
  const first=stage===0&&mapIndex===0&&difficulty===1&&!elite;
  const wanted=first?1:Math.min(3,(duration>=70?2:1)+(elite||difficulty>=4?1:0));
  const gap=first?108:difficulty<=2&&!elite?100:84;
  const margin=Math.max(1500,speed*12),end=Math.max(...layout.obstacles.map(o=>o.x+o.width*2));
  const anchors=layout.obstacles.filter(o=>!o.hard&&!o.reservedDraft&&o.x>margin&&o.x<end-500);
  const physics=fallPhysics||{speed:speed*(elite?1.045:1),gravity:300*height/620,lift:205*height/620,terminal:245*height/620};
  for(let index=0;index<wanted;index++){
    const target=margin+(end-margin-500)*(index+.5)/wanted;
    const candidates=anchors.filter(o=>layout.riskChains.every(chain=>Math.abs(chain.x-o.x)>1000))
      .sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target)).slice(0,24);
    let placed=false;
    if(allowFall && !layout.riskChains.some(chain=>chain.kind==='fall')){
      for(const anchor of candidates){
        const center=anchor.x+anchor.width*.65;
        const donors=layout.embers.filter(p=>pickupKind(p)==='light'&&!p.intro&&!p.accessible&&!p.challengeLandmark
          &&!p.riskChain&&!p.generated&&Math.abs(p.x-center)<1450)
          .sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center)).slice(0,4);
        if(placeFall(layout,anchor,donors,{height,...physics},clear,'risk-chain-'+index)){placed=true;break;}
      }
    }
    if(placed)continue;
    for(const anchor of candidates){
      const x=anchor.x+anchor.width*.65;
      if(inLanternRoom(layout,x,gap+70))continue;
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
