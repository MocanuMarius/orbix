// Small, replayable lessons. One named mechanic per card; no simulated rewards.
const s=(title,text,visual)=>({title,text,visual});
export const TUTORIAL_TOPICS={
 flight:{name:'Lift & glide',visual:'lift',steps:[
  s('You are the wisp','Guide the bright orb through the passage. Reach the waylight at the end to clear a flight.','wisp'),
  s('Lift','Tap the scene or Lift button to rise. A normal Lift costs 3 Sparks; skills can reduce that cost.','lift'),
  s('Glide','Release to fall naturally. Small, deliberate Lifts leave more Sparks for the rest of the passage.','lift')]},
 sparks:{name:'From Spark to Stored Sparks',visual:'spark-storage',steps:[
  s('Spark Meter','Touch a Spark to refill the meter on the left. Each lit division pays for one Lift.','meter'),
  s('Read the glow','All fuel Sparks share one shell size. Sparse arcs give 6 Sparks, medium arcs give 12, and dense arcs give 18.','spark-layers'),
  s('Store the surplus','A full meter sends surplus to the upper-left box. Open Skills to spend your Stored Sparks.','spark-storage')]},
 luminance:{name:'Luminance',visual:'luminance',steps:[
  s('Luminance','Luminance is how far your wisp lights the world. It fades with distance; faraway scenery and Sparks disappear into darkness.','luminance'),
  s('Sparks and sight','Sparks pay for Lift. Luminance reveals the route around your wisp.','luminance'),
  s('See farther','Open the Luminance chapter. Luminance widens your light. Spark Sense lets you sense nearby pickups through fog. Long Flare extends the white triangle’s light from 8 to 24 seconds.','pickup:sight')]},
 utilities:{name:'Flare & hazards',visual:'pickup:sight',steps:[
  s('Flare Powerup','Catch the white triangle. It follows on a thread, sends a Pulse every 2 seconds and raises your Luminance very high. The puff means its light has run out.','pickup:sight'),
  s('Dusk Spark','The split rose crescent drains up to 3 Sparks and dims Luminance by 20% for 4 seconds. Dusk Wick pays its bonus after the drain. Only body contact collects it.','pickup:dusk'),
  s('Dark Spark','A Dark Spark dims your view for up to eight seconds. Collecting a fuel Spark clears one dimming effect. Collector leaves the red Spark alone.','pickup:dark')]},
 lanterns:{name:'Darkness Lanterns',visual:'lantern-icon',steps:[
  s('Read the pair','Paired lanterns mark Hollow Sun’s chapter. Watch the roof and floor. A lens glows gold before it opens. The crossing is darkest where the two beams overlap.','lantern-pair'),
  s('Cast a reverse shadow','Fly between a lantern and the rock. Your wisp blocks the darkness, leaving a wedge of light on the far side. Move sideways to sweep it across the rock.','lantern-wedge'),
  s('Break through','Luminance widens the clear space around you. Catch the white Flare triangle before the crossing to see rock edges farther into the dark.','lantern-flash')]},
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
  s('Automatic helper','Collector is the green orb. The pickup’s lower shell flows into a small green circle when Collector can fetch that type automatically. No Power press is needed.','companion:collector'),
  s('You collect first','Touch a Spark with your main wisp for immediate Sparks. Collector waits for your body to have its chance, then rescues a missed Spark within its orbit.','collector-range'),
  s('Wait for delivery','Collector catches the small green circle and reels the intact pickup along a tether to your moving wisp. Sparks arrive on contact. A farther pickup has farther to reel.','collector-return'),
  s('Watch the reel','Recovery and reeling start together. Collector stays busy until the intact pickup touches your wisp, then is ready for another search. A green circle keeps marking each fetchable type.','collector-recovery'),
  s('Read the Power indicator','For Collector, the filling button shows current range, not an ability to press. A full indicator means maximum reach. Red-ring Sparks are left for you to choose.','companion:collector'),
  s('Upgrade the right reach','The Collector chapter improves fetching range, delivery and recovery. Luminance has a separate chapter for how far you see.','luminance'),
  s('Last Orbit','Learn Last Orbit to catch a fatal impact when Collector is home and its green ring is full. After a rescue, collect Sparks yourself for four normal recovery cycles.','collector-recovery'),
  s('Field Impulse','Learn Field Impulse after Search Spark. Swipe the playfield: up to levitate, down to dive, right to surge. A larger recovered ring gives more power; each swipe spends the ring and temporarily reduces its orbit. Tap to Lift on release. The Lift button stays instant.','collector-range')]},
 companions:{name:'Companions',visual:'companion:collector',steps:[
  s('Your companion','The green Collector accompanies you throughout the run. The three other portraits in the roster are locked.','companion:collector'),
  s('Read the range','Collector’s orbit shows the reach of its next search. Reeling keeps it busy until pickup contact; a normal delivery ends ready. Field Impulse spends reach and its smaller orbit grows during recovery.','collector-recovery'),
  s('Choose its loads','Collector starts with Sparks and Clusters. Cache Handling unlocks Caches; Flare Handling unlocks white triangles. A small green circle appears below each newly fetchable type when handling is learned. Caches arrive as 12-Spark Clusters.','collector-return'),
  s('Build your Collector','Open the Collector chapter in Skills to change its reach or recovery. Last Orbit lets a fully ready Collector catch a fatal impact.','collector-range')]},
 packed:{name:'Stored Sparks',visual:'clear-reward',steps:[
  s('A reward for every clear','Every flight earns Stored Sparks and a card to choose from three. The guardians of maps 1 and 2 also offer two Inscriptions: choose one. The third guardian ends the run with victory.','clear-reward'),
  s('Overflow is a bonus','When a pickup overfills Sparks, the surplus becomes extra Stored Sparks. Clear the flight to keep them. Rest refills do not create Stored Sparks.','packed'),
  s('Your skill book','Browse the chapters to see where a perk leads. Can learn shows every upgrade you can afford, including skills for your chosen companion.','skills'),
  s('Glide Regeneration','Find it in Flight. Stop pressing Lift and fall unassisted to recover Sparks after a delay. Hovering, boosting, dreams and pauses do not regenerate Sparks.','meter'),
  s('Storing surplus','At first, 6 surplus Sparks make 1 Stored Spark. Learn Storage in the skill book to double that rate. Later ranks improve the yield further.','skills'),
  s('Kept Light','Carry 80 Stored Sparks into a flight and clear it to earn 4 extra at rank one, or 8 at rank two. Kept Light pays up to 5 or 10 per clear before the final guardian.','packed')]},
 skills:{name:'Skill book',visual:'skills',steps:[
  s('Choose a chapter','Flight improves Lift and fuel. Luminance helps you see the passage. Your companion has a chapter of its own. Learned skills are permanent.','skills'),
  s('Read the skill states','Blue means Owned. Gold means Can learn. Grey shows how much more to save. A lock points to the prerequisite you need. Each rank is a separate perk.','skill-states'),
  s('Commit to your build','Following a prerequisite chain keeps its next upgrades cheaper. Specializing leaves fewer Stored Sparks for other paths. Some forks close their alternative permanently.','skills')]},
 rewards:{name:'Flight rewards',visual:'artifact',steps:[
  s('Clear the passage','Reaching the waylight completes a flight. Before the final guardian, earn a length-based Stored Sparks reward plus pickup overflow. Some Sparks recover for the next flight. A bonus challenge is optional.','clear-reward'),
  s('Choose one Inscription','Guardian victories on maps 1 and 2 offer two Inscriptions from the Scribe. Choose one, then pick the slot of your Chain to write it on. Elite and ordinary flights give Stored Sparks and a card, without an Inscription.','artifact'),
  s('Upgrade any time','Tap the Stored Sparks box to open Skills. Flight pauses while you choose. New overflow becomes spendable when you clear the flight.','skills')]},
 artifacts:{name:'Inscriptions',visual:'artifact',steps:[
  s('What an Inscription is','An Inscription is written on a slot of your Chain. It changes the card in that slot, or works on its own.','artifact'),
  s('Choose at the Scribe','After a guardian victory, pick one of two Inscriptions, then the slot to write it on. A slot holds one Inscription; writing a new one asks you to confirm and replaces the old.','artifact'),
  s('Build a combination','Place each Inscription where it helps: some change the card in their slot, others work on an empty slot. Check the plaque on the slot before you choose.','artifact')]},
 rest:{name:'Rest',visual:'rest',steps:[
  s('Recover or Grow','Recover restores every missing heart. Grow adds 3 Spark capacity permanently, up to three times. Both completely refill Sparks. Choose once at each Rest.','rest'),
  s('Then prepare','After Recover or Grow, open Skills to learn a perk. It is optional. Leave Rest when you’re ready.','tools'),
  s('Plan your next passage','Each Rest leads to one known flight. Inspect its terrain and prepare. If you lose a heart there, you can retry that same passage.','route')]},
 dream:{name:'Dream',visual:'dream',steps:[
  s('Dream: rehearse eight seconds','With Dream learned, choosing a flight opens a golden rehearsal. Follow the timer and practise the opening for free.','dream'),
  s('Sleep or wake','Go back to sleep to practise again. Wake up at the end of your chosen opening with its pickups and free Lifts.','dream'),
  s('Wake safely','The passage returns to ordinary light and waits. Tap once to resume, then tap again to Lift.','pause')]},
 routes:{name:'Paths & stops',visual:'route',steps:[
  s('Follow connected paths','Bright nodes are reachable. Dim nodes are not. Choosing a fork commits your route; you cannot jump to any stop on the map.','route'),
  s('Flight and elite routes','Passage markers mean ordinary Flight. Creature portraits mark harder Elite routes. Inspect the biome and length before committing.','site:flight'),
  s('Rest','The campfire marks Rest. Choose Recover for missing hearts or Grow for a larger Spark Meter. Both refill your meter.','site:rest'),
  s('Encounter and treasure','The encounter symbol offers a trade or event. The chest offers treasure. Check gains, costs and chances before choosing.','sites-support'),
  s('Guardian','A large guardian portrait marks the end of each map. Survive its warned patterns and reach the finish. Three different guardians stand between you and a completed run.','site:boss')]},
 hazards:{name:'Hazards & pulses',visual:'black-hole',steps:[
  s('Drafts','Local curls show where wind pushes. Leave room to drift or time a Lift against the current. Once you pass the curls, ordinary flight returns.','draft'),
  s('Bad Sparks','Red rings warn of a cost. Dark Sparks reduce Luminance; Dusk Sparks drain up to 3 Sparks and dim Luminance by 20% for 4 seconds. Collector leaves them alone.','pickup:dark'),
  s('Black Hole','A black core is a hazard, not a pickup. It continuously steals Sparks nearby; closer means much faster drain. Give it space, even with a shield.','black-hole'),
  s('Giant Black Hole','A giant hangs over the roof or rises through the floor. Its field steadily drains Sparks as you pass. Fly on the far side, then collect the recovery Sparks beyond its rim.','giant-hole'),
  s('Proximity','A Proximity card or skill unlocks surface charging. Skim solid terrain without touching it to fill the meter; full, it sends a Pulse that reveals the scene. Open sky never charges it.','edge')]},
 progression:{name:'Runs & Ascension',visual:'route',steps:[
  s('Three maps make a run','Your hearts, Sparks and build carry over between maps. Starting a new run resets skills and Inscriptions. Later guardians chain their attacks, leaving fewer breaks to recover.','route'),
  s('Ascension','Clear all three maps to unlock the next difficulty. Higher Ascensions make the journey harder. Winning ends the run. Start a separate New Game to try another Ascension; run fuel, skills, currency and Inscriptions never carry over.','site:boss'),
  s('Continue or New Game','Continue resumes your saved run. Exit to Menu keeps it. Abandon and New Game reset run skills and currency; permanent unlocks remain. Short lessons appear as you progress. Reset tutorial in Settings to replay them.','pause')]},
};
export const topicSteps=(id)=>TUTORIAL_TOPICS[id]?.steps.map(step=>({...step}))||[];
