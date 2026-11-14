// A predictable run-income floor. The final guardian unlocks a future reward-pool artifact;
// it does not pay currency that expires with the finished run.
export const FLIGHT_CLEAR_REWARD=20;
export function getFlightClearReward(node){
 return node&&node.type!=='support'&&!(node.boss&&node.mapIndex===2)?FLIGHT_CLEAR_REWARD:0;
}
