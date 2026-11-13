// Seven stops, but different timings for recovery, treasure and commitment.
// F=ordinary flight, E=elite, R=rest, T=treasure, V=event, B=map finale.
export const ROUTE_RECIPES=Object.freeze([
 {id:'lantern-forks',name:'Lantern Forks',rows:['FFF','RVF','FFE','TFV','FRF','EFF',' B ']},
 {id:'long-crossing',name:'Long Crossing',rows:['FFF','FEF','RFT','FFF','VRV','FFE',' B ']},
 {id:'gilded-dawn',name:'Gilded Dawn',rows:['FFF','TVR','FEF','RFV','FFF','FTE',' B ']},
 {id:'sheltered-weave',name:'Sheltered Weave',rows:['FFF','RFV','FFF','TVR','FFF','FEF',' B ']},
 {id:'crossroads',name:'Crossroads',rows:['FFF','FVR','FFF','RTE','FFF','VFE',' B ']},
 {id:'late-haven',name:'Late Haven',rows:['FFF','FEF','VFT','FRF','EFV','FTF',' B ']},
].map(r=>Object.freeze({...r,rows:Object.freeze(r.rows)})));

export const REWARD_THEMES=Object.freeze({
 sustain:{label:'Sustain',summary:'Fuel, overflow and recovery'},
 precision:{label:'Precision',summary:'Direct pickups and controlled flight'},
 tempo:{label:'Tempo',summary:'Companion work and recharge effects'},
 dream:{label:'Dreamlight',summary:'Dream openings and temporary vision'},
 risk:{label:'Risk',summary:'Seed skimming and fuel tradeoffs'},
});

export function nodeEconomy(node={}){
 const map=Math.min(2,Math.max(0,node.mapIndex||0));
 if(node.boss)return{clear:0,cash:null,challenge:0};
 if(node.kind==='treasure')return{clear:0,cash:30+map*3,challenge:0};
 if(node.type==='support')return{clear:0,cash:18+map*3,challenge:0};
 if(node.type==='finale')return{clear:36+map*6,cash:28+map*4,challenge:18};
 const risky=node.routeStyle==='gauntlet';
 return{clear:14+map*3+(node.elite?12:0)+(risky?3:0),cash:18+map*3+(node.elite?10:0),challenge:node.elite?18:12};
}
