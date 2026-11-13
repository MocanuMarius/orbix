const number = (n,min=0) => Math.max(min,Math.floor(Number(n)||0));
export function campaignStrip(run,profile={}) {
  if(run?.isTutorial)return '';
  const tier=number(run?.difficulty??profile.difficulty,1),map=number(run?.mapIndex);
  return `<div class="campaign-strip" aria-label="Ascension ${tier}, map ${Math.min(3,map+1)} of 3"><span>ASCENSION <b>${tier}</b></span><div class="campaign-map-marks">${[0,1,2].map(i=>`<i class="${i<map?'cleared':i===map?'current':''}" aria-hidden="true">${i===2?bossSigil():i+1}</i>`).join('<em>—</em>')}</div><span>MAP <b>${Math.min(3,map+1)}/3</b></span></div>`;
}
export function bossSigil(){return `<svg class="boss-sigil" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M8 61 15 40 9 24 19 28 16 9 27 22 32 3 37 22 48 9 45 28 55 24 49 40 56 61 41 55 32 62 23 55Z" fill="#24352e" stroke="#a6b19b" stroke-width="2"/><path d="m22 27 10-7 10 7-3 18-7 10-7-10Z" fill="#111b18" stroke="#7b8e80"/><path d="m23 33 6 3m12-3-6 3" stroke="#d9e3b9" stroke-width="3"/><path d="M32 25v9l-3 8 3 6 3-6-2-3" stroke="#667667"/><path d="m16 46-8 9m40-9 8 9M20 15l-8-9m32 9 8-9" stroke="#596d60" stroke-width="2"/></svg>`;}
export function afterglowUnlockMarkup(run){
  if(!run?.afterglowJustUnlocked)return '';
  return `<section class="afterglow-unlock"><div class="unlock-bottle" aria-hidden="true"><svg viewBox="0 0 32 40" fill="none"><path d="M11 2h10v7l5 8v17c0 6-20 6-20 0V17l5-8Z" fill="#172e2c" stroke="#b9d8ba" stroke-width="2"/><path d="M8 25h16v8c-2 4-14 4-16 0Z" fill="#bad7a4"/><path d="M13 3h6M16 13c-5 5-5 10 0 10s5-5 0-10Z" stroke="#edf0c2" stroke-width="2"/></svg></div><span>NEW ABILITY</span><h2>Afterglow</h2><b>OVERFLOW RESERVE</b><p>Excess victory recovery is spent before Glow during your next flight.</p></section>`;
}
