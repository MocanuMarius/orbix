import { MAP_STOP_TYPES } from './map-guide.mjs?v=world-variety-1';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs?v=world-variety-1';

// Content only. The coach owns pausing, highlighting, seen state and navigation.
// hasStoredGlow means the relevant reserve panel/footer exists on this screen.
// rest permits trying +/- in place; companion choices remain Next-driven.
const step = (id, title, text, target, extra = {}) =>
  ({ id, title, text, target, allowTarget: false, ...extra });

const keyText = {
  flight: ['Flight symbol', 'The travelling light and arrow mark an ordinary flight. Clear it to earn run Embers.'],
  elite: ['Elite symbol', 'The skull marks a harder flight with a larger clear reward. Your three journey lives still apply.'],
  rest: ['Rest symbol', 'The campfire offers fuel or embers. Rest also opens skill branches and companion changes before departure.'],
  shrine: ['Shrine symbol', 'The cards mark a shrine. Choose fuel and embers or a new temporary power.'],
  event: ['Event symbol', 'The question mark is a named encounter with two choices. There are six event variants, each with different tradeoffs.'],
  finale: ['Finale symbol', 'The flag marks this map’s last flight. Maps one and two open the next map; map three ends with the difficulty-tier boss.'],
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
    ? 'Collector automatically fetches missed good packets, returns and recovers. It is the only companion that fetches.'
    : role === 'gravity'
      ? 'Gravity always pulls nearby good packets closer. You still collect them manually; Gravity never fetches.'
      : role === 'anchor'
        ? 'LEVEL holds your height briefly. Lift cancels it; Anchor never fetches packets.'
        : 'BOOST surges forward and resists drafts. Swift never fetches; touch packets yourself.';


  switch (screen) {
    case 'map':
      return [
        step('map-stops', 'Follow the route upward', 'Practice has three stops; a normal difficulty tier has three seven-stop maps. FLIGHT 1/5 counts this map’s flights, while DIFFICULTY names the tier.', '.map-stop-counter'),
        step('map-position', 'Your position', 'The white light marks START or YOU. Follow the bright links toward the next stop.', '.map-orb-marker'),
        step('map-lives', 'Three lives for the journey', 'Each collision ends an attempt and spends one life. Lives do not refill after a level.', '.map-status-strip .ascension-lives'),
        step('map-branches', 'Choose a glowing stop', 'Only glowing stops are reachable. At a fork, choose a route and inspect it before entering.', '#journey-map .world-map-node.reachable'),
        step('map-wallet', 'Saved embers', 'The ember icon is your permanent wallet. Embers buy upgrades; Glow is separate flight fuel.', '.saved-wallet-bank'),
        step('map-symbols', 'Learn the six symbols', 'MAP KEY explains each stop type and the six named event variants. We will open it next.', '.map-key-button', { actionLabel: 'Show symbols' }),
      ];

    case 'map-key':
      return [
        ...Object.values(MAP_STOP_TYPES).map((type, index) => {
          const [title, defaultText] = keyText[type.kind];
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
      if (stored) steps.push(step('brief-stored-glow', 'Stored Glow is spare fuel', 'Use some reserve before this new level, or keep it for later. This bottle is carried flight fuel, separate from your ember wallet.', '.stored-glow-panel'));
      steps.push(step('brief-enter', 'Ready to fly', 'Enter starts this passage. MENU opens your run skill trees and companion preparation.', '[data-action="launch"]', { actionLabel: 'Ready' }));
      return steps;
    }

    case 'flight':
      return [
        step('flight-body', 'Guide the large white light', 'Your body must avoid solid scenery and screen edges. Touch good light packets to refill Glow.', '#flight-canvas'),
        step('flight-glow', 'Glow pays for Lift', 'Each Lift spends fuel. When empty, you fall but can still collect fuel to Lift again.', '#flame-meter'),
        step('flight-lift', 'Lift, then glide', 'Tap Lift to rise, then let the light fall gently. Choose your taps instead of tapping constantly.', '#flap-btn'),
        collects ? step('flight-collector', 'Your automatic Collector', 'Collector rescues misses inside its boundary. This fill shows its current range. A sparkle means full reach.', '#boost-btn') : step(`flight-manual-${role}`, 'Manual pickups with this guide', 'This companion does not fetch packets. Fly through good packets yourself to refill Glow.', '#flight-canvas'),
        step(`flight-tool-${role}`, passive ? 'Always on, no tap needed' : `Your right-side ${ability.label}`, abilityText, '#boost-btn'),
        step('flight-menu', 'Pause with MENU', 'MENU pauses the flight and lets you inspect your build. RESUME continues it; ending an attempt deliberately spends a life.', '.flight-menu-slot .game-menu-button', { actionLabel: 'Play' }),
      ];

    case 'cards': {
      const steps = [];
      if (run.phase === 'reward' && run.current?.type !== 'support' && run.lastFlight?.success && !practice) {
        steps.push(step('cards-saved-clear', 'The clear reward is saved', 'These embers already reached your permanent wallet. A later failed attempt does not take them back.', '.level-clear'));
      }
      steps.push(
        step('cards-draft', run.phase === 'starter' ? 'Choose a starting power' : 'Choose one power', 'Read the trigger and benefit on both cards, then choose one. Powers work automatically for this ascent.', '.card-offers'),
        step('cards-slots', 'Three power slots', 'Your build holds three powers. Once full, you replace a slot or keep your build and take the displayed ember reward.', '.power-draft-cue'),
        step('cards-wallet', 'Fuel and permanent progress', practice ? 'Practice does not earn or spend your real ember wallet. Real flight clears save rewards immediately.' : 'Saved embers buy permanent ranks through UPGRADES. They are separate from Glow and from temporary power cards.', '.saved-wallet-bank'),
      );
      if (run.cards?.length) steps.push(step('cards-equipped', 'Inspect an equipped power', 'These are your current slots. Outside flight, tap one to read its exact effect and tradeoff.', '.loadout .slot-list'));
      return steps;
    }

    case 'support': {
      const steps = [
        step('support-choice', 'Choose one boon', 'Choose one boon: Glow, Embers, or a missing life at a Rest. Each reward names what you gain.', '.support-offers'),
        step('support-resources', 'Know what you are taking', unlocked ? 'Glow is Lift fuel; embers are saved upgrade currency. Stored Glow is fuel held for a later level.' : 'Glow is Lift fuel. Embers are saved currency for this run’s skills.', '.support-vitals'),
        step('support-menu', 'Follow a skill branch', 'Spend run Embers on named skills. Each fork commits you to one path for this run.', '[data-action=menu]'),
      ];
      if (rest) steps.push(step('support-companion', 'A rest can change your guide', 'Choose Collector, Swift, Anchor or Gravity before departure. Only Collector fetches; the others require manual pickups.', '.rest-companion-picker'));
      return steps;
    }

    case 'menu': {
      const steps = [
        step('menu-tree', 'Run skill tree', 'Follow the main wisp or equipped companion branches. Skills last this run.', '[data-action="skills"]'),
        step('menu-companion', 'Companion choice', 'Change your companion during rest preparation. The next departure locks that choice for the level and its retries.', '[data-action="menu-companion"]'),
        step('menu-upgrades', 'Run skills', 'UPGRADES spends run Embers on skill branches. Safe checkpoint purchases apply to the next new flight.', '[data-action="menu-upgrades"]'),
        step('menu-practice', practice ? 'Leave practice safely' : 'Practice without losing progress', practice ? 'Exit practice returns to a waiting ascent, or camp if none. Practice fuel and rewards stay separate.' : 'Tutorial keeps your ascent safely waiting. Exit practice to return to its saved checkpoint.', '[data-action="menu-tutorial"]'),
      ];
      if (stored) steps.push(step('menu-stored-glow', 'The bottle is stored fuel', 'Stored Glow carries spare Lift fuel between levels. Inspect it here; using it is offered before a new level.', '.game-menu-reserve'));
      steps.push(step('menu-close', 'Back or Resume', 'BACK returns to the current screen. A paused flight continues only when you choose RESUME.', '.game-wheel-core', { actionLabel: 'Continue' }));
      return steps;
    }

    case 'companion':
      return [
        step('companion-rest', 'Choose a companion', 'All companions are colored light orbs. Only the starting Collector fetches missed good packets.', '#companion-inspector .companion-roles'),
        step('companion-collector', 'Collector: soft green', 'Collector automatically fetches, returns and recovers. READY, FETCH, RETURN and recovery seconds describe its work.', '#companion-inspector [data-id="collector"]'),
        step('companion-swift', 'Swift: amber', 'BOOST surges forward and resists drafts. Swift requires manual pickups.', '#companion-inspector [data-id="swift"]'),
        step('companion-anchor', 'Anchor: teal', 'LEVEL holds height until it ends or you Lift. Anchor requires manual pickups.', '#companion-inspector [data-id="anchor"]'),
        step('companion-gravity', 'Gravity: violet', 'Its stronger pull is always on. Gravity brings good packets closer, but you still collect them manually.', '#companion-inspector [data-id="gravity"]'),
        step('companion-locks', 'Future unlocks, available to test', 'ASC 2, ASC 3 and ASC 4 show normal unlock tiers. TEST keeps those choices selectable now; choose after this introduction.', '#companion-inspector .companion-roles', { actionLabel: 'Done' }),
      ];

    case 'replace':
      return [
        step('replace-incoming', 'The new power', 'This card has not replaced anything yet. Compare its effect with your existing build.', '.replace-incoming'),
        step('replace-slot', 'Choose which slot changes', 'Swipe between your three equipped powers. Replace changes only the power currently shown.', '#replace-swipe'),
        step('replace-confirm', 'Replace a power', 'The new power triggers automatically on later flights. Your permanent ranks remain yours.', '[data-action="replace"]'),
        step('replace-keep', 'Or keep your build', practice ? 'Keep leaves the three slots unchanged. Practice choices never earn real embers.' : 'Keep leaves all three slots unchanged and saves the displayed 8 embers.', '[data-action="keep"]', { actionLabel: 'Choose' }),
      ];

    case 'retry':
      return [
        step('retry-lives', 'One life was spent', 'A run starts with three lives. At Rests, recover lost lives and learn skills that raise your cap.', '.retry-lives'),
        step('retry-same-level', 'Retry the same passage', 'Retry starts this level again with its entry Glow, companion and build. Failed-attempt pickup rewards are discarded.', '[data-action="retry-attempt"]'),
        step('retry-end', 'Or end this ascent', 'Ending here abandons the ascent. Embers saved on earlier clears remain in your permanent wallet.', '[data-action="end-ascension"]', { actionLabel: 'Choose' }),
      ];

    case 'afterglow-unlock':
      if (practice || !unlocked || !run.afterglowJustUnlocked) return [];
      return [
        step('afterglow-first-boss', 'Stored Glow unlocked', 'Your first boss unlocks this bottle. It carries spare Glow into later levels.', '.afterglow-unlock'),
        step('afterglow-fuel', 'A new fuel reserve', 'Stored Glow supplies Lift fuel. Saved embers remain your currency for this run’s skills.', '.afterglow-unlock'),
        step('afterglow-use', 'Choose when to use it', 'MENU shows the bottle when it holds fuel. Before a new level, use the offered Glow or keep it for later.', '.afterglow-unlock', { actionLabel: 'Continue' }),
      ];

    case 'result':
      return [
        step('result-outcome', practice ? 'Practice is complete' : 'Your ascent result', practice ? 'Practice fuel and rewards stay separate from your real progress. A waiting ascent can be resumed from its saved checkpoint.' : 'This is a recap of what happened. It does not create a reward for dying.', '.compact-result h1'),
        step('result-totals', 'Read the totals', practice ? 'Practice score stays in practice. Real level clears secure ember rewards immediately.' : 'Saved embers were secured on earlier clears. The score and ascent count summarize this journey.', '.result-stats'),
        step('result-next', 'Continue your journey', practice ? 'Resume the waiting ascent if you have one, or choose Play for a normal journey.' : 'Spend saved embers on upgrades or start a new ascent. Your permanent ranks carry forward.', practice ? '.tutorial-play' : '.compact-result .two-actions', { actionLabel: 'Continue' }),
      ];

    default:
      return [];
  }
}
