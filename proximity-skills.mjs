// Proximity is a purchased run mechanic, never an innate starting power.
const node=(id,name,cost,requires,description,extra={})=>({id,name,branch:'proximity',cost,maxRank:1,requires,description,consequence:description,icon:'edge-pulse',...extra});
export const PROXIMITY_SKILLS={
 'proximity-awakening':node('proximity-awakening','Proximity',60,null,'Unlock surface charging. Skim solid terrain for 2 seconds to earn a 5-second revealing pulse. Open sky never charges it.'),
 'main-edging-attunement':node('main-edging-attunement','Quick Charge',70,'proximity-awakening','Charge 25% faster: a full meter takes 1.6 seconds near solid terrain.'),
 'main-edging-tension':node('main-edging-tension','Held Tension',50,'proximity-awakening','Lose stored charge 50% more slowly when away from terrain.'),
 'main-edging-lasting':node('main-edging-lasting','Lasting Pulse',70,'main-edging-attunement','Reveal the scene for 7 seconds instead of 5. Works with Regenerative Pulse.'),
 'main-edging-regeneration':node('main-edging-regeneration','Regenerative Pulse',80,'main-edging-attunement','Each revealing pulse also restores 3 missing Sparks. Up to eight recoveries (24 Sparks) per flight. All normal pulse effects remain. Recovery creates no Stored Sparks.',{icon:'regen'}),
 'proximity-grace':node('proximity-grace','Steady Current',60,'main-edging-tension','Keep your charge for 2 seconds after leaving terrain before it starts fading.'),
 'proximity-light-shield':node('proximity-light-shield','Light Aegis',180,'proximity-grace','Full charge grants one light shield for 8 seconds. It absorbs one collision without Sparks cost. At most 2 grants per flight; never stacks.',{icon:'shield'}),
 'proximity-spacetime':node('proximity-spacetime','Spacetime',160,'proximity-grace','Skimming an ordinary bank bends a broad, shallow dent ahead of you. The real floor or roof yields by up to a third of your body width, then settles behind you. Works with an empty Spark Meter. Sparks, scenery props and moving hazards stay in place.',{icon:'trajectory'}),
};
