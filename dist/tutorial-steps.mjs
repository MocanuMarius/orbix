import { MAP_STOP_TYPES } from './map-guide.mjs';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs';

// Content only. The coach owns pausing, highlighting, seen state and navigation.
// hasStoredGlow means the relevant reserve panel/footer exists on this screen.
// rest permits trying +/- in place; companion choices remain Next-driven.
const step = (id, title, text, target, extra = {}) =>
  ({ id, title, text, target, allowTarget: false, ...extra });

const keyText = {
  flight: ['Flight symbol', 'The wing marks an ordinary flight. Clear it to save embers and choose a temporary power.'],
  elite: ['Elite symbol', 'The skull marks a harder flight with a larger clear reward. Your three ascent lives still apply.'],
  rest: ['Rest symbol', 'The campfire offers fuel or embers. Rest also opens tuning and companion changes before departure.'],
  shrine: ['Shrine symbol', 'The cards mark a shrine. Choose fuel and embers or a new temporary power.'],
  event: ['Event symbol', 'The question mark is a named encounter with two choices. There are six event variants, each with different tradeoffs.'],
  finale: ['Finale symbol', 'The flag marks the last flight. It ends practice here; a normal ascent finishes with flight five.'],
};

export function tutorialSteps(screen, context = {}) {
  const run = context.run || {};
  const role = normalizeCompanionRole(context.role || run.companionRole);
  const ability = getCompanionAbility(role);
  const passive = context.passive ?? ability.passive === true;
  const rest = context.rest === true;
  const practice = run.isTutorial === true || Boolean(context.lesson);
  const stored = context.hasStoredGlow === true;
  const abilityText = passive
    ? 'Gravity is always on. It nudges nearby good light packets closer; you or your collector still need to collect them.'
    : role === 'anchor'
      ? 'LEVEL holds your height briefly. Lift cancels it, and local drafts can still nudge you.'
      : 'BOOST surges forward and resists local drafts. Solid scenery and screen edges still end the attempt.';

  switch (screen) {
    case 'map':
      return [
        step('map-stops', 'Follow the route upward', 'Practice has three stops; a normal ascent has seven. The counter includes flights and support stops.', '.map-stop-counter'),
        step('map-position', 'Your position', 'The white light marks START or YOU. Follow the bright links toward the next stop.', '.map-orb-marker'),
        step('map-lives', 'Three lives for the ascent', 'Each collision ends an attempt and spends one life. Lives do not refill after a level.', '.map-status-strip .ascension-lives'),
        step('map-branches', 'Choose a glowing stop', 'Only glowing stops are reachable. At a fork, choose a route and inspect it before entering.', '#journey-map .world-map-node.reachable'),
        step('map-wallet', 'Saved embers', 'The ember icon is your permanent wallet. Embers buy upgrades; Glow is separate flight fuel.', '.saved-wallet-bank'),
        step('map-symbols', 'Learn the six symbols', 'MAP KEY explains each stop type and the six named event variants. We will open it next.', '.map-key-button', { actionLabel: 'Show symbols' }),
      ];

    case 'map-key':
      return [
        ...Object.values(MAP_STOP_TYPES).map((type, index) => {
          const [title, text] = keyText[type.kind];
          return step(`map-key-${type.kind}`, title, text, `#map-key-inspector .map-key-row:nth-child(${index + 1})`);
        }),
        step('map-key-events', 'Events offer real trades', 'These names identify different choices: fuel now, saved embers, a power or stored fuel. Read the trade before choosing.', '#map-key-inspector .map-event-guide', { actionLabel: 'Back to route' }),
      ];

    case 'briefing': {
      const steps = [
        step('brief-location', 'Read the passage', 'The landmark and badge identify this location and its risk. The short signature previews what you will fly through.', '.encounter-art'),
        step('brief-resources', 'Lives, Glow and Lift', 'The wisp marks are ascent lives. Glow fuels Lift, and the minus number shows the cost of one tap.', '.brief-stats'),
        step('brief-goal', 'Reach the waylight', 'The waylight is the exit. Named bonus challenges add embers on real clears.', '.encounter-challenge'),
        step(`brief-companion-${role}`, passive ? 'Your passive companion' : `Your ${ability.label} companion`, abilityText, '.companion-ability-preview'),
      ];
      if (stored) steps.push(step('brief-stored-glow', 'Stored Glow is spare fuel', 'Use some reserve before this new level, or keep it for later. This bottle is carried flight fuel, separate from your ember wallet.', '.stored-glow-panel'));
      steps.push(step('brief-enter', 'Ready to fly', 'Enter starts this passage. MENU holds your tuning and other preparation tools.', '[data-action="launch"]', { actionLabel: 'Ready' }));
      return steps;
    }

    case 'flight':
      return [
        step('flight-body', 'Guide the large white light', 'Your body must avoid solid scenery and screen edges. Touch good light packets to refill Glow.', '#flight-canvas'),
        step('flight-glow', 'Glow pays for Lift', 'Each Lift spends fuel from this bar. Gliding costs no Glow.', '#flame-meter'),
        step('flight-lift', 'Lift, then glide', 'Tap Lift to rise, then let the light fall gently. Choose your taps instead of tapping constantly.', '#flap-btn'),
        step('flight-collector', 'Your smaller companion', 'It fetches missed good packets inside its reach circle. FETCH, RETURN and the recovery timer show what it is doing.', '#wisp-hud'),
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
        step('support-choice', 'Choose one boon', 'Pick one of these two choices, then continue upward. Each reward names its resource or power.', '.support-offers'),
        step('support-resources', 'Know what you are taking', 'Glow is Lift fuel; embers are saved upgrade currency. Stored Glow is fuel held for a later level.', '.support-vitals'),
        step('support-menu', 'Tune at rest through MENU', 'The gear badge shows unused tuning points. TUNE redistributes flight points; UPGRADES spends saved embers.', '.header-menu-slot .game-menu-button'),
      ];
      if (rest) steps.push(step('support-companion', 'A rest can change your guide', 'Choose Boost, Level or passive Gravity before departing. Your cards and saved wallet stay with you.', '.rest-companion-picker'));
      return steps;
    }

    case 'menu': {
      const steps = [
        step('menu-tune', 'Flight tuning', 'TUNE uses your shared point budget. You can edit at rest and inspect it while a flight is paused.', '[data-action="menu-tune"]'),
        step('menu-companion', 'Companion choice', 'Change your companion during rest preparation. The next departure locks that choice for the level and its retries.', '[data-action="menu-companion"]'),
        step('menu-upgrades', 'Permanent upgrades', 'UPGRADES spends saved embers on lasting ranks. Safe checkpoint purchases apply to the next new flight.', '[data-action="menu-upgrades"]'),
        step('menu-practice', practice ? 'Leave practice safely' : 'Practice without losing progress', practice ? 'Exit practice returns to a waiting ascent, or camp if none. Practice fuel and rewards stay separate.' : 'Tutorial keeps your ascent safely waiting. Exit practice to return to its saved checkpoint.', '[data-action="menu-tutorial"]'),
      ];
      if (stored) steps.push(step('menu-stored-glow', 'The bottle is stored fuel', 'Stored Glow carries spare Lift fuel between levels. Inspect it here; using it is offered before a new level.', '.game-menu-reserve'));
      steps.push(step('menu-close', 'Back or Resume', 'BACK returns to the current screen. A paused flight continues only when you choose RESUME.', '.game-wheel-core', { actionLabel: 'Continue' }));
      return steps;
    }

    case 'tuning':
      return [
        step('tuning-budget', 'One shared point budget', 'Divide these points across four stats. Each stat has three slots, so more in one leaves fewer for the others.', '#tuning-inspector .tuning-budget'),
        step('tuning-speed', 'Speed', 'Each point adds 3% travel speed. Faster travel reaches the waylight sooner and leaves less reaction time.', '#tuning-inspector [data-tuning-axis="speed"]', { allowTarget: rest }),
        step('tuning-lift', 'Lift height', 'Each point adds 6% lift height. Taps still cost Glow, so place them carefully.', '#tuning-inspector [data-tuning-axis="lift"]', { allowTarget: rest }),
        step('tuning-collector', passive ? 'Gravity reach and pull' : 'Collector reach', passive ? 'Each point adds 12% field reach and 8% pull strength. The totals show your capped radius and full build effect.' : 'Each point adds 12% collector reach. The companion still needs time to fetch, return and recover.', '#tuning-inspector [data-tuning-axis="collector"]', { allowTarget: rest }),
        step('tuning-ability', passive ? 'Recovery and pull' : 'Ability timing', passive ? 'Each point strengthens pull by 5% and shortens collector rest by 4%. Gravity stays always on.' : 'Each point adds 5% ability duration and shortens recharge by 4%. The totals include your powers and permanent ranks.', '#tuning-inspector [data-tuning-axis="boost"]', { allowTarget: rest }),
        step('tuning-done', 'Keep this allocation', 'Plus adds a point and minus gives it back. Done keeps your choices; departure locks them for the level and its retries.', '#tuning-inspector .tuning-sheet-actions', { actionLabel: 'Done' }),
      ];

    case 'companion':
      return [
        step('companion-rest', 'Choose your current guide', 'Rest choices change this ascent. Home choices set the companion for the next ascent.', '#companion-inspector .companion-roles'),
        step('companion-swift', 'Swift: amber crescent', 'BOOST surges forward and resists local drafts. It does not protect against solid scenery.', '#companion-inspector [data-id="swift"]'),
        step('companion-anchor', 'Anchor: teal bell', 'LEVEL holds your height briefly. Lift cancels it, and drafts still nudge you.', '#companion-inspector [data-id="anchor"]'),
        step('companion-gravity', 'Gravity: violet spiral', 'Its packet-pulling field is always on. In flight, the PASSIVE badge has no tap action.', '#companion-inspector [data-id="gravity"]'),
        step('companion-done', 'Your next flight locks the choice', 'After this guide, the three companions remain available at the rest stop. Choose the one that fits your route and build.', '#companion-inspector [data-action="close-power"]', { actionLabel: 'Done' }),
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
        step('retry-lives', 'One life was spent', 'An ascent starts with exactly three lives. Lives do not refill between levels.', '.retry-lives'),
        step('retry-same-level', 'Retry the same passage', 'Retry starts this level again with its entry Glow, companion and build. Failed-attempt pickup rewards are discarded.', '[data-action="retry-attempt"]'),
        step('retry-end', 'Or end this ascent', 'Ending here abandons the ascent. Embers saved on earlier clears remain in your permanent wallet.', '[data-action="end-ascension"]', { actionLabel: 'Choose' }),
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
