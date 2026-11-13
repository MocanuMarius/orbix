// Main-wisp paths favour distinct decisions over repeated identical ranks.
const node=(id,name,cost,requires,description,icon,shortEffect,extra={})=>({id,name,branch:'main',cost,maxRank:1,requires,description,consequence:description,icon,shortEffect,...extra});
export const MAIN_TUNING_SKILLS={
 'main-echo-sight':node('main-echo-sight','Echo Sight',35,'main-sight','Natural Glow pickups cast light farther ahead for 2 seconds. Recharges in 8 seconds. Works with any companion.','sight','Pickup vision'),
 'main-echo-long':node('main-echo-long','Lingering Echo',35,'main-echo-sight','Echo Sight lasts 1 second longer.','duration','+1s vision'),
 'main-echo-range':node('main-echo-range','Far Echo',40,'main-echo-sight','Echo Sight reaches 50 farther ahead.','sight','+50 reach'),
 'main-kindled-touch':node('main-kindled-touch','Kindled Touch',35,'main-efficiency','Direct natural fuel pickups restore 6 extra Glow. Companion deliveries keep their usual value.','fuel','Direct +6 Glow'),
 'main-kindled-rich':node('main-kindled-rich','Bright Touch',40,'main-kindled-touch','Direct natural fuel pickups restore another 4 Glow.','fuel','Direct +4 Glow'),
 'main-purifying-touch':node('main-purifying-touch','Purifying Touch',45,'main-kindled-touch','Touch a Dark Seed to turn it into 12 Glow instead of dimming. Recharges in 10 seconds.','purify','Cleanse seeds'),
 'main-dream':node('main-dream','Dream',35,'main-sight','At a Rest, rehearse the next flight’s first 4 seconds freely. Preset a successful opening to replay without Lift or sustain cost.','dream','Dream 4s'),
 'main-dream-long':node('main-dream-long','Long Dream',40,'main-dream','Extend rehearsals and preset playback to 6 seconds.','dream','Dream 6s'),
 'main-dream-deep':node('main-dream-deep','Deep Dream',55,'main-dream-long','Extend rehearsals and preset playback to 8 seconds.','dream','Dream 8s'),
 'main-dream-wake':node('main-dream-wake','Gentle Awakening',30,'main-dream','After waking and tapping to resume, ease back to full speed over 3 seconds.','dream','Soft wake'),
 'main-dream-sight':node('main-dream-sight','Lucid Sight',35,'main-dream','See farther during Dream rehearsals to plan your opening.','sight','Lucid sight'),
 'main-recovery':node('main-recovery','Renewal',30,'main-efficiency','Recover 5% more maximum Glow after each flight: 55% total.','recovery','+5% recovery'),
 'main-recovery-deep':node('main-recovery-deep','Deep Renewal',45,'main-recovery','Recover another 5% maximum Glow after each flight: 60% total.','recovery','+5% recovery'),
 'main-recovery-rescue':node('main-recovery-rescue','Last Spark',40,'main-recovery','Finish below 20% Glow to recover an extra 10% of maximum Glow.','recovery','Low Glow aid'),
 'main-recovery-challenge':node('main-recovery-challenge','Earned Rest',40,'main-recovery','Completing the optional flight challenge restores an extra 10% maximum Glow.','recovery','Challenge +10%'),
 'main-afterglow':node('main-afterglow','Afterglow',35,'main-efficiency','Unlock a 30 Glow reserve. Excess victory recovery becomes Afterglow, spent before your Glow during flight.','reserve','Overflow reserve'),
 'main-glow-sense':node('main-glow-sense','Glow Sense',40,'main-sight','Faint glimmers at the forward edge of your light hint at the height of approaching Glow and other boons. They fade as pickups become visible.','beacon','Boon sense'),
 'main-drift-sense':node('main-drift-sense','Drift Sense I',40,'main-speed','A faint guide previews the next 0.7s if you release Lift and let gravity carry you. Accounts for drafts and your build.','trajectory','0.7s guide'),
 'main-drift-sense-2':node('main-drift-sense-2','Drift Sense II',55,'main-drift-sense','Extend the no-Lift guide to 1.2s. Plan your descent toward fuel lights.','trajectory','1.2s guide'),
 'main-drift-sense-3':node('main-drift-sense-3','Drift Sense III',75,'main-drift-sense-2','See up to 1.8s ahead, with a faint wisp marking the first predicted contact or the end of the guide.','trajectory','1.8s + echo'),
 'main-dawnburst':node('main-dawnburst','Dawnburst',45,'main-sight','Collect Glow to reveal the whole screen for 1.5s, then fade over 1.2s. More pickups refresh the light.','dawn','Pickup dawn'),
 'main-reservoir':node('main-reservoir','Deep Vessel',30,'main-efficiency','Maximum Glow capacity +20% of base. Recovery Rests fill the larger vessel.','reserve','+20% cap'),
 'main-vast-vessel':node('main-vast-vessel','Boundless Vessel',50,'main-reservoir','Maximum Glow capacity +20% of base again; +40% total.','reserve','+20% cap',{choiceGroup:'vessel-style',excludes:['main-cache-feast']}),
 'main-cache-feast':node('main-cache-feast','Cache Feast',45,'main-reservoir','Large Glow caches restore 8 extra Glow.','fuel','Rich fuel',{choiceGroup:'vessel-style',excludes:['main-vast-vessel']}),
 'main-plummet':node('main-plummet','Falling Star',25,'main-speed','Fall acceleration +12%. Reach low packets sooner; react earlier near the floor.','dive','+12% fall',{choiceGroup:'fall-style',excludes:['main-drift']}),
 'main-deep-plummet':node('main-deep-plummet','Heavy Core',45,'main-plummet','Fall acceleration +6% more. Maximum fall speed +8%.','dive','Faster dive',{choiceGroup:'dive-style',excludes:['main-low-lift']}),
 'main-low-lift':node('main-low-lift','Low Arc',40,'main-plummet','Lift rises 8% less and costs 8% less Glow. Shorter hops for low passages.','lift','Low hops',{choiceGroup:'dive-style',excludes:['main-deep-plummet']}),
};
export function tuneMainDefinition(skill){
 if(skill.branch!=='main')return skill;
 const extra=skill.id==='main-drift'?{choiceGroup:'fall-style',excludes:['main-plummet']}:['main-tailwind','main-lift','main-kindling'].includes(skill.id)?{choiceGroup:undefined,excludes:[]}:{};
 const costs={'main-lift':25,'main-kindling':30,'main-tailwind':25,'main-drift':25,'main-horizon':30,'main-dawn':30};
 const labels={'main-lift':'−6% effort','main-kindling':'+4 Glow','main-tailwind':'+4% pace','main-drift':'−10% fall','main-horizon':'+45 sight','main-dawn':'−40% dim','main-wide-beam':'+25 sight','main-clear-beam':'−15% dim','main-dawn-guard':'−10% dim','main-dawn-fuel':'+3 Glow','main-rising-current':'+4% Lift','main-soft-current':'−6% fall','main-light-step':'−5% effort','main-rising-drift':'+4% Lift','main-gentle-rise':'−5% fall','main-thrifty-rise':'−5% effort','main-inner-fire':'+3 Glow','main-shared-fire':'+5 Glow'};
 return {...skill,...extra,shortEffect:labels[skill.id]||skill.shortEffect,cost:costs[skill.id]??(skill.expansion?45:skill.cost)};
}
