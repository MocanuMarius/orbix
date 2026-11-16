// Volume levels for Music and FX: five steps, 0 (off) to 4. Level 3 is the default and plays
// at exactly the pre-levels mix, so players who never touch the control hear no change.
export const LEVEL_STEPS=4;
export const DEFAULT_LEVEL=3;
const GAINS=[0,.3,.6,1,1.35];

export function clampLevel(value){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(0,Math.min(LEVEL_STEPS,n)):0;}
/** Multiplier applied on top of the game's own mix. */
export function levelGain(level){return GAINS[clampLevel(level)];}
/** Arrow keys on the slider: Right/Up louder, Left/Down quieter, Home off, End full. Returns null for other keys. */
export function levelForKey(level,key){
 if(key==='ArrowRight'||key==='ArrowUp')return clampLevel(level+1);
 if(key==='ArrowLeft'||key==='ArrowDown')return clampLevel(level-1);
 if(key==='Home')return 0;
 if(key==='End')return LEVEL_STEPS;
 return null;
}
/** A tap on the bars picks the bar under the finger (1-4); muting is the icon's job. */
export function levelFromPointer(offsetX,width){
 if(!(width>0))return DEFAULT_LEVEL;
 return Math.max(1,Math.min(LEVEL_STEPS,Math.ceil(offsetX/width*LEVEL_STEPS)));
}

/**
 * Persisted level with a remembered last non-zero level, so unmuting restores it.
 * legacyOff() reports the old on/off setting when no level has been saved yet.
 * onWrite(level) lets the owner keep its legacy on/off key in step.
 */
export function createLevelStore({storage=globalThis.localStorage,levelKey,lastKey,legacyOff=()=>false,onWrite=()=>{}}={}){
 let level=DEFAULT_LEVEL,last=DEFAULT_LEVEL;
 try{
  const raw=storage?.getItem(levelKey);
  level=raw!=null&&raw!==''?clampLevel(raw):legacyOff()?0:DEFAULT_LEVEL;
  last=clampLevel(storage?.getItem(lastKey))||level||DEFAULT_LEVEL;
 }catch{level=legacyOff?.()?0:DEFAULT_LEVEL;last=DEFAULT_LEVEL;}
 const write=()=>{try{storage?.setItem(levelKey,String(level));storage?.setItem(lastKey,String(last));}catch{}try{onWrite(level)}catch{}};
 const store={
  get level(){return level},get last(){return last},get enabled(){return level>0},
  set(value){level=clampLevel(value);if(level>0)last=level;write();return level;},
  setEnabled(on){return store.set(on?last||DEFAULT_LEVEL:0);},
  toggle(){return store.set(level>0?0:last||DEFAULT_LEVEL);}
 };
 return store;
}

export const FX_LEVEL_KEY='emberwing-fx-level',FX_LAST_KEY='emberwing-fx-last',FX_MUTED_KEY='emberwing-muted';
/** FX level store; keeps the old 'emberwing-muted' flag in step for anything that still reads it. */
export function createFxLevel(storage=globalThis.localStorage){
 return createLevelStore({storage,levelKey:FX_LEVEL_KEY,lastKey:FX_LAST_KEY,legacyOff:()=>storage?.getItem(FX_MUTED_KEY)==='true',onWrite:level=>storage?.setItem(FX_MUTED_KEY,String(level===0))});
}
