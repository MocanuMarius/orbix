// Hint eligibility is deliberately conservative: unknown moving hazards defer it.
export function canShowFlightHint(e){
 if(!e||!e.alive||e.paused||e.dying||e.completing||e.finished||e.liftHeld||e.dream?.active||e.resumeRemaining>0)return false;
 if(e.time-Math.max(e.lastHintInputTime??0,e.lastFlapTime??0)<1)return false;
 if(e.layout?.boss?.attacks?.length)return false;
 const path=e.hintProjection.predict(e,1);
 return !path.contact&&!path.uncertain&&!path.exit;
}
