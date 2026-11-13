// Small, replayable lessons. One named mechanic per card; no simulated rewards.
const s=(title,text,visual)=>({title,text,visual});
export const TUTORIAL_TOPICS={
 flight:{name:'Lift & glide',visual:'lift',steps:[
  s('You are the wisp','Guide the bright orb through the passage. Reach the waylight at the end to clear a flight.','wisp'),
  s('Lift','Tap the scene or Lift button to rise. A normal Lift costs 3 Sparks; skills can reduce that cost.','lift'),
  s('Glide','Release to fall naturally. Small, deliberate Lifts leave more Sparks for the rest of the passage.','lift')]},
 sparks:{name:'Sparks',visual:'spark',steps:[
  s('Spark meter','The slim meter on the left is your fuel. Each filled cell pays for one Lift at your current cost.','meter'),
  s('Spark, Cluster, Cache','One, two or three bright layers give 6, 12 or 18 Sparks before build bonuses. Touch them with your wisp for immediate fuel.','spark-layers'),
  s('Empty is not dead','Without enough Sparks, you cannot Lift. You keep falling; a body pickup or Collector delivery can still rescue you.','meter')]},
 luminance:{name:'Luminance',visual:'luminance',steps:[
  s('Luminance','Luminance is how far your wisp lights the world. It fades with distance; faraway scenery and Sparks disappear into darkness.','luminance'),
  s('Fuel and seeing distance','Sparks power flight. Luminance reveals the route. Increasing one does not automatically increase the other.','luminance'),
  s('Grow your Luminance','The Light skill tree increases Luminance. Flash Sparks and some artifacts temporarily reveal more; Dark Sparks reduce it.','pickup:sight')]},
 utilities:{name:'Special Sparks',visual:'pickup:charge',steps:[
  s('Charge Spark','The cyan Charge Spark shortens companion recovery. Space Timer regains levitation charge. It does not refill Sparks.','pickup:charge'),
  s('Flash Spark','The violet Flash Spark extends Luminance for six seconds. It reveals more of the passage but gives no fuel.','pickup:sight'),
  s('Dusk Spark','The rose Dusk Spark trades reduced Luminance for fuel. Its red ring warns of the cost. Only body contact collects it.','pickup:dusk')]},
 terrain:{name:'Terrain & goals',visual:'route',steps:[
  s('Solid edges','Bright edges help separate collidable terrain from background scenery. Rock, trees, objects and screen bounds can end an unprotected attempt.','route'),
  s('Living scenery','A teal edge marks a helpful interaction. Blue marks a vent; orange warns of falling hazards. Biomes change the hazards: mushrooms, moving ice and falling masonry need different timing.','site:flight'),
  s('Optional challenges','The briefing previews a challenge and reward theme. Reaching the exit clears the flight even if you miss the challenge. Harder forks offer more risk and reward.','route')]},
 hearts:{name:'Hearts & death',visual:'life',steps:[
  s('One heart, one attempt','Hearts are chances for the whole run, not collision health. Hitting solid terrain or a screen edge without protection ends the attempt.','life'),
  s('A heart is lost','After your wisp scatters, one heart crumbles away. The remaining hearts tell you how many more attempts you have.','life-loss'),
  s('Choose your route again','With hearts left, return to the map. Retry the passage or choose another reachable path. Entry Sparks and your build return; failed-flight earnings do not.','route'),
  s('Rekindle or start again','Rest can refill missing hearts. Skills can raise their maximum. At zero hearts the run ends; New Game begins a fresh build.','rest')]},
 collector:{name:'Collector',visual:'companion:collector',steps:[
  s('Collector','The green companion rescues missed good Sparks inside its boundary. Your body gets the first chance to collect.','companion:collector'),
  s('Delivery, then recovery','Fuel arrives when Collector returns. Its boundary shrinks, then grows back. Very close rescues still work during recovery.','companion:collector'),
  s('Range is not Luminance','Collector range controls fetching. Luminance controls seeing. They are separate upgrades, even when their circles overlap.','luminance')]},
 companions:{name:'Companions',visual:'companion:protector',steps:[
  s('Protector','The blue companion builds a shield. A charged shell spends Sparks to deflect one collision, then rebuilds. An empty shell cannot save you.','companion:protector'),
  s('Runner','The amber companion activates with Power. Its short burst crosses ground quickly and resists drafts. Wait for the button to fill before using it again.','companion:swift'),
  s('Space Timer','The cyan companion levitates while you hold Lift or the scene. Release to fall and recharge. Drafts still push you.','companion:leveler'),
  s('Build a team','Change companions at Rest. Bond upgrades add slots. Collector alone fetches; the others provide protection, speed or control. Practice lets you try all four.','tools')]},
 packed:{name:'Packed Light',visual:'packed',steps:[
  s('Full meter → Packed Light','When a pickup overfills Sparks, the surplus becomes Packed Light. Clear the flight to keep those earnings.','packed'),
  s('Spend or save','The box of light is your upgrade currency. Spend it on run skills. Rest healing does not create Packed Light.','packed'),
  s('Condensation','The Condensation skill makes pickup surplus produce more Packed Light. It improves your run economy; it is not a second fuel bar.','skills')]},
 skills:{name:'Skill trees',visual:'skills',steps:[
  s('Choose a branch','Skills belong to this run. Light improves Luminance; Motion changes flight; Sparks improves fuel. Companion trees improve your equipped team.','skills'),
  s('Read the skill states','Blue check: owned. Gold plus: affordable now. Bronze price: save more Packed Light. Lock: learn its prerequisite first.','skill-states'),
  s('Commit to your build','Some forks exclude the other path. Read the selected effect before learning. You can upgrade after a flight or at Rest; a new run resets these skills.','skills')]},
 rewards:{name:'Flight rewards',visual:'artifact',steps:[
  s('Clear the passage','Reaching the waylight completes a flight. Some Sparks recover, and collected Packed Light is secured. A bonus challenge is optional.','route'),
  s('Choose one reward','Take one artifact, or take the Sparks alternative. The other rewards are left behind. This is a build decision after every flight.','artifact'),
  s('Upgrade before moving on','The Skills button appears when you can afford an upgrade. Spend now or save for a stronger branch before choosing the next path.','skills')]},
 artifacts:{name:'Artifacts & forge',visual:'artifact',steps:[
  s('Mount an artifact','Artifacts work automatically while mounted. If every slot is full, choose which artifact to replace; the replaced run artifact is lost.','artifact'),
  s('Rarity and uses','Grey is Common, green Rare, purple Legendary. Some effects last the run; consumables disappear when their uses run out. Read the effect and its trigger.','artifact-rarity'),
  s('Stacks and recharge','Matching consumables share one slot, up to three copies. A fourth melts into Packed Light. Rest can recharge mounted consumables.','artifact'),
  s('Keep OR Forge','At Rest, keep an artifact’s effect or forge it into Packed Light for skills. Forging destroys it and all remaining uses for one payout.','forge'),
  s('Build a combination','A defining artifact can evolve later in a real run. Pair effects with your companion and skill choices; check trigger conditions and per-flight limits.','artifact')]},
 rest:{name:'Rest',visual:'rest',steps:[
  s('Rest: choose one benefit','Grow & refill adds Spark capacity and fills it. Condense grants Packed Light. Rekindle restores missing hearts. Recharge restores mounted consumable uses.','rest'),
  s('Then prepare','After your one benefit, Skills, Companions, Artifacts and Dream remain available. These tools do not take another Rest benefit.','tools'),
  s('Plan your next passage','Rest commits to one next flight. Read its terrain and prepare for it. After a failed attempt, the map shows whichever retry paths are reachable.','route')]},
 dream:{name:'Dream',visual:'dream',steps:[
  s('Dream: rehearse six seconds','At Rest, Dream lets you practice the next opening as often as you like. The closed eye means rehearsal. Nothing here spends a heart or earns real rewards.','dream'),
  s('Save a preset','When you like an opening, save it. The next flight replays those inputs without Lift or sustain cost. Changes to the build can invalidate a preset.','dream'),
  s('Wake safely','Playback ends paused. Tap once to wake; tap again to Lift. After panels, the speed display rises from 0.1× to 1× over three seconds.','pause')]},
 routes:{name:'Paths & stops',visual:'route',steps:[
  s('Follow connected paths','Bright nodes are reachable. Dim nodes are not. Choosing a fork commits your route; you cannot jump to any stop on the map.','route'),
  s('Flight and elite routes','The arch marks Flight. Elite passages are harder and offer better rewards. Preview terrain, challenge and reward theme before committing.','site:flight'),
  s('Rest','The shelter marks Rest: choose one benefit, then prepare your build. Route toward one when you need hearts or a different companion.','site:rest'),
  s('Encounter and treasure','The encounter symbol offers a trade or event. The chest offers treasure. Check gains, costs and chances before choosing.','sites-support'),
  s('Guardian','The guardian symbol marks a boss. Survive its warned patterns and reach the finish. The final guardian ends the third map of a real run.','site:boss')]},
 hazards:{name:'Hazards & pulses',visual:'black-hole',steps:[
  s('Drafts','Local curls show where wind pushes. Fly around them or plan your Lift timing. Runner resists them; Space Timer still feels them.','draft'),
  s('Bad Sparks','Red rings mean danger or a cost. Dark Sparks reduce Luminance; Dusk Sparks trade Luminance for fuel. Collector ignores harmful pickups.','pickup:dark'),
  s('Black Hole','A black core is a hazard, not a pickup. It continuously steals Sparks nearby; closer means much faster drain. Give it space, even with a shield.','black-hole'),
  s('Edging Pulse','Skim near terrain without touching it to charge the slim edge meter. Full charge reveals the map in fading pulses. Skills can improve it or exchange the pulse for recovery.','edge')]},
 progression:{name:'Runs & Ascension',visual:'route',steps:[
  s('Three maps make a run','Sparks, hearts, skills and artifacts carry between flights and maps. Plan a build that can reach the final guardian.','route'),
  s('Ascension','Clear all three maps to unlock the next difficulty and new companions. Higher Ascensions make the journey harder and reduce starting artifact slots.','site:boss'),
  s('Continue or New Game','Continue resumes your saved run. Exit to Menu keeps it. Abandon and New Game reset run skills and currency; permanent unlocks remain. Tutorial is separate.','pause')]},
};
export const topicSteps=(id)=>TUTORIAL_TOPICS[id]?.steps.map(step=>({...step}))||[];
