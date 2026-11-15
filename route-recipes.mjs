// Ten stops, with three extra flights before each guardian. Recovery, treasure
// and event lanes retain their authored commitments and single exits at Rests.
// F=ordinary flight, E=elite, R=rest, T=treasure, V=event, B=map finale.
// Authored crossings keep a route committed for several stops. Each row's three
// strings list destination lanes for source lanes 0/1/2. A crossing is a real
// junction, never an automatic connection to every adjacent node.
const straight=['0','1','2'],finish=['1','1','1'];
export const ROUTE_TOPOLOGY_VERSION='longer-journeys-2';
export const MAP_STOP_COUNT=10;
function extendJourney(recipe){
 const rows=[],edges=[],extraFlightRows=[];
 for(let i=0;i<recipe.rows.length;i++){
  rows.push(recipe.rows[i]);
  if(i===recipe.rows.length-1)break;
  edges.push(recipe.edges[i]);
  if([0,2,4].includes(i)){
   extraFlightRows.push(rows.length);rows.push('FFF');edges.push(straight);
  }
 }
 return {...recipe,rows,edges,extraFlightRows:Object.freeze(extraFlightRows)};
}
export const ROUTE_RECIPES=Object.freeze([
 {id:'lantern-forks',name:'Lantern Forks',rows:['FFF','RVF','FFE','TFV','FRF','EFF',' B '],edges:[straight,['0','1','12'],['01','1','2'],straight,['01','1','2'],finish]},
 {id:'long-crossing',name:'Long Crossing',rows:['FFF','FEF','RFT','FFF','VRV','FFE',' B '],edges:[['0','12','2'],straight,['0','12','2'],['01','1','2'],['0','1','12'],finish]},
 {id:'gilded-dawn',name:'Gilded Dawn',rows:['FFF','TVR','FEF','RFV','FFF','FTE',' B '],edges:[straight,['0','01','2'],straight,['0','12','2'],['01','1','12'],finish]},
 {id:'sheltered-weave',name:'Sheltered Weave',rows:['FFF','RFV','FFF','TVR','FFF','FEF',' B '],edges:[straight,straight,['0','12','2'],straight,['0','01','2'],finish]},
 {id:'crossroads',name:'Crossroads',rows:['FFF','FVR','FFF','RTE','FFF','VFE',' B '],edges:[straight,straight,['0','1','12'],straight,['0','01','12'],finish]},
 {id:'late-haven',name:'Late Haven',rows:['FFF','FEF','VFT','FRF','EFV','FTF',' B '],edges:[['0','12','2'],straight,straight,['01','1','2'],['0','01','2'],finish]},
].map(extendJourney).map(r=>Object.freeze({...r,rows:Object.freeze(r.rows),edges:Object.freeze(r.edges.map(row=>Object.freeze([...row])))})));


export const REWARD_THEMES=Object.freeze({
 sustain:{label:'Sustain',summary:'Fuel, overflow and recovery'},
 precision:{label:'Precision',summary:'Direct pickups and controlled flight'},
 tempo:{label:'Tempo',summary:'Companion work and recharge effects'},
 dream:{label:'Dreamlight',summary:'Dream openings and temporary vision'},
 risk:{label:'Risk',summary:'Seed skimming and fuel tradeoffs'},
});

export function nodeEconomy(node={}){
 const map=Math.min(2,Math.max(0,node.mapIndex||0));
 // Only collected light can condense. Clear/recovery/challenge rewards never
 // mint currency; relinquishing a relic releases a finite Sparks pickup.
 const salvageGlow=node.boss?null:node.kind==='treasure'||node.type==='finale'?60+map*20:node.elite?40+map*20:20+map*20;
 return{clear:0,cash:0,challenge:0,salvageGlow};
}
