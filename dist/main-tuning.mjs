// Main-wisp paths favour distinct decisions over repeated identical ranks.
const node=(id,name,cost,requires,description,icon,shortEffect,extra={})=>({id,name,branch:'main',cost,maxRank:1,requires,description,consequence:description,icon,shortEffect,...extra});
export const MAIN_TUNING_SKILLS={
 'main-fourth-beat':node('main-fourth-beat','Fourth Beat',60,'main-efficiency','Tap Lift four times within one second. The fourth Lift costs zero Sparks.','beat','Free 4th Lift'),
 'main-fourth-beat-2':node('main-fourth-beat-2','Fourth Beat II',85,'main-fourth-beat','Tap Lift three times within one second. The third Lift costs zero Sparks.','beat','Free 3rd Lift'),
 'main-long-flash':node('main-long-flash','Long Flash',45,'main-sight','A Flash Powerup follows your wisp and lights the passage for 24 seconds instead of 8.','sight','Flash lasts 3× longer'),
 'main-glide-regen':node('main-glide-regen','Glide Regeneration',85,'main-efficiency','After 1.5 seconds without Lift, recover 3.3333333333333335 Sparks per second while falling unassisted. Up to 20 Sparks each flight. No surplus is stored.','regen','Glide to recover'),
 'main-glide-regen-2':node('main-glide-regen-2','Deep Regeneration',110,'main-glide-regen','Start after 1 second without Lift. Recover 6.666666666666667 Sparks per second while falling unassisted, up to 30 Sparks each flight. No surplus is stored.','regen','Faster recovery'),
 'main-echo-sight':node('main-echo-sight','Echo Luminance',35,'main-sight','Natural Sparks pickups cast light farther ahead for 2 seconds. Recharges in 8 seconds. Works with any companion.','sight','Pickup Luminance'),
 'main-echo-long':node('main-echo-long','Lingering Echo',35,'main-echo-sight','Echo Luminance lasts 1 second longer.','duration','+1s Luminance'),
 'main-echo-range':node('main-echo-range','Far Echo',40,'main-echo-sight','Echo Luminance reaches 50 farther ahead.','sight','+50 reach'),
 'main-kindled-touch':node('main-kindled-touch','Kindled Touch',35,'main-efficiency','Direct natural Spark pickups restore 6 extra Sparks. Companion deliveries keep their usual value.','fuel','Direct +6 Sparks'),
 'main-kindled-rich':node('main-kindled-rich','Bright Touch',40,'main-kindled-touch','Direct natural Spark pickups restore another 4 Sparks.','fuel','Direct +4 Sparks'),
 'main-purifying-touch':node('main-purifying-touch','Purifying Touch',45,'main-kindled-touch','Touch a Dark Spark to turn it into 12 Sparks instead of dimming. Recharges in 10 seconds.','purify','Cleanse seeds'),
 'main-clear-dividend':node('main-clear-dividend','Trail Dividend',60,null,'Cleared flights pay 10 extra Stored Sparks. Standard flights rise from 20 to 30.','reserve','+10 on clear'),
 'main-dream':node('main-dream','Dream',35,'main-sight','Rehearse the first 8s of each flight in golden light. Lifts are free. Wake at the end of your rehearsal with your pickups.','dream','Dream 8s'),
 'main-dream-long':node('main-dream-long','Long Dream',40,'main-dream','Extend rehearsals and preset playback to 12 seconds.','dream','Dream 12s'),
 'main-dream-deep':node('main-dream-deep','Nightmare',55,'main-dream-long','Rehearse 16 seconds. Once per map, Nightmare undoes a Lift that would cause a collision. Gain +70 Luminance during your saved opening and for 3 seconds after taking control.','dream','Dream 16s + Nightmare'),
 'main-dream-wake':node('main-dream-wake','Gentle Awakening',30,'main-dream','After waking and tapping to resume, ease back to full speed over 4 seconds instead of 3.','dream','Soft wake'),
 'main-dream-sight':node('main-dream-sight','Lucid Luminance',35,'main-dream','Gain +70 Luminance during playback and the first 3s after you take control.','sight','Lucid Luminance'),
 'main-recovery':node('main-recovery','Renewal',30,'main-efficiency','Victory recovery becomes 55% Sparks; it scales with your vessel.','recovery','+5 Sparks recovery'),
 'main-recovery-deep':node('main-recovery-deep','Deep Renewal',45,'main-recovery','Victory recovery becomes 60% Sparks; it scales with your vessel.','recovery','+5 Sparks recovery'),
 'main-recovery-rescue':node('main-recovery-rescue','Last Spark',40,'main-recovery','Finish below 20% Sparks to recover an extra 10% Sparks.','recovery','Low Sparks aid'),
 'main-recovery-challenge':node('main-recovery-challenge','Earned Rest',40,'main-recovery','Completing the optional flight challenge restores an extra 10% Sparks.','recovery','Bonus +10 Sparks'),
 'main-afterglow':node('main-afterglow','Efficient Storage',35,'main-efficiency','Pack one-third of excess Sparks, up from one-sixth. Packing limit rises from 20 to 30 per flight. Only real pickup surplus converts; recovery never does.','reserve','6 Sparks → 2'),
 'main-glow-sense':node('main-glow-sense','Spark Sense',40,'main-sight','Sense nearby pickups faintly through fog. The hint fades with distance.','beacon','Sense pickups'),
 'main-edging-attunement':node('main-edging-attunement','Edge Attunement',80,'main-sight','Edging Pulse is innate: skim clear of edges to build a 5s light pulse. Charge 25% faster: 1.6s instead of 2s.','edge-pulse','+25% charge'),
 'main-edging-lasting':node('main-edging-lasting','Lasting Pulse',100,'main-edging-attunement','Extend Edging Pulse from 5s to 7s. Regenerative Pulse can be learned alongside it.','edge-pulse','+2s pulse'),
 'main-edging-tension':node('main-edging-tension','Held Tension',90,'main-edging-attunement','Edging Pulse loses charge 50% more slowly away from edges. Regenerative Pulse can be learned alongside it.','edge-pulse','−50% decay'),
 'main-edging-regeneration':node('main-edging-regeneration','Regenerative Pulse',80,'main-edging-attunement','Each revealing pulse also restores 3 missing Sparks. Up to eight recoveries per flight. Normal pulse effects remain; recovery creates no Stored Sparks.','regen','Pulse +3 Sparks'),
 'main-drift-sense':node('main-drift-sense','Drift Sense I',25,'main-speed','Preview 0.7s of falling. A red dot marks the visible ceiling you would hit by lifting. Accounts for drafts and your build.','trajectory','Fall guide + ceiling warning'),
 'main-drift-sense-2':node('main-drift-sense-2','Drift Sense II',40,'main-drift-sense','Extend the falling guide and red ceiling-hit warning to 1.2s. Only an affordable Lift can show a warning.','trajectory','1.2s guide'),
 'main-drift-sense-3':node('main-drift-sense-3','Drift Sense III',70,'main-drift-sense-2','Preview falls and ceiling hits 1.8s ahead. Gold dots suggest an affordable route to the closest visible Spark when a clear path is found. Dynamic hazards can interrupt the prediction.','trajectory','1.8s + Spark route'),
 'main-dawnburst':node('main-dawnburst','Dawnburst',45,'main-sight','Collect Sparks to reveal the whole screen for 1.5s, then fade over 1.2s. More pickups refresh the light.','dawn','Pickup dawn'),
 'main-reservoir':node('main-reservoir','Deep Vessel',30,'main-efficiency','+20 Spark capacity. Recovery Rests fill the larger vessel.','reserve','+20 Sparks cap'),
 'main-vast-vessel':node('main-vast-vessel','Boundless Vessel',50,'main-reservoir','+20 Spark capacity again; +40 Spark capacity in total.','reserve','+20 Sparks cap',{choiceGroup:'vessel-style',excludes:['main-cache-feast']}),
 'main-cache-feast':node('main-cache-feast','Cache Feast',45,'main-reservoir','Large Sparks caches restore 8 extra Sparks.','fuel','Rich fuel',{choiceGroup:'vessel-style',excludes:['main-vast-vessel']}),
 'main-plummet':node('main-plummet','Falling Star',25,'main-speed','Fall acceleration +12%. Reach low packets sooner; react earlier near the floor.','dive','+12% fall',{choiceGroup:'fall-style',excludes:['main-drift']}),
 'main-deep-plummet':node('main-deep-plummet','Heavy Core',45,'main-plummet','Fall acceleration +6% more. Maximum fall speed +8%.','dive','Faster dive',{choiceGroup:'dive-style',excludes:['main-low-lift']}),
 'main-low-lift':node('main-low-lift','Low Arc',40,'main-plummet','Lift rises 8% less. Gain 10 Spark capacity.','lift','Low hops',{choiceGroup:'dive-style',excludes:['main-deep-plummet']}),
};
export function tuneMainDefinition(skill){
 if(skill.branch!=='main')return skill;
 const extra=skill.id==='main-drift'?{choiceGroup:'fall-style',excludes:['main-plummet']}:['main-tailwind','main-lift','main-kindling'].includes(skill.id)?{choiceGroup:undefined,excludes:[]}:{};
 const costs={'main-lift':25,'main-kindling':30,'main-tailwind':25,'main-drift':25,'main-horizon':30,'main-dawn':30};
 const labels={'main-lift':'−1 Lift cost','main-kindling':'+4 Sparks','main-tailwind':'+6% pace','main-drift':'−10% fall','main-horizon':'+1.3 wisp widths','main-dawn':'−40% dim','main-wide-beam':'+0.7 wisp widths','main-clear-beam':'−15% dim','main-dawn-guard':'−10% dim','main-dawn-fuel':'+3 Sparks','main-rising-current':'+4% Lift','main-soft-current':'−6% fall','main-light-step':'+3 capacity','main-rising-drift':'+4% Lift','main-gentle-rise':'−5% fall','main-thrifty-rise':'+3 capacity','main-inner-fire':'+3 Sparks','main-shared-fire':'+5 Sparks'};
 return {...skill,...extra,shortEffect:labels[skill.id]||skill.shortEffect,cost:costs[skill.id]??(skill.expansion?45:skill.cost)};
}

