import { createDraftZones } from './drafts.mjs?v=guardian-paths-1';
import { pickupKind } from './pickups.mjs?v=guardian-paths-1';

const FAMILIES = Object.freeze({
  'stillwater-tunnel': Object.freeze({ id:'stillwater-tunnel', name:'Stillwater Tunnel', icon:'ruins', rewardTheme:'precision',
    challenge:'Controlled passages', instruction:'Hold the quiet centre. Edge caches reward a precise detour.', type:'dark-cave' }),
  'draft-staircase': Object.freeze({ id:'draft-staircase', name:'Draft Staircase', icon:'wind', rewardTheme:'tempo',
    challenge:'Rising local drafts', instruction:'Ride the rising puffs for high caches, or pass beneath them.', type:'draft-crossing' }),
  'seed-orchard': Object.freeze({ id:'seed-orchard', name:'Dark-seed Orchard', icon:'leaf', rewardTheme:'risk',
    challenge:'Light and shadow chains', instruction:'Light brackets each dark seed. Arc around the red centre.', type:'fuel-pocket' }),
});
export const ENCOUNTER_FAMILIES = FAMILIES;
export const getEncounterFamily = id => FAMILIES[typeof id==='object'?id?.encounterFamily:id] || null;
export function encounterFamilyPreview(node={}) { const family=getEncounterFamily(node); return family?{...family}:null; }

/** Select existing biome cells, then author a readable spatial phrase. The
 * engine still applies its centre-change, gap and world-boundary safeguards. */
export function familyChallengeCells(familyId, course, { difficulty=1, elite=false }={}) {
  const family=getEncounterFamily(familyId); if(!family)return null;
  const source=[...course.hard,...course.entry,...course.rest];
  if(family.id==='stillwater-tunnel') {
    const roofed=source.filter(cell=>cell[4]==='both');
    const cells=(roofed.length?roofed:course.hard).slice(0,Math.max(3,course.hard.length));
    return cells.map((cell,i)=>{const copy=[...cell];copy[0]=cell[0]*.65+[.49,.53,.50,.47][i%4]*.35;
      copy[1]=Math.max(elite?174:difficulty<=2?198:184,Math.min(210,copy[1]));copy[4]='both';return copy;});
  }
  const open=source.filter(cell=>cell[4]==='floor'&&cell[1]>=230);
  const base=open.length?open:course.rest;
  return Array.from({length:Math.max(3,course.hard.length)},(_,i)=>{const copy=[...base[i%base.length]];
    const rhythm=family.id==='draft-staircase'?[.57,.50,.43,.49][i%4]:[.52,.50,.48,.50][i%4];
    copy[0]=copy[0]*.65+rhythm*.35;
    copy[1]=Math.max(300,copy[1]);copy[4]='floor';return copy;});
}

/** Install only bounded, swept-clear optional encounters. Mandatory fuel is
 * preserved; orchard fuel is relocated, never duplicated. Optional payoffs
 * are two finite Sparks clusters; only their actual overflow earns currency. */
