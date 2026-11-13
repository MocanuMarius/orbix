import { MAP_STOP_TYPES } from './map-guide.mjs?v=pixel-landscape-1';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs?v=pixel-landscape-1';

// Content only. The coach owns pausing, highlighting, seen state and navigation.
// hasStoredGlow means the relevant reserve panel/footer exists on this screen.
// rest permits trying +/- in place; companion choices remain Next-driven.
const step = (id, title, text, target, extra = {}) =>
  ({ id, title, text, target, allowTarget: false, ...extra });

const keyText = {
  flight: ['Flight symbol', 'The passage marks a flight. ELITE means a harder route with extra rewards.'],
  rest: ['Rest symbol', 'The shelter offers recovery, skills, companion changes and Dream preparation.'],
  treasure: ['Treasure symbol', 'The chest offers an artifact choice or Embers. You can equip three artifacts.'],
  encounter: ['Event symbol', 'The question mark offers a bargain, dice roll, sanctuary or workshop. Read the stakes before choosing.'],
  boss: ['Boss symbol', 'A mandatory confrontation. Prepare your build and fuel before entering.'],
};

export function tutorialSteps(screen, context = {}) {
  const run = context.run || {};
  const role = normalizeCompanionRole(context.role || run.companionRole);
  const ability = getCompanionAbility(role);
  const passive = context.passive ?? ability.passive === true;
  const rest = context.rest === true;
  const collects = ability.collects === true;
  const practice = run.isTutorial === true || Boolean(context.lesson);
  const unlocked = !practice && (context.afterglowUnlocked ?? run.afterglowUnlocked ?? context.profile?.afterglowUnlocked) === true;
  const stored = unlocked && context.hasStoredGlow === true;
  const abilityText = collects
    ? 'Collector fetches missed good packets. Each delivery shrinks its boundary, which grows back.'
    : role === 'protector'
      ? 'A charged Protector shell spends Glow to deflect a collision. It then recovers automatically.'
      : role === 'leveler'
        ? 'Hold Lift or the flight area to levitate with Space Timer. Release to glide and recharge.'
        : 'POWER activates Runner: surge forward and resist drafts. Touch good packets yourself.';


  switch (screen) {
    case 'map':
      return [
        step('map-stops', 'Follow the route forward', 'A run crosses three maps. Follow connected stops toward the exit; Ascension sets the difficulty.', '.map-stop-counter'),
        step('map-position', 'Your position', 'The white light marks START or YOU. Follow the bright links toward the next stop.', '.map-orb-marker'),
        step('map-lives', 'Three lives for the journey', 'An unprotected collision spends one life and returns you to the route. Rest can restore missing lives.', '.map-status-strip .ascension-lives'),
        step('map-branches', 'Choose a glowing stop', 'Only glowing stops are reachable. At a fork, choose a route and inspect it before entering.', '#journey-map .world-map-node.reachable'),
        step('map-wallet', 'Saved embers', 'Embers buy skills during this run. Glow is flight fuel. Neither is a collision shield.', '.saved-wallet-bank'),
        step('map-symbols', 'Learn five symbols', 'MAP KEY explains Flight, Rest, Treasure, Event and Boss. Events have several different choices.', '.map-key-button', { actionLabel: 'Show symbols' }),
      ];

    case 'map-key':
      return [
        ...Object.values(MAP_STOP_TYPES).map((type, index) => {
          const [title, defaultText] = keyText[type.kind]||[type.name,type.summary];
          const text = type.kind === 'finale' && practice ? 'The flag ends this practice route. In a normal difficulty tier, maps one and two lead onward and map three ends with a boss.' : defaultText;
          return step(`map-key-${type.kind}`, title, text, `#map-key-inspector .map-key-row:nth-child(${index + 1})`);
        }),
        step('map-key-events', 'Events offer real trades', unlocked ? 'These names identify different choices: fuel now, saved embers, a power or stored fuel. Read the trade before choosing.' : 'These names identify different choices: fuel now, saved embers or a new power. Read the trade before choosing.', '#map-key-inspector .map-event-guide', { actionLabel: 'Back to route' }),
      ];

    case 'briefing': {
      const steps = [
        step('brief-location', 'Read the passage', 'The landmark and badge identify this location and its risk. The short signature previews what you will fly through.', '.encounter-art'),
        step('brief-resources', 'Lives, Glow and Lift', 'The wisp marks are ascent lives. Glow fuels Lift, and the minus number shows the cost of one tap.', '.brief-stats'),
        step('brief-goal', 'Reach the waylight', 'The waylight is the exit. Named bonus challenges add embers on real clears.', '.encounter-challenge'),
        step(`brief-companion-${role}`, passive ? 'Your passive companion' : `Your ${ability.label} companion`, abilityText, '.companion-ability-preview'),
      ];
      if (stored) steps.push(step('brief-stored-glow', 'Stored Glow is spare fuel', 'Afterglow pays Glow costs first, automatically. The small reserve strip shows how much remains.', '.stored-glow-panel'));
      steps.push(step('brief-enter', 'Ready to fly', 'Enter starts this passage. MENU pauses and shows your build.', '[data-action="launch"]', { actionLabel: 'Ready' }));
      return steps;
    }

    case 'flight':
      return [
        step('flight-body', 'Guide the large white light', 'Your body must avoid solid scenery and screen edges. Touch good light packets to refill Glow.', '#flight-canvas'),
        step('flight-glow', 'Glow pays for Lift', 'Each Lift spends fuel. When empty, you fall but can still collect fuel to Lift again.', '#flame-meter'),
        step('flight-lift', 'Lift, then glide', 'Tap Lift to rise, then let the light fall gently. Choose your taps instead of tapping constantly.', '#flap-btn'),
        collects ? step('flight-collector', 'Your automatic Collector', 'Collector rescues misses inside its boundary. This fill shows its current range. A sparkle means full reach.', '#boost-btn') : step(`flight-manual-${role}`, 'Manual pickups with this guide', 'This companion does not fetch packets. Fly through good packets yourself to refill Glow.', '#flight-canvas'),
        step(`flight-tool-${role}`, passive ? 'Always on, no tap needed' : `Your right-side ${ability.label}`, abilityText, '#boost-btn'),
        step('flight-menu', 'Pause with MENU', 'MENU pauses the flight and lets you inspect your build. RESUME continues it; closing a lesson resumes gently.', '.flight-menu-slot .game-menu-button', { actionLabel: 'Play' }),
      ];

    case 'cards': {
      const steps = [];
      if (run.phase === 'reward' && run.current?.type !== 'support' && run.lastFlight?.success && !practice) {
        steps.push(step('cards-saved-clear', 'The clear reward is saved', 'These Embers are secured for this run. A later failed attempt does not take them back.', '.level-clear'));
      }
      steps.push(
        step('cards-draft', run.phase === 'starter' ? 'Choose a reward' : 'Choose one artifact', 'Compare two artifacts, or take the Ember alternative. Artifact effects work automatically.', '.card-offers'),
        step('cards-slots', 'Three artifact slots', 'Equip up to three artifacts. When full, replace one or keep your build and choose Embers.', '.power-draft-cue'),
        step('cards-wallet', 'Fuel and run progress', practice ? 'Practice does not earn or spend your real ember wallet. Real flight clears save rewards immediately.' : 'Run Embers buy skill-tree upgrades at victories and rests. Glow fuels flight; artifacts shape your build.', '.saved-wallet-bank'),
      );
      if (run.cards?.length) steps.push(step('cards-equipped', 'Inspect an artifact', 'These are your current slots. Outside flight, tap one to read its exact effect and tradeoff.', '.loadout .slot-list'));
      return steps;
    }

    case 'support': {
      const steps = [
        step('support-choice', 'Choose one boon', 'Choose one boon: Glow, Embers, or a missing life at a Rest. Each reward names what you gain.', '.support-offers'),
        step('support-resources', 'Know what you are taking', unlocked ? 'Glow is Lift fuel; embers are saved upgrade currency. Stored Glow is fuel held for a later level.' : 'Glow is Lift fuel. Embers are saved currency for this run’s skills.', '.support-vitals'),
        step('support-menu', 'Follow a skill branch', 'Spend run Embers on named skills. Each fork commits you to one path for this run.', '[data-action=menu]'),
      ];
      if (rest) steps.push(step('support-companion', 'A rest can change your guide', 'Choose Collector, Protector, Runner or Space Timer. Only Collector fetches missed packets.', '.rest-companion-picker'));
      return steps;
    }

    case 'menu': {
      const steps = [
        step('menu-tree', 'Run skill tree', 'Follow the main wisp or equipped companion branches. Skills last this run.', '[data-action="skills"]'),
        step('menu-companion', 'Companion choice', 'Change your companion during rest preparation. The next departure locks that choice until another Rest.', '[data-action="menu-companion"]'),
        step('menu-upgrades', 'Run skills', 'UPGRADES spends run Embers on skill branches. Safe checkpoint purchases apply to the next new flight.', '[data-action="menu-upgrades"]'),
        step('menu-practice', practice ? 'Leave practice safely' : 'Practice without losing progress', practice ? 'Exit practice returns to a waiting ascent, or camp if none. Practice fuel and rewards stay separate.' : 'Tutorial keeps your ascent safely waiting. Exit practice to return to its saved checkpoint.', '[data-action="menu-tutorial"]'),
      ];
      if (stored) steps.push(step('menu-stored-glow', 'The bottle is stored fuel', 'Afterglow stores excess victory recovery and pays the next flight’s Glow costs automatically.', '.game-menu-reserve'));
      steps.push(step('menu-close', 'Back or Resume', 'BACK returns to the current screen. A paused flight continues only when you choose RESUME.', '.game-wheel-core', { actionLabel: 'Continue' }));
      return steps;
    }

    case 'companion':
      return [
        step('companion-rest', 'Choose a companion', 'Four companions are colored light orbs. Only Collector fetches missed good packets.', '#companion-inspector .companion-roles'),
        step('companion-collector', 'Collector: soft green', 'Collector fetches, returns and recovers. Its boundary and Power fill show the usable reach.', '#companion-inspector [data-id="collector"]'),
        step('companion-swift', 'Runner: amber', 'POWER surges forward and resists drafts. Runner does not fetch pickups.', '#companion-inspector [data-id="swift"]'),
        step('companion-leveler', 'Space Timer: teal', 'Hold Lift to levitate. Release to glide and regain charge. Drafts can still push you.', '#companion-inspector [data-id="leveler"]'),
        step('companion-protector', 'Protector: blue', 'A ready shell spends Glow to save a collision. It then needs time to recover.', '#companion-inspector [data-id="protector"]'),
        step('companion-traits', 'Learn traits in the main tree', 'Echo Sight lights the route after fuel pickups. Kindled Touch rewards direct pickups. Both work automatically with any companion.', '#companion-inspector .companion-roles'),
        step('companion-locks', 'Future unlocks, available to test', 'Ascension 2, 3 and 4 unlock Protector, Runner and Space Timer. Turn TEST on to try locked companions.', '#companion-inspector .companion-roles', { actionLabel: 'Done' }),
      ];

    case 'replace':
      return [
        step('replace-incoming', 'The new artifact', 'Nothing changes until you confirm. Compare this artifact with your existing build.', '.replace-incoming'),
        step('replace-slot', 'Choose which slot changes', 'Choose one of your three equipped artifacts to replace.', '#replace-swipe'),
        step('replace-confirm', 'Replace an artifact', 'The new artifact works automatically on later flights. Your run skills stay learned.', '[data-action="replace"]'),
        step('replace-keep', 'Or keep your build', practice ? 'Keep leaves the three slots unchanged. Practice choices never earn real embers.' : 'Keep leaves all three slots unchanged. You can choose the displayed Ember reward instead.', '[data-action="keep"]', { actionLabel: 'Choose' }),
      ];

    case 'retry':
      return [
        step('retry-lives', 'One life was spent', 'A run starts with three lives. At Rests, recover lost lives and learn skills that raise your cap.', '.retry-lives'),
        step('retry-same-level', 'Choose your next attempt', 'The map lets you retry or choose an available alternative. Entry resources return; failed pickup rewards do not.', '[data-action="retry-attempt"]'),
        step('retry-end', 'Or end this ascent', 'Ending abandons this run. Companion unlocks remain; run skills and Embers reset.', '[data-action="end-ascension"]', { actionLabel: 'Choose' }),
      ];

    case 'afterglow-unlock':
      if (practice || !unlocked || !run.afterglowJustUnlocked) return [];
      return [
        step('afterglow-first-boss', 'Stored Glow unlocked', 'Learning Afterglow unlocks a reserve for excess victory recovery.', '.afterglow-unlock'),
        step('afterglow-fuel', 'A new fuel reserve', 'Stored Glow supplies Lift fuel. Saved embers remain your currency for this run’s skills.', '.afterglow-unlock'),
        step('afterglow-use', 'Reserve spends first', 'Afterglow pays flight Glow costs automatically before your main meter. Upgrade its capacity and retention in its tree.', '.afterglow-unlock', { actionLabel: 'Continue' }),
      ];

    case 'result':
      return [
        step('result-outcome', practice ? 'Practice is complete' : 'Your ascent result', practice ? 'Practice fuel and rewards stay separate from your real progress. A waiting ascent can be resumed from its saved checkpoint.' : 'This is a recap of what happened. It does not create a reward for dying.', '.compact-result h1'),
        step('result-totals', 'Read the totals', practice ? 'Practice score stays in practice. Real level clears secure ember rewards immediately.' : 'Saved embers were secured on earlier clears. The score and ascent count summarize this journey.', '.result-stats'),
        step('result-next', 'Continue your journey', practice ? 'Resume the waiting ascent if you have one, or choose Play for a normal journey.' : 'Start a fresh run with new rewards and skill choices. Earned companion unlocks remain.', practice ? '.tutorial-play' : '.compact-result .two-actions', { actionLabel: 'Continue' }),
      ];

    default:
      return [];
  }
}