// Prices reflect one deliberate upgrade roughly every two ordinary clears.
// The free starting root remains free through chooseStartingSkill, not price 0.
export function priceSkillDefinition(s){
 // Small adjustments should compete with saving for a new rule, not cost the
 // same as a second life. General price growth still applies to all purchases.
 const utility={
  'main-speed':30,'main-tailwind':35,'main-sight':45,'main-glow-sense':55,'main-efficiency':90,
  'main-dream-long':30,'main-dream-deep':250,'main-drift-sense':25,'main-drift-sense-2':40,'main-drift-sense-3':70,
  'collector-last-orbit':155,'collector-far-search':50,'collector-rich-cargo':80,'collector-fleet-return':65,'collector-close-orbit':40,
  'collector-target-dense':20,'collector-target-flash':20,'collector-guard-repair':55,'main-clear-dividend':60,'collector-fetch-large':50,'collector-fetch-flash':30,
  'protector-cost':45,'protector-layers':90,'protector-clean-break':25,'protector-lasting-shell':25,'protector-thrifty-shell':55,'protector-returning-shell':65,
  'leveler-deep-dive':25,'leveler-ready-release':40,'leveler-quick-balance':45,'leveler-long-balance':55,
  'swift-long-spark':40,'swift-rapid-spark':55,'swift-storm-runner':25,'swift-sheltered-pace':35,
  'swift-duration':20,'leveler-duration':35,'main-edging-lasting':40,'main-edging-tension':35,
  'packing-hand-seal':20,'packing-deep-cache':35,
 };
 if(utility[s.id]!=null)return {...s,cost:utility[s.id]};
 if(s.branch==='proximity')return s;
 if(s.id==='main-fourth-beat'||s.id==='main-fourth-beat-2'||s.id==='main-long-flash')return s;
 if(s.id==='main-spare-spark')return{...s,cost:140};
 if(s.id==='main-deep-reserve')return{...s,cost:210};
 if(s.branch==='afterglow')return{...s,cost:30,prices:[30,35].slice(0,s.maxRank)};
 if(s.incrementStage){
  const prices={ 'collector-reach':[30,45,60],'collector-recovery':[45,60,80],
   'protector-recovery':[40,55,70],'leveler-steadiness':[25,40,55],
   'swift-recovery':[35,50,65],'swift-resistance':[20,30,45]};
  return {...s,cost:(prices[s.incrementBase]||[50,60,70])[s.incrementStage-1]};
 }
 if(s.id==='main-edging-attunement')return{...s,cost:80};
 if(s.id.endsWith('-attunement'))return{...s,cost:s.branch==='collector'?30:s.branch==='swift'?35:25};
 if(s.id.endsWith('-mastery'))return{...s,cost:s.branch==='swift'?55:45};
 const valuePrices={'main-glide-regen':85,'main-glide-regen-2':110,'main-lift':125,'main-dream-wake':30,'main-dream-sight':40,'main-echo-long':45,'main-echo-range':50,'main-recovery':50,'main-recovery-deep':55,'main-recovery-rescue':45,'main-recovery-challenge':45,'main-plummet':40,'main-deep-plummet':50,'main-tailwind':55,'main-drift':65,'main-kindled-touch':120,'main-kindled-rich':85,'main-dawnburst':130,'main-afterglow':110};
 if(valuePrices[s.id]!=null)return {...s,cost:valuePrices[s.id]};
 const prices={'main-sight':80,'main-speed':80,'main-efficiency':80,'main-drift-sense':25,'main-drift-sense-2':40,'main-drift-sense-3':70,'main-dream':90,'main-dream-long':30,'main-dream-deep':250,'main-dream-wake':80,'main-dream-sight':85,'main-afterglow':85,'main-reservoir':90,'main-vast-vessel':110,'main-purifying-touch':105,'main-kindled-rich':95,'main-dawnburst':100,'main-edging-lasting':100,'main-edging-tension':90,'main-edging-regeneration':100,'protector-layers':110,'leveler-dive':95};
 return{...s,cost:prices[s.id]??(s.expansion?105:100)};
}
