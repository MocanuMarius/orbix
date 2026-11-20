// Short card-pilot lessons. The established skill-book guide stays intact.
const step = (title, text, visual) => ({ title, text, visual });

export const CARD_GUIDE_TOPICS = {
  dream: {
    name: 'Dream',
    visual: 'dream',
    steps: [
      step('Put Dream in your chain', 'Find this Common card among starting choices or flight rewards. With it in your chain, you rehearse the next flight after Rest, or an Elite or Guardian. Ordinary flights elsewhere start normally. Extra Dream cards keep one 8-second opening.', 'skills'),
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
        "Put Cache Handling in your chain to fetch Caches, or Flare Handling to fetch white triangles. A Cache delivery restores 12 Sparks. Flare Handling also gives +6 Sparks on each Flare pickup (Collect a Flare), and a Boost to its right strengthens that.",
        "collector-return",
      ),
      step(
        "Recovery changes reach",
        "Collector stays busy until the intact pickup touches your wisp. It then rebuilds charge: 6, 12 and 18 Sparks take 3⅓, 6⅔ and 10 seconds before compression and build modifiers. Its orbit shows charge. The pickup marks show learned handling.",
        "collector-recovery",
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
        "A small green circle below the pickup shows a fetchable type. Handling cards add circles to Caches and Flare. Collector reels each pickup to your moving main wisp before it absorbs; it then rebuilds charge before searching again.",
        "collector-range",
      ),
    ],
  },
  skills: {
    name: "Deck",
    visual: "skills",
    steps: [
      step(
        "Your Deck and chain",
        "Every card you earn stays in your Deck. The cards in your chain work; the rest wait in the reserve. Your chain starts with 3 Slots, and Rest can add more, up to 5. You begin with the card you picked and Lift Guide, leaving one Slot free.",
        "skills",
      ),
      step(
        "Cards fire left to right",
        "Each card shows its Trigger first, such as Collect when your wisp touches a Spark. When a Trigger happens, the cards with it fire from Slot 1 to the right. + cards add Sparks; a Boost (× card) multiplies every card to its left. Echo and Chameleon copy the next card.",
        "forge",
      ),
      step(
        "Edit anytime",
        "Open Deck anytime, including a paused flight, to add, move, remove or Melt cards. Drag a card into a Slot, or tap it, choose Equip, then tap a Slot. Improve, Evolve, Refill and Forge are in the Workshop at Rest. Moving a card keeps its uses; Melt destroys the card and its uses.",
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
        "Stored Sparks come from clearing, packing surplus and melting cards. Spend banked Stored Sparks in the Workshop at Rest to improve, refill or Forge. Every third passage Spark overfill releases a Luminance Pulse.",
        "packed",
      ),
      step(
        "Read the quote",
        "Melt gives 10 for a Common, 20 for a Rare, 40 for a Legendary. Forge gives one surprise card of the rarity you choose, revealed after you pay: Common 15, Rare 40, Legendary 150. Each Forge or Evolve of a rarity this journey adds half the first price to the next one (Common +8, Rare +20, Legendary +75, rounded up). Forge uses no Rest action.",
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
        "Every first real flight clear adds one card to your Deck. Keep duplicates and equip cards whenever you choose. Elite and guardian victories also let you write an Inscription on a slot of your Chain.",
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
        "Recover restores hearts and refills Sparks. Add slot adds a Slot to your chain without a refill, up to five Slots and once per map. The Workshop (Forge, Improve, Refill) uses no Rest action.",
        "rest",
      ),
      step(
        "Growth Seed",
        "Keep Growth Seeds in your Deck to unlock Grow at Rest. You hold only one Growth Seed: any Seed you gain merges into it, adds its amount and the best rarity shows. Each Seed adds its printed amount: Common +3, Rare +5, Legendary +8 (improved to +9 or +10). Grow refills once without healing hearts. All Seeds share 3 Grows per journey, and the meter never holds more than 100 Sparks.",
        "meter",
      ),
      step(
        "Second Ember",
        "Keep this Common card in your Deck when you arrive at Rest to take a second, different Rest action. It never goes in your chain. Its 1 use is spent only after the second action succeeds; leaving after the first keeps it.",
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
        "Your starting Chain holds Lift Guide. The amber chevron marks a good time to Lift. With music on, listen for two notes. Tap on the higher note to keep a level path in still air. Watch the terrain for times to Lift earlier.",
        "lift",
      ),
      step(
        "Lift Guide included",
        "Every new card journey starts with Lift Guide and one card you pick from three (sometimes one of the three is a Rare). Both start in your chain, with one free Slot. Flight rewards offer other cards.",
        "skills",
      ),
    ],
  },
};
