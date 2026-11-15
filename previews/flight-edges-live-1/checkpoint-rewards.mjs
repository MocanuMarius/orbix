export const FLIGHT_CLEAR_REWARD=20;
export function getFlightClearReward(node,run={}){
 if(!node||node.type==='support'||node.boss&&node.mapIndex===2)return 0;
 const band=node.lengthBand||((node.duration||90)<75?'short':(node.duration||90)>=120?'endurance':'standard');
 const base=band==='short'?15:band==='endurance'?25:20;
 return base+(node.elite?5:0)+(run.skills?.['main-clear-dividend']?10:0);
}
