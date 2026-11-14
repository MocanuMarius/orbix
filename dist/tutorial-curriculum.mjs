// Small, replayable lessons. One named mechanic per card; no simulated rewards.
const s=(title,text,visual)=>({title,text,visual});
export const TUTORIAL_TOPICS={
 flight:{name:'Lift & glide',visual:'lift',steps:[
  s('You are the wisp','Guide the bright orb through the passage. Reach the waylight at the end to clear a flight.','wisp'),
  s('Lift','Tap the scene or Lift button to rise. A normal Lift costs 3 Energy; skills can reduce that cost.','lift'),
  s('Glide','Release to fall naturally. Small, deliberate Lifts leave more Energy for the rest of the passage.','lift')]},
 sparks:{name:'Sparks & Energy',visual:'spark',steps:[
  s('Energy meter','Sparks are pickups. Energy is the fuel inside them, shown by the lightning icon. Each meter cell pays for one Lift at your current cost.','meter'),
  s('Spark, Cluster, Cache','One, two or three bright layers give 6, 12 or 18 Energy before build bonuses. Touch them with your wisp for immediate fuel.','spark-layers'),
  s('Empty is not dead','Without enough Energy, you cannot Lift. You keep falling; a body pickup or Collector delivery can still rescue you.','meter')]},
 luminance:{name:'Luminance',visual:'luminance',steps:[
  s('Luminance','Luminance is how far your wisp lights the world. It fades with distance; faraway scenery and Sparks disappear into darkness.','luminance'),
  s('Fuel and seeing distance','Energy powers flight. Luminance reveals the route. Increasing one does not automatically increase the other.','luminance'),
  s('Grow your Luminance','The Light skill tree increases Luminance. Flash Sparks and some artifacts temporarily reveal more; Dark Sparks reduce it.','pickup:sight')]},
 utilities:{name:'Special Sparks',visual:'pickup:charge',steps:[
  s('Charge Spark','The cyan Charge Spark shortens companion recovery. Space Timer regains levitation charge. It does not refill Energy.','pickup:charge'),
  s('Flash Spark','The violet Flash Spark extends Luminance for six seconds. It reveals more of the passage but gives no fuel.','pickup:sight'),
  s('Dusk Spark','The rose Dusk Spark trades reduced Luminance for fuel. Its red ring warns of the cost. Only body contact collects it.','pickup:dusk')]},
 terrain:{name:'Terrain & goals',visual:'route',steps:[
  s('Solid edges','Bright edges help separate collidable terrain from background scenery. Rock, trees and solid objects can end an unprotected attempt. Open sky only ends it once the whole wisp leaves the screen.','route'),
  s('Living scenery','A teal edge marks a helpful interaction. Blue marks a vent; orange warns of falling hazards. Biomes change the hazards: mushrooms, moving ice and falling masonry need different timing.','site:flight'),
  s('Optional challenges','The briefing previews a challenge and reward theme. Reaching the exit clears the flight even if you miss the challenge. Harder forks offer more risk and reward.','route')]},
 hearts:{name:'Hearts & death',visual:'life',steps:[
  s('One heart, one attempt','Hearts are chances for the whole run, not collision health. Hitting solid terrain or fully leaving the screen without protection ends the attempt.','life'),
  s('A heart is lost','After your wisp scatters, one heart crumbles away. The remaining hearts tell you how many more attempts you have.','life-loss'),
  s('Choose your route again','With hearts left, return to the map. Retry the passage or choose another reachable path. Entry Sparks and your build return; failed-flight earnings do not.','route'),
  s('Recover or start again','Choose Recover at Rest to refill missing hearts. Skills can raise their maximum. At zero hearts the run ends; New Game begins a fresh build.','rest')]},
 collector:{name:'Collector',visual:'companion:collector',steps:[
  s('Automatic helper','Collector is the green orb. It fetches helpful Sparks automatically. You do not press Power to send it.','companion:collector'),
  s('You collect first','Touch a Spark with your main wisp for immediate Energy. Collector waits for your body to have its chance, then rescues a missed Spark within its boundary.','collector-range'),
  s('Wait for delivery','The companion flies out, takes one Spark and brings it home. Energy arrives only on return. Farther Sparks take longer: do not rely on an instant rescue when nearly empty.','collector-return'),
  s('Watch the boundary','After delivery, the green boundary contracts and regrows over 10 seconds. A nearby Spark can still be fetched during recovery if it is inside the smaller boundary.','collector-recovery'),
  s('Read the Power indicator','For Collector, the filling button shows current range, not an ability to press. A full indicator means maximum reach. Red-ring Sparks are left for you to choose.','companion:collector'),
  s('Upgrade the right reach','Collector skills improve fetching range, delivery and recovery. Light skills improve Luminance: how far you see. Fetching range and seeing distance are different.','luminance')]},
 companions:{name:'Companions',visual:'companion:protector',steps:[
  s('One helper at a time','Choose one companion. Only Collector fetches Sparks; every other role relies on body pickups. Choose on the main screen for the whole run. Improve that role through its skill tree.','companion:collector'),
  s('Protector · automatic','The blue orb rebuilds a visible shell around you. A charged shell spends Energy to deflect a collision and push you clear. No button press is needed.','companion:protector'),
  s('A shield is not immunity','After a deflection, the broken shell must rebuild. Without a charge or enough Energy, a collision ends the attempt. It cannot stop a Black Hole draining Energy.','companion:protector'),
  s('Runner · press Power','The amber orb gives a short forward burst when you press Power. It resists drafts but does not protect against terrain. Pick a clear stretch before accelerating.','companion:swift'),
  s('Runner · wait for refill','The Power button empties after a burst and fills during cooldown. When full, its ready sparkle means you can burst again. Runner never fetches Sparks.','companion:swift'),
  s('Space Timer · hold to hover','With the cyan orb, hold the scene or Lift to levitate. Charge drains only while held. You still bob gently and drafts can push you.','companion:leveler'),
  s('Space Timer · release to glide','Release to fall and recharge. Empty charge ends levitation. Short holds help line up body pickups; upgrades can extend charge, steady the bob or add a release dive.','companion:leveler')]},
 packed:{name:'Packed Sparks',visual:'clear-reward',steps:[
  s('A reward for every clear','Ordinary flights earn 20 Packed Sparks for run skills. Elite and guardian victories also offer two artifacts: choose one. The third guardian ends the run with victory.','clear-reward'),
  s('Overflow is a bonus','When a pickup overfills Sparks, the surplus becomes extra Packed Sparks. Clear the flight to keep them. Rest refills do not create Packed Sparks.','packed'),
  s('Packing','Packing starts at 6 surplus Energy for 1 Packed Spark. Efficient Packing and Prism Vessel each improve the yield. It improves your run economy; it is not a second fuel bar.','skills')]},
 skills:{name:'Skill trees',visual:'skills',steps:[
  s('Choose a branch','Skills belong to this run. Light improves Luminance; Motion changes flight; Sparks improves fuel. Your companion tree improves the one role you equipped.','skills'),
  s('Read the skill states','Blue check: owned. Gold plus: affordable now. Bronze price: save more Packed Sparks. Lock: learn its prerequisite first.','skill-states'),
  s('Commit to your build','Some forks exclude the other path. Read the selected effect before learning. You can upgrade after a flight or at Rest; a new run resets these skills.','skills')]},
 rewards:{name:'Flight rewards',visual:'artifact',steps:[
  s('Clear the passage','Reaching the waylight completes a flight. Before the final guardian, earn 20 Packed Sparks plus pickup overflow. Some Sparks recover for the next flight. A bonus challenge is optional.','clear-reward'),
  s('Choose one artifact','Elite and guardian victories offer two artifacts. Choose one automatic effect to add to this run. Ordinary flights reward Packed Sparks, without an artifact choice.','artifact'),
  s('Upgrade before moving on','The Skills button appears when you can afford an upgrade. Spend now or save for a stronger branch before choosing the next path.','skills')]},
 artifacts:{name:'Artifacts',visual:'artifact',steps:[
  s('Collect an artifact','Choose one of two artifacts after an elite or guardian victory. It works automatically alongside your other artifacts, without slots or replacements.','artifact'),
  s('Rarity and uses','Grey is Common, green Rare, purple Legendary. Some effects last the run; consumables disappear when their uses run out. Read the effect and its trigger.','artifact-rarity'),
  s('Melt at Rest','After choosing your Rest benefit, you may melt an owned artifact for Packed Sparks: Common 25, Rare 35, Legendary 50. It destroys the effect and every remaining use. Keep it or fund skills.','forge'),
  s('Build a combination','Pair automatic effects with your companion, skills and the next biome. Read each trigger and limit. Artifacts last only for this run; exhausted consumables disappear.','artifact')]},
 rest:{name:'Rest',visual:'rest',steps:[
  s('Recover or Grow','Recover restores every missing heart. Grow adds 3 maximum Energy for this run, up to three times. Both completely refill Energy. Choose once at each Rest.','rest'),
  s('Then prepare','After your one benefit, Skills, Artifacts and Dream remain available. These tools do not take another Rest benefit.','tools'),
  s('Plan your next passage','Rest commits to one next flight. Read its terrain and prepare for it. After a failed attempt, the map shows whichever retry paths are reachable.','route')]},
 dream:{name:'Dream',visual:'dream',steps:[
  s('Dream: rehearse six seconds','At Rest, Dream lets you practice the next opening as often as you like. The closed eye means rehearsal. Nothing here spends a heart or earns real rewards.','dream'),
  s('Save a preset','When you like an opening, save it. The next flight replays those inputs without Lift or sustain cost. Changes to the build can invalidate a preset.','dream'),
  s('Wake safely','Playback ends paused. Tap once to wake; tap again to Lift. After the 3–2–1 countdown, speed rises from 0.1× to 1× over three seconds.','pause')]},
 routes:{name:'Paths & stops',visual:'route',steps:[
  s('Follow connected paths','Bright nodes are reachable. Dim nodes are not. Choosing a fork commits your route; you cannot jump to any stop on the map.','route'),
  s('Flight and elite routes','Passage markers mean ordinary Flight. Creature portraits mark harder Elite routes with a two-artifact choice. Inspect the biome and length before committing.','site:flight'),
  s('Rest','The campfire marks Rest: choose one benefit, then prepare your build. Route toward one when you need hearts or build preparation.','site:rest'),
  s('Encounter and treasure','The encounter symbol offers a trade or event. The chest offers treasure. Check gains, costs and chances before choosing.','sites-support'),
  s('Guardian','A large guardian portrait marks the end of each map. Survive its warned patterns and reach the finish. Three different guardians stand between you and a completed run.','site:boss')]},
 hazards:{name:'Hazards & pulses',visual:'black-hole',steps:[
  s('Drafts','Local curls show where wind pushes. Fly around them or plan your Lift timing. Runner resists them; Space Timer still feels them.','draft'),
  s('Bad Sparks','Red rings mean danger or a cost. Dark Sparks reduce Luminance; Dusk Sparks trade Luminance for fuel. Collector ignores harmful pickups.','pickup:dark'),
  s('Black Hole','A black core is a hazard, not a pickup. It continuously steals Energy nearby; closer means much faster drain. Give it space, even with a shield.','black-hole'),
  s('Proximity · an earned skill','Buy the first Proximity skill to unlock surface charging. Skim solid terrain without touching it; full charge reveals the scene. Its separate tree offers recovery and a temporary light shield. Open sky never charges it.','edge')]},
 progression:{name:'Runs & Ascension',visual:'route',steps:[
  s('Three maps make a run','Energy, hearts, skills and artifacts carry between flights and maps. Plan a build that can reach the final guardian.','route'),
  s('Ascension','Clear all three maps to unlock the next difficulty and new companions. Higher Ascensions make the journey harder. Winning ends the run. Start a separate New Game to try another Ascension; run fuel, skills, currency and artifacts never carry over.','site:boss'),
  s('Continue or New Game','Continue resumes your saved run. Exit to Menu keeps it. Abandon and New Game reset run skills and currency; permanent unlocks remain. Short lessons appear as you progress. Reset tutorial in Settings to replay them.','pause')]},
};
export const topicSteps=(id)=>TUTORIAL_TOPICS[id]?.steps.map(step=>({...step}))||[];
