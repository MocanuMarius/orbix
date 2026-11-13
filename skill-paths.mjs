import {skillProgress} from './skill-increments.mjs?v=skill-forge-1';
// Named, one-time specialisations. Each pair is exclusive for this run.
const paths=[];
function fork(branch,parent,a,b){
  const group=parent+'-depth';
  for(const [own,other] of [[a,b],[b,a]]){
    const [suffix,name,description,add={},multiply={}]=own;
    paths.push({id:branch+'-'+suffix,name,branch,cost:120,maxRank:1,requires:parent,
      description,icon:({lightRadius:'radiance',darkResistance:'ward',collectorFuelBonus:'fuel',collectorMinimum:'reach',attract:'reach',wispCooldown:'recovery',protectorProtection:'ward',protectorCost:'ward',protectorRecovery:'recovery',levelerDuration:'duration',levelerRecovery:'recovery',levelerDive:'dive',swiftDuration:'swift',swiftRecovery:'recovery',swiftResistance:'wind',seerRadius:'sight',seerDuration:'duration',seerRecovery:'recovery',kindlerBonus:'fuel',flapCost:'thrift',purifyCooldown:'recovery',purifyFuel:'purify',flap:'lift',gravity:'feather',cacheFuelBonus:'fuel'})[Object.keys(add)[0]||Object.keys(multiply)[0]],choiceGroup:group,excludes:[branch+'-'+other[0]],expansion:true,add,multiply});
  }
}
fork('collector','collector-reach',
 ['far-search','Far Search','Search 15% farther; recovery takes 10% longer.',{}, {attract:1.15,wispCooldown:1.10}],
 ['rich-cargo','Rich Cargo','Fetched fuel adds 4 Glow; search radius is 5% smaller.',{collectorFuelBonus:4},{attract:.95}]);
fork('collector','collector-recovery',
 ['fleet-return','Fleet Return','Recover 15% faster; search radius is 5% smaller.',{},{wispCooldown:.85,attract:.95}],
 ['close-orbit','Close Orbit','Minimum recovering radius grows from 18 to 30; full recovery takes 10% longer.',{collectorMinimum:12},{wispCooldown:1.10}]);
fork('protector','protector-recovery',
 ['clean-break','Clean Break','Deflection grants 0.2 seconds more protection; costs 2 more Glow.',{protectorProtection:.2,protectorCost:2}],
 ['thrifty-shell','Thrifty Shell','Shell costs 20% less Glow; recovery takes 10% longer.',{},{protectorCost:.8,protectorRecovery:1.1}]);
fork('protector','protector-layers',
 ['returning-shell','Returning Shell','Shell recovery is 15% faster; each deflection costs 2 extra Glow.',{protectorCost:2},{protectorRecovery:.85}],
 ['lasting-shell','Lasting Shell','Deflection grants 0.2 seconds more protection; recovery takes 10% longer.',{protectorProtection:.2},{protectorRecovery:1.1}]);
fork('leveler','leveler-steadiness',
 ['long-balance','Long Balance','Hold altitude 20% longer; recharge takes 10% longer.',{},{levelerDuration:1.2,levelerRecovery:1.1}],
 ['quick-balance','Quick Balance','Recharge 18% faster; hold is 10% shorter.',{},{levelerRecovery:.82,levelerDuration:.9}]);
fork('leveler','leveler-dive',
 ['deep-dive','Deep Dive','Release dive is 20% stronger; hold is 10% shorter.',{},{levelerDive:1.2,levelerDuration:.9}],
 ['ready-release','Ready Release','Recharge 15% faster; release dive is 15% gentler.',{},{levelerRecovery:.85,levelerDive:.85}]);
fork('swift','swift-recovery',
 ['long-spark','Long Spark','Surge lasts 15% longer; recharge takes 10% longer.',{},{swiftDuration:1.15,swiftRecovery:1.1}],
 ['rapid-spark','Rapid Spark','Recharge 15% faster; surge is 10% shorter.',{},{swiftRecovery:.85,swiftDuration:.9}]);
fork('swift','swift-resistance',
 ['storm-runner','Storm Runner','Wind resistance rises 4 percentage points; recharge takes 10% longer.',{swiftResistance:.04},{swiftRecovery:1.1}],
 ['sheltered-pace','Sheltered Pace','Recharge 15% faster; wind resistance falls 8 percentage points.',{swiftResistance:-.08},{swiftRecovery:.85}]);
fork('main','main-horizon',
 ['wide-beam','Wide Beam','Expand your circular light radius by another 25.',{lightRadius:25}],
 ['clear-beam','Clear Beam','Dark Seeds dim your light 15 percentage points less.',{darkResistance:.15}]);
fork('main','main-dawn',
 ['dawn-guard','Dawn Guard','Dark Seeds dim your light another 10 percentage points less.',{darkResistance:.1}],
 ['dawn-fuel','Dawn Fuel','Natural fuel pickups restore 3 extra Glow.',{cacheFuelBonus:3}]);
fork('main','main-tailwind',
 ['rising-current','Updraft','Lift is 4% stronger.',{},{flap:1.04}],
 ['soft-current','Soft Current','Fall 6% more gently.',{},{gravity:.94}]);
fork('main','main-drift',
 ['light-step','Light Step','Lift costs 5% less Glow.',{},{flapCost:.95}],
 ['rising-drift','Rising Drift','Lift is 4% stronger.',{},{flap:1.04}]);
fork('main','main-lift',
 ['gentle-rise','Gentle Rise','Fall 5% more gently.',{},{gravity:.95}],
 ['thrifty-rise','Thrifty Rise','Lift costs 5% less Glow.',{},{flapCost:.95}]);
fork('main','main-kindling',
 ['inner-fire','Inner Fire','Natural fuel pickups restore another 3 Glow.',{cacheFuelBonus:3}],
 ['shared-fire','Shared Fire','Collector-delivered fuel restores 5 extra Glow. Requires an equipped Collector to benefit.',{collectorFuelBonus:5}]);
export const EXPANDED_SKILLS=Object.freeze(Object.fromEntries(paths.map(p=>[p.id,Object.freeze(p)])));
export function applyExpandedSkills(modifiers,skills,companions=[]){
  for(const path of paths)if(skillProgress(skills,path.id)>0&&(path.branch==='main'||companions.includes(path.branch))){
    for(const [key,value] of Object.entries(path.add))modifiers[key]=(modifiers[key]||0)+value*skillProgress(skills,path.id);
    for(const [key,value] of Object.entries(path.multiply))modifiers[key]*=1+(value-1)*skillProgress(skills,path.id);
  }
}