export function installEncounterFamily(layout, field, { node={}, height=620, seed=1, speed=154, circleHitsObstacle }={}) {
  const family=getEncounterFamily(node); if(!family||layout.boss||!circleHitsObstacle)return layout;
  const scale=height/620, obstacles=layout.obstacles||[], allSections=layout.sections||[];
  const clear=(x,y,r=24)=>y>r+14&&y<height-r-14&&obstacles.every(o=>o.destroyed
    ||x+r<o.x-o.width*.8||x-r>o.x+o.width*2.5
    ||[-1,1].every(sign=>!circleHitsObstacle(x,y,r,o,0,o.center+sign*Math.abs(o.motion||0))));
  const rooms=allSections.filter(s=>s.authoredChallenge?.family===family.id);
  const chosen=[];
  for(const room of rooms) if(!chosen.some(s=>s.leg===room.leg))chosen.push(room);
  layout.encounterFamily=family.id; layout.encounterPayoffs=[];
  let bonusCount=0;
  const addBonus=(x,y,room)=>{
    if(bonusCount>=2||!clear(x,y,28)||layout.embers.some(p=>Math.hypot(p.x-x,p.y-y)<(pickupKind(p)==='dark'?54:70)))return false;
    layout.embers.push({id:`family-bonus:${family.id}:${bonusCount++}`,kind:'cluster',value:1,fuel:true,
      x,y,collected:false,attracted:false,phase:0,feature:'encounter-payoff',encounterFamily:family.id,optional:true});
    layout.encounterPayoffs.push({x,y,sectionId:room.id});return true;
  };
  if(family.id==='stillwater-tunnel') {
    for(const o of obstacles)if(rooms.some(s=>s.id===o.sectionId))o.motion*=.3;
    if(field?.zones)field.zones=field.zones.filter(z=>rooms.every(s=>z.x+z.rx<s.start-180||z.x-z.rx>s.end+180));
    for(const room of chosen){
      const members=obstacles.filter(o=>o.sectionId===room.id&&o.topShape&&o.bottomShape);
      for(const o of members){const x=o.x+o.width*.6;
        // A comfortable central lane remains; reward lies toward one edge.
        const side=bonusCount%2?1:-1,y=o.center+side*Math.min(o.gap*.29,49*scale);
        if(clear(x,o.center,30)&&addBonus(x,y,room))break;
      }
    }
  } else if(family.id==='draft-staircase') {
    if(field?.zones) {
      for(const challenge of layout.challenges||[])if(rooms.some(s=>s.id===challenge.sectionId)){
        challenge.available=false;delete challenge.draftId;delete challenge.crossing;
      }
      field.zones=field.zones.filter(z=>!rooms.some(s=>z.x+z.rx>s.start&&z.x-z.rx<s.end));
      for(const room of chosen) {
        const near=obstacles.filter(o=>o.x+o.width*2.5>=room.start-200&&o.x-o.width<=room.end+200);
        const candidates=createDraftZones({seed:`${seed}:${room.id}`,terrain:node.terrain||'storm',height,
          duration:60,totalDistance:room.end+650,layout:{obstacles:near,sections:[{...room,hard:false}]}});
        const centre=(room.start+room.end)/2;
        const zone=candidates.filter(z=>z.x>=room.start&&z.x<=room.end)
          .sort((a,b)=>Math.abs(a.x-centre)-Math.abs(b.x-centre))[0];
        if(!zone)continue;
        // Bypass safety comes from the production full-sway draft-room sampler.
        Object.assign(zone,{id:`staircase:${room.id}`,direction:-1,
          force:(Number(node.difficulty)||1)<=2?460:Math.min(570,460+20*(Number(node.difficulty)||1)),
          authoredChallenge:room.id,triggeredAt:null});
        field.zones.push(zone);
        const challenge=(layout.challenges||[]).find(c=>c.sectionId===room.id);
        if(challenge)Object.assign(challenge,{available:true,draftId:zone.id,crossing:{...zone}});
        for(const dx of [50,100,-50])if(addBonus(zone.x+dx,zone.y-zone.ry-27*scale,room))break;
      }
      field.zones.sort((a,b)=>a.x-b.x);
    }
  } else {
    layout.riskChains ||= [];
    for(const room of chosen){
      const members=obstacles.filter(o=>o.sectionId===room.id), mid=(room.start+room.end)/2;
      const anchors=members.sort((a,b)=>Math.abs(a.x-mid)-Math.abs(b.x-mid));
      let placed=false;
      for(const o of anchors){
        const x=o.x+o.width*.55,gap=(Number(node.difficulty)||1)<=2&&!node.elite?112:98;
        const donors=layout.embers.filter(p=>pickupKind(p)==='light'&&!p.intro&&!p.accessible&&!p.riskChain&&!p.generated
          &&Math.abs(p.x-x)<1450).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)).slice(0,2);
        if(donors.length<2)continue;
        for(const y of [o.center,height*.46,height*.55]) {
          if(layout.embers.some(p=>!donors.includes(p)&&Math.abs(p.x-x)<gap+50&&Math.abs(p.y-y)<(pickupKind(p)==='dark'?110:80)))continue;
          const safeArc=side=>Array.from({length:25},(_,i)=>i/24).every(t=>clear(x-gap+2*gap*t,y+side*Math.sin(Math.PI*t)*74,25));
          const side=[-1,1].find(safeArc);if(!side)continue;
          if(!clear(x,y,28)||!clear(x-gap,y,28)||!clear(x+gap,y,28))continue;
          const id=`orchard:${room.id}`;
          donors.forEach((p,i)=>Object.assign(p,{x:x+(i?gap:-gap),y,riskChain:id,chainIndex:i*2,
            feature:'orchard-glow',pocket:false,pocketSide:null,clearance:28}));
          layout.embers.push({id:`${id}:seed`,x,y,kind:'dark',harmful:true,manualOnly:true,value:0,fuel:false,
            feature:'orchard-seed',riskChain:id,chainIndex:1,collected:false,attracted:false,phase:0});
          layout.riskChains.push({id,x,y,start:x-gap,end:x+gap,gap,lean:0,dodgeSide:side,encounterFamily:family.id});
          // The optional money sits beside the seed; the open arc avoids both.
          addBonus(x,y-side*61,room);placed=true;break;
        }
        if(placed)break;
      }
    }
    if(field?.zones)field.zones=field.zones.filter(z=>chosen.every(s=>z.x+z.rx<s.start-140||z.x-z.rx>s.end+140));
  }
  layout.embers.sort((a,b)=>a.x-b.x);
  return layout;
}
