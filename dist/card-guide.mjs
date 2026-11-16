// Short card-pilot lessons. The established skill-book guide stays intact.
const step = (title, text, visual) => ({ title, text, visual });

export const CARD_GUIDE_TOPICS = {
  dream: {
    name: 'Dream',
    visual: 'dream',
    steps: [
      step('Equip Dream', 'Find this Common card among starting choices or flight rewards. Equip it to rehearse the next flight after Rest, or an Elite or Guardian. Ordinary flights elsewhere start normally. Extra Dream cards keep one 8-second opening.', 'skills'),
      step('Rehearse in full light', 'Practise the first 8 seconds in golden full light with free Lifts. Go back to sleep to try again. Rehearsal spends no hearts or card uses and changes no saved rewards.', 'dream'),
      step('Wake at the opening’s end', 'Wake up carries your chosen opening and its pickups into the real flight without showing the opening again. You wake paused. Tap to resume, then tap again to Lift; speed returns slowly.', 'dream'),
    ],
  },
  collector: {
    name: "Collector",
    visual: "companion:collector",
    steps: [
      step(
        "Read the pickup mark",
        "A pickup’s lower shell flows into a small green circle when Collector can fetch it. Collector starts with Sparks and Clusters. It catches the pickup’s circle and reels the intact pickup to your main wisp; Sparks arrive on contact.",
        "collector-range",
      ),
      step(
        "Handling cards",
        "Equip Cache Handling to fetch Caches, or Flash Handling to fetch white triangles. A Cache delivery restores 12 Sparks. Flash restores up to 6 missing Sparks per equipped or compatible copied Flash Handling source.",
        "collector-return",
      ),
      step(
        "Recovery changes reach",
        "Catching a pickup starts its reel and recovery together. Collector stays busy until the intact pickup touches your wisp, then is ready for another search. The pickup marks keep showing its learned handling.",
        "collector-recovery",
      ),
      step(
        "Field Impulse duration",
        "Swipe up to float, down to dive, or right to speed up. With a full ring, each equipped or compatible copied Field Impulse adds 0.8 seconds: two sources last 1.6 seconds. A smaller ring scales duration and strength. Extra sources extend time at the same force, and one swipe spends the ring once. Lift ends a float or dive.",
        "collector-range",
      ),
    ],
  },
  companions: {
    name: "Your companion",
    visual: "companion:collector",
    steps: [
      step(
        "Collector stays with you",
        "The green orb fetches missed Sparks automatically. Touch a pickup yourself for an immediate refill. Collector waits for your body to have its chance.",
        "companion:collector",
      ),
      step(
        "Check what it can fetch",
        "A small green circle below the pickup shows a fetchable type. Handling cards add circles to Caches and Flash. Collector reels each pickup to your moving main wisp before it absorbs; it is ready again on contact.",
        "collector-range",
      ),
    ],
  },
  skills: {
    name: "Deck",
    visual: "skills",
    steps: [
      step(
        "Your deck and slots",
        "Every earned card stays in your Deck. Equipped cards grant skills in three ordered slots. Start with your chosen Common and the included Lift Guide equipped, leaving one slot free.",
        "skills",
      ),
      step(
        "Choose what to equip",
        "Drag any owned card into an equipped slot, or tap it, choose Equip, then tap a slot. The old card moves to reserve. Moving between equipped slots swaps their cards. Echo and Chameleon read the immediate slot to their right; Echo repeats compatible triggered actions.",
        "forge",
      ),
      step(
        "Edit anytime",
        "Open Deck anytime, including a paused flight, to equip, reorder, unequip or Melt cards. Improve, Evolve and Forge are available at Rest. Equipping keeps remaining uses; Melt destroys the card and its uses. Close Deck and use the normal resume controls to fly again.",
        "skills",
      ),
    ],
  },
  packed: {
    name: "Stored Sparks",
    visual: "packed",
    steps: [
      step(
        "One wallet",
        "Stored Sparks come from clearing, packing surplus and melting cards. Spend banked Stored Sparks to improve or Forge at Rest. Every third passage Spark overfill releases a Luminance wave.",
        "packed",
      ),
      step(
        "Read the quote",
        "A Common Melt gives 10. Forge Rare costs 30; Legendary costs 60 with a Rare equipped. Forge is a Rest service and uses no Rest action. Review the exact next card, then forge again while you can afford it.",
        "forge",
      ),
    ],
  },
  rewards: {
    name: "Card rewards",
    visual: "clear-reward",
    steps: [
      step(
        "One card per flight",
        "Every first real flight clear adds one card to your Deck. Keep duplicates and equip cards whenever you choose. Elite and guardian relics stay separate and passive.",
        "clear-reward",
      ),
      step(
        "Select cards to melt",
        "In Deck, choose Melt cards… and tap the cards you want to destroy. Review the total Stored Sparks and any slots that will become empty, then confirm or cancel.",
        "skills",
      ),
      step(
        "A winning deck",
        "The third guardian ends the run. Your final card is recorded as a trophy beside your equipped cards.",
        "artifact",
      ),
    ],
  },
  rest: {
    name: "Rest actions",
    visual: "rest",
    steps: [
      step(
        "Choose a camp action",
        "Recover restores hearts and refills Sparks. Add slot adds capacity without a refill, up to five slots and once per map. Forge has its own button in Deck and uses no camp action.",
        "rest",
      ),
      step(
        "Growth Seed",
        "Keep Growth Seeds in your Deck to unlock Grow at Rest. Each owned Seed adds its printed amount, up to +90 total: Common +3, Rare +5, Legendary +8 (improved to +9 or +10). Grow refills once without healing hearts. All Seeds share three Grow actions per run.",
        "meter",
      ),
      step(
        "Second Ember",
        "Keep this Common card in your Deck when arriving at Rest to permit a second different action. It needs no active slot. Its one charge is spent only after the second action succeeds. Leaving after the first preserves it.",
        "forge",
      ),
    ],
  },
  flight: {
    name: "Lift & glide",
    visual: "lift",
    steps: [
      step(
        "You choose each Lift",
        "Tap the scene or Lift to rise, then release to glide. Lifts spend the meter; Stored Sparks are your separate improvement wallet.",
        "lift",
      ),
      step(
        "Lift Guide",
        "Loaned during First Light’s Lift lesson. The amber chevron appears when your current fall makes a Lift reach the same height as a Lift from level flight. It judges motion only; check the terrain and choose when to tap. It disappears on Lift.",
        "lift",
      ),
      step(
        "Lift Guide included",
        "Every new card journey equips Lift Guide alongside your choice of two other Common cards. Two cards start equipped, with one free slot. Ordinary flight rewards offer other cards.",
        "skills",
      ),
    ],
  },
};
