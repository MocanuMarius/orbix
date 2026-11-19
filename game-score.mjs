import {GAME_VERSION} from './build-version.mjs?v=skim-1';

// This book is deliberately separate from the replaceable campaign save.
export const SCORE_BOOK_KEY='wispbound-scorebook-v1';
export const SCORE_LIMIT=999999999;
const whole=(value,max=SCORE_LIMIT)=>Math.max(0,Math.min(max,Math.floor(Number(value)||0)));
const earnedKinds=new Set(['flight','flight-clear','exit-packing','card-packing','card-clear','route-bonus','kept-light','storage-bonus','resonance','flight-pact','pilgrim-vow','treasure-wager','chest-dividend']);

export function prepareScoreLedger(run,{fresh=false}={}){
 if(!run)return null;
 if(run.scoreLedger?.v!==1)run.scoreLedger={v:1,earned:0,complete:fresh};
 return run.scoreLedger;
}
export function awardScoreStores(run,amount){
 if(!run||run.isTutorial||run.testMode||run.scoreAbandoned||run.endScore)return;
 const ledger=prepareScoreLedger(run);
 ledger.earned=whole(whole(ledger.earned)+whole(amount));
}
export function awardSettledScoreStores(run,rewards,bankedAmount){
 const eligible=(rewards||[]).reduce((sum,reward)=>sum+(earnedKinds.has(reward.kind)?whole(reward.amount):0),0);
 awardScoreStores(run,Math.min(whole(bankedAmount),eligible));
}
export function completedGameScore(run){
 if(!run||run.isTutorial||run.testMode||run.scoreAbandoned||run.phase!=='ended'||
   !(run.success&&run.bossDefeated||!run.success&&run.lives===0&&run.lastAttempt?.livesRemaining===0))return null;
 if(run.endScore?.v===1)return run.endScore;
 const ledger=run.scoreLedger;
 return {v:1,runId:run.id,earned:whole(ledger?.earned),ascension:whole(run.difficulty,99),
  outcome:run.success?'won':'lost',flights:whole(run.stats?.flights,999),version:GAME_VERSION,complete:ledger?.v===1&&ledger.complete===true};
}
export function freezeCompletedGameScore(run){
 const score=completedGameScore(run);
 if(score&&!run.endScore)run.endScore=Object.freeze(score);
 return score;
}
const emptyBook=()=>({v:1,overall:null,ascensions:{},completed:{}});
export function readScoreBook(storage){
 try{
  const raw=storage?.getItem?.(SCORE_BOOK_KEY);
  if(!raw||raw.length>2000000)return emptyBook();
  const book=JSON.parse(raw);
  if(book?.v!==1||!book.ascensions||!book.completed)return emptyBook();
  return book;
 }catch{return emptyBook();}
}
/** Only a genuine local completion calls this. Shared cards never import it. */
export function recordCompletedGameScore(run,storage){
 const score=run?.endScore?.v===1?run.endScore:null;
 if(!score?.complete||!storage?.setItem)return score;
 const book=readScoreBook(storage),previous=book.completed[score.runId];
 if(previous){run.endScore=Object.freeze(previous);return run.endScore;}
 const oldAscension=book.ascensions[score.ascension]?.earned??null,oldOverall=book.overall?.earned??null;
 const comparison={ascensionBest:Math.max(oldAscension??0,score.earned),overallBest:Math.max(oldOverall??0,score.earned),
  ascensionNew:oldAscension===null||score.earned>oldAscension,overallNew:oldOverall===null||score.earned>oldOverall};
 const receipt={...score,comparison};
 if(comparison.ascensionNew)book.ascensions[score.ascension]=score;
 if(comparison.overallNew)book.overall=score;
 book.completed[score.runId]=receipt;
 // Bests remain permanent. A bounded receipt cache preserves reload comparisons.
 const ids=Object.keys(book.completed);for(const id of ids.slice(0,Math.max(0,ids.length-512)))delete book.completed[id];
 try{storage.setItem(SCORE_BOOK_KEY,JSON.stringify(book));run.endScore=Object.freeze(receipt);}
 catch{return score;}
 return run.endScore;
}
