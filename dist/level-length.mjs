// Ordinary passages are three times their earlier distance. Practice stays short.
export const LEVEL_LENGTH = Object.freeze({ version: 1, multiplier: 3,
  defaultDuration: 114, maximumDuration: 360 });

export function getLevelLengthScale(node = {}) {
  if (node.tutorialLesson || node.isTutorial) return 1;
  return node.flightLengthScale === LEVEL_LENGTH.multiplier ? LEVEL_LENGTH.multiplier : 1;
}

export function formatFlightDuration(seconds = LEVEL_LENGTH.defaultDuration) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return value < 60 ? `${value}s` : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

// Explicit durations are measured at ordinary forward speed, before optional speed builds.
export function getFlightLengthProfile({seed=1,mapIndex=0,row=0,elite=false,boss=false}={}) {
  let hash=2166136261;for(const char of `${seed}:${mapIndex}:${row}:${elite}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  const n=hash>>>0, band=boss?'guardian':elite?'endurance':['short','standard','endurance'][n%3];
  const ranges={short:[45,70],standard:[80,110],endurance:[120,150]};
  const range=ranges[band];
  const duration=boss?90+Math.min(2,Math.max(0,mapIndex))*30:range[0]+(n>>>5)%(range[1]-range[0]+1);
  return {duration,lengthBand:band,lengthLabel:{short:'Short',standard:'Standard',endurance:'Endurance',guardian:'Guardian'}[band],lengthChallenge:band==='short'?'Quick precision':band==='endurance'?'Sustain your Sparks':boss?'Read the guardian':'Steady flight',flightLengthScale:1};
}
