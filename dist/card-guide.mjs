// Short card-pilot lessons. The established skill-book guide stays intact.
const step = (title, text, visual) => ({ title, text, visual });

export const CARD_GUIDE_TOPICS = {
  collector: {
    name: "Collector",
    visual: "companion:collector",
    steps: [
      step(
        "Read the pickup mark",
        "A small curl growing from a pickup’s shell means Collector can fetch it. Collector starts with Sparks and Clusters. It latches onto the curl and tows the intact pickup to your main wisp; Sparks arrive on contact.",
        "collector-range",
      ),
      step(
        "Handling cards",
        "Mount Cache Handling to fetch Caches, or Flash Handling to fetch white triangles. A Cache delivery restores 12 Sparks and recharges the search ring. Any Flash pickup with Flash Handling also restores up to 6 Sparks.",
        "collector-return",
      ),
      step(
        "Recovery changes reach",
        "After an ordinary delivery, Collector’s green boundary shrinks and grows back. The pickup marks show its learned handling even while it is recovering or busy.",
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
        "A small curl growing from the shell shows a fetchable type. Handling cards grow curls on Caches and Flash. Collector tows each pickup to your moving main wisp before it absorbs; recovery changes range, not handling.",
        "collector-range",
      ),
    ],
  },
  skills: {
    name: "Your Cards",
    visual: "skills",
    steps: [
      step(
        "Three ordered slots",
        "Cards grant skills while mounted. Start with one Common card and two empty slots. Each cleared real flight offers another card.",
        "skills",
      ),
      step(
        "Equip or Melt",
        "Equip free. With full slots, choose the old card to replace and read its Melt value. A Common Melt gives 10 Stored Sparks. Exhausted cards disappear.",
        "forge",
      ),
      step(
        "Prepare at checkpoints",
        "Open Cards after flight to reorder or improve. Move left and Move right preview the new effect and shared charges. Improvements spend Stored Sparks, never flight fuel.",
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
        "Stored Sparks come from clearing, packing surplus and melting cards. Spend them to improve a mounted card at any checkpoint, or Forge at Rest. Every third natural Spark overfill releases a Luminance wave.",
        "packed",
      ),
      step(
        "Read the quote",
        "A Common Melt gives 10. Forge Rare costs 30 and one camp action. The exact seeded result is shown before you spend.",
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
        "Every first real flight clear drops one card. Equip it free or Melt it for the printed Stored Sparks. Elite and guardian relics stay separate and passive.",
        "clear-reward",
      ),
      step(
        "Keep a deliberate hand",
        "Full slots require a deliberate replacement. Read the lost ability, remaining charges and Melt return before choosing. There is no spare-card inventory.",
        "skills",
      ),
      step(
        "A winning hand",
        "The third guardian ends the run. Your final card is recorded as a trophy beside your winning hand.",
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
        "Recover restores hearts and refills Sparks. Add slot adds capacity without a refill, up to five slots and once per map. Forge spends Stored Sparks and one action.",
        "rest",
      ),
      step(
        "Growth Seed",
        "Mount this Rare before arriving to unlock Grow: +3 maximum Sparks and a full meter, without hearts. At most three growths per run.",
        "meter",
      ),
      step(
        "Second Ember",
        "This Common camp card permits a second different action at one Rest. Its one charge is spent only after the second action succeeds. Leaving after the first preserves it.",
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
        "Loaned during First Light’s Lift lesson. An amber chevron opens just before a good manual tap window. It offers advice, then disappears on Lift. It never flies for you.",
        "lift",
      ),
      step(
        "An optional starter",
        "Lift Guide can appear among the two Common starter offers. Choose it if you want coaching. Ordinary flight rewards offer other cards.",
        "skills",
      ),
    ],
  },
};
