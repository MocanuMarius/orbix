// Shared flight / expedition rules. Currency and fuel are separate rewards.
export const FLAME_TUNING = Object.freeze({ maximum: 100, starting: 75, flapCost: 7,
  emberFuel: 24, heartFuel: 40, generatedFuel: 6, checkpointMinimum: 0, warmCorePickups: 4 });

export const AFTERGLOW_TUNING = Object.freeze({ cap: 40, retention: .80,
  drawLimit: 20, failureLoss: .25, surplusThreshold: 60, practiceReserve: 20 });

export const LIFE_TUNING = Object.freeze({ lives: 3, maximum: 5 });
export function getLifeCapacity(run) {
  return Math.min(LIFE_TUNING.maximum, LIFE_TUNING.lives
    + (run?.skills?.['main-spare-spark'] > 0 ? 1 : 0)
    + (run?.skills?.['main-deep-reserve'] > 0 ? 1 : 0));
}

// Dark packets affect only the current attempt's light, never lives or fuel.
export const LIGHT_PACKET_TUNING = Object.freeze({ baseRadius: 175, pickupRadius: 16,
  absorptionDuration: 1.35, absorptionLimit: 24, darkDuration: 8,
  darkPenalty: .2, darkMaximumStacks: 2, minimumLight: .6,
  recoveryFade: 1.5, dimResponse: 9 });
