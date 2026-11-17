// Open decisions for the owner. id (prefix d-), group, title, text, options [{id,label}], pick (coordinator default), link, play.
const KDC = [{id: 'keep', label: 'Keep'}, {id: 'change', label: 'Change it'}, {id: 'drop', label: 'Drop'}];
const YN = [{id: 'yes', label: 'Yes'}, {id: 'no', label: 'No'}];
export const GROUPS = [
  {id: 'listen', title: 'Listen', sub: 'Music and sound'},
  {id: 'look', title: 'Look', sub: 'Levels, courses and card art'},
  {id: 'cards', title: 'Cards', sub: 'The card board'},
  {id: 'quick', title: 'Quick answers', sub: 'One tap each; defaults are my picks'},
  {id: 'phone', title: 'Test on your phone', sub: 'Needs the real device'}
];
// Option ids that count as an explicit "no" when the answer is encoded.
export const NO_WORDS = ['drop', 'no', 'stop'];
export const CARD_TOTAL = 54;
export const DECISIONS = [
  {id: 'd-music-moss', group: 'listen', title: 'Moss and Water (felt piano)', text: 'First of the four new lo-fi pieces. Play it, then answer.', options: KDC, pick: 'keep', link: {href: 'music.html', label: 'Open the music lab'}, play: {piece: 'moss'}},
  {id: 'd-music-pines', group: 'listen', title: 'Old Pines (plucked guitar, lazy shuffle)', text: 'Second piece.', options: KDC, pick: 'keep', play: {piece: 'pines'}},
  {id: 'd-music-ferry', group: 'listen', title: 'Night Ferry (vibraphone, half-time)', text: 'Third piece.', options: KDC, pick: 'keep', play: {piece: 'ferry'}},
  {id: 'd-music-lanterns', group: 'listen', title: 'Paper Lanterns (kalimba, 6/8 waltz)', text: 'Fourth piece.', options: KDC, pick: 'keep', play: {piece: 'paper'}},
  {id: 'd-music-kick', group: 'listen', title: 'Kick on every efficient Lift', text: 'A kick on every efficient Lift (87.8 BPM, one Lift every two beats). Helpful metronome or too regular?', options: [{id: 'helpful', label: 'Helpful'}, {id: 'too-regular', label: 'Too regular'}, {id: 'softer', label: 'Softer'}], pick: 'helpful', link: {href: 'music.html', label: 'Open the music lab'}},
  {id: 'd-music-reference', group: 'listen', title: 'The current track drifts off the Lift beat', text: 'The current track is a recording at 88 BPM and drifts off the Lift beat by 3 ms per Lift.', options: [{id: 'slow-0-22', label: 'Slow it 0.22% (inaudible)'}, {id: 'leave', label: 'Leave it'}, {id: 'rebuild', label: 'Rebuild it in the synth'}], pick: 'slow-0-22'},
  {id: 'd-music-on', group: 'listen', title: 'Turn the new lo-fi rotation on?', text: 'Turn the new lo-fi rotation on for players? My pick waits until the pieces above are answered.', options: [{id: 'yes', label: 'Yes'}, {id: 'not-yet', label: 'Not yet'}], pick: 'not-yet'},
  {id: 'd-lift-cue', group: 'listen', title: 'Softer Lift cue', text: 'About 8 dB quieter, rounder, in the song’s key. Ships with the next release.', options: [{id: 'good', label: 'Good'}, {id: 'quieter', label: 'Quieter'}, {id: 'louder', label: 'Louder'}], pick: 'good', play: {cue: true}},

  {id: 'd-courses-direction', group: 'look', title: 'Organic levels (v2.0-courses)', text: 'Continuous ground from real landforms, open-sky courses, boulders in soil. 8 prototypes built.', options: [{id: 'go', label: 'Go: convert all 48'}, {id: 'change', label: 'Change it'}, {id: 'stop', label: 'Stop'}], pick: 'go', link: {href: 'courses.html', label: 'Open the courses'}},
  {id: 'd-courses-squeeze', group: 'look', title: 'Unfair high ground in the dark', text: 'High ground near the top of the screen is unfair in the dark. Which cue?', options: [{id: 'rim', label: 'Lit ground rim ahead'}, {id: 'thin-air', label: 'Thin-air sky band'}, {id: 'both', label: 'Both'}], pick: 'rim', link: {href: 'courses.html', label: 'Open the courses'}},
  {id: 'd-courses-floating', group: 'look', title: 'Floating rock', text: 'Arches, natural bridges and sky islands need real floating rock (1–2 days of engine work).', options: [{id: 'do-it', label: 'Do it'}, {id: 'skip', label: 'Skip'}], pick: 'do-it'},
  {id: 'd-level-edge', group: 'look', title: 'Softer terrain edge light', text: 'Softer terrain edge light on all maps. Faint at long distance.', options: [{id: 'good', label: 'Good'}, {id: 'brighter-far', label: 'Brighter far away'}, {id: 'brighter-all', label: 'Brighter everywhere'}], pick: 'good', link: {href: 'level.html', label: 'Open the level lab'}},
  {id: 'd-level-biomes', group: 'look', title: 'Biome-true ground and growth', text: 'For all 12 biomes (no plants on ice, boulders, layers). Turn each on as it is finished?', options: [{id: 'yes', label: 'Yes'}, {id: 'show-me-first', label: 'Show me first'}], pick: 'yes', link: {href: 'level.html', label: 'Open the level lab'}},
  {id: 'd-cardart', group: 'look', title: 'Card art: all 104 pictures, direction B', text: 'Go card by card, or accept all.', options: [{id: 'accept-all', label: 'Accept all'}, {id: 'i-will-flag', label: 'I will name the ones to redraw'}], pick: 'i-will-flag', link: {href: 'cardart-all.html', label: 'Open all card art'}},
  {id: 'd-cardart-rarity', group: 'look', title: 'Card art B for every rarity', text: 'You wrote "B" then "Common". Which did you mean?', options: [{id: 'all-b', label: 'B for every rarity'}, {id: 'common-only', label: 'Common only'}], pick: 'all-b', link: {href: 'cardart-all.html', label: 'Open all card art'}},

  {id: 'd-cards-board', group: 'cards', title: '54 proposed cards', text: 'Approve or deny each on the card board. The counts below are live from the shared answers.', options: [], link: {href: 'cardboard.html', label: 'Open the card board'}, counts: true},

  {id: 'd-unseen-cards', group: 'quick', title: 'One unseen card per draft', text: 'Each reward draft guarantees one card you have not been offered this run (Proximity is offered in only 53% of runs).', options: YN, pick: 'yes'},
  {id: 'd-spacetime', group: 'quick', title: 'Bring Spacetime back as a Rare', text: 'Skimming dents the terrain ahead.', options: YN, pick: 'yes'},
  {id: 'd-wave-loom', group: 'quick', title: 'Wave Loom', text: 'Retired with Field Impulse.', options: [{id: 'engine-card', label: 'Returns as an engine card'}, {id: 'stay-retired', label: 'Stay retired'}], pick: 'engine-card'},
  {id: 'd-black-hole-scope', group: 'quick', title: 'Black Hole: how long does growth last?', text: 'Max-Sparks growth lasts…', options: [{id: 'run', label: 'For the run'}, {id: 'across', label: 'Across runs'}], pick: 'run'},
  {id: 'd-black-hole-name', group: 'quick', title: 'Black Hole name clash', text: 'The card shares its name with the flight hazard.', options: [{id: 'keep', label: 'Keep the name'}, {id: 'rename', label: 'Rename'}], pick: 'keep'},
  {id: 'd-metronome', group: 'quick', title: 'Metronome engine card', text: 'It paid for all your Lift by itself. Wait lengthened from 1.5 s to 3 s.', options: [{id: 'ok', label: 'OK'}, {id: 'longer', label: 'Longer'}, {id: 'shorter', label: 'Shorter'}], pick: 'ok'},
  {id: 'd-card-eaters', group: 'quick', title: 'Three cards eat other cards', text: 'Devourer (hearts), Ember Feeder (bigger meter now), Black Hole (grows all run).', options: [{id: 'keep-three', label: 'Keep all three'}, {id: 'merge', label: 'Merge some'}], pick: 'keep-three'},
  {id: 'd-twin-flame', group: 'quick', title: 'Twin Flame rule', text: '"Exactly 2 cards before it: ×3". The rule was a guess.', options: [{id: 'keep', label: 'Keep'}, {id: 'drop', label: 'Drop'}], pick: 'keep'},

  {id: 'd-test-perf', group: 'phone', title: 'Speed on the Pixel 10', text: 'Play the live game for several levels on the Pixel 10. Still slow after a few levels?', options: [{id: 'smooth', label: 'Smooth'}, {id: 'still-slow', label: 'Still slow'}, {id: 'not-tested', label: 'Not tested yet'}], link: {href: 'https://mocanumarius.github.io/orbix/', label: 'Open the live game', external: true}},
  {id: 'd-test-paper', group: 'phone', title: 'Paper tone and contrast of the menus', text: 'v2.6-theme shipped without your verdict.', options: [{id: 'good', label: 'Good'}, {id: 'too-bright', label: 'Too bright'}, {id: 'too-dark', label: 'Too dark'}]}
];
