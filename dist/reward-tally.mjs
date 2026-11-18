// Display-only tally for the flight-rewards summary. It reads the receipt rows and never changes what is banked:
// the last state always shows exactly the receipt's amounts, total and Stored Sparks balance.
const whole=value=>Math.max(0,Math.floor(Number(value)||0));
const ease=p=>1-Math.pow(1-Math.min(1,Math.max(0,p)),3);
export const TALLY_LIMITS=Object.freeze({maxGap:180,minGap:60,countMs:220,rollMs:140,walletMs:420,chimeMs:200});

/** Row layout for the source list: one column up to 4 rows, two columns above that; dense rows from 9. */
export function tallyLayout(rowCount){
 const n=whole(rowCount);
 return {columns:n>4?2:1,rowsPerColumn:n>4?Math.ceil(n/2):Math.max(1,n),dense:n>8};
}

/**
 * Plan the animation from the receipt rows [{amount}], the final total and the balance.
 * Rows reveal top to bottom `gap` apart (faster with many rows); each row's amount counts up, then drops into the total.
 */
export function planTally({rows=[],total,wallet=0,walletFrom,reducedMotion=false}={}){
 const amounts=rows.map(row=>whole(row?.amount)),sum=amounts.reduce((a,b)=>a+b,0);
 const finalTotal=total===undefined?sum:whole(total),finalWallet=whole(wallet);
 const from=walletFrom===undefined?finalWallet:Math.min(finalWallet,whole(walletFrom));
 const L=TALLY_LIMITS,n=amounts.length;
 const gap=n?Math.round(Math.min(L.maxGap,Math.max(L.minGap,1300/n))):0;
 const countMs=Math.round(Math.min(L.countMs,Math.max(100,gap*1.6)));
 const steps=amounts.map((amount,index)=>({index,amount,at:index*gap,dropAt:index*gap+countMs}));
 const lastDrop=n?steps[n-1].dropAt:0;
 const walletAt=lastDrop+L.rollMs,endAt=n||finalTotal?walletAt+(from!==finalWallet?L.walletMs:0):0;
 // The total shown must be the receipt total even if its rows were capped; the difference lands with the last row.
 const remainder=Math.max(0,finalTotal-sum);
 return {amounts,steps,total:finalTotal,wallet:finalWallet,walletFrom:from,gap,countMs,rollMs:L.rollMs,walletAt,walletMs:L.walletMs,
  endAt,chimeAt:endAt,remainder,reducedMotion:!!reducedMotion,
  // Sound cues: one tick per source as it drops, one chime when everything has landed.
  ticks:steps.map(step=>step.dropAt),duration:endAt+(finalTotal?L.chimeMs:0)};
}

/** What is on screen at time t (ms). `skipped` or reduced motion give the final state at once. */
export function tallyStateAt(plan,t,{skipped=false}={}){
 const done=skipped||plan.reducedMotion||t>=plan.endAt;
 if(done)return {done:true,revealed:plan.amounts.length,rows:plan.amounts.slice(),total:plan.total,wallet:plan.wallet,banked:true,bump:false};
 const rows=plan.steps.map(step=>t<step.at?null:Math.round(step.amount*ease((t-step.at)/plan.countMs)));
 let total=0,bump=false;
 plan.steps.forEach((step,i)=>{
  const p=(t-step.dropAt)/plan.rollMs;
  if(p>=0)total+=step.amount*ease(p);
  if(p>=0&&p<1)bump=true;
 });
 const last=plan.steps[plan.steps.length-1];
 if(plan.remainder&&last&&t>=last.dropAt)total+=plan.remainder*ease((t-last.dropAt)/plan.rollMs);
 const arrived=t>=plan.walletAt,walletP=arrived&&plan.walletMs?ease((t-plan.walletAt)/plan.walletMs):0;
 const landed=plan.steps.length?t>=plan.steps[plan.steps.length-1].dropAt+plan.rollMs:true;
 return {done:false,revealed:rows.filter(v=>v!==null).length,rows,total:landed?plan.total:Math.min(plan.total,Math.round(total)),
  wallet:arrived?Math.round(plan.walletFrom+(plan.wallet-plan.walletFrom)*walletP):plan.walletFrom,banked:false,bump};
}
