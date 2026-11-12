// Shared flight / expedition rules. Currency and fuel are separate rewards.
export const FLAME_TUNING = Object.freeze({ maximum: 100, starting: 60, flapCost: 7,
  emberFuel: 24, heartFuel: 40, generatedFuel: 6, checkpointMinimum: 60, healPickups: 4 });

export const AFTERGLOW_TUNING = Object.freeze({ cap: 40, retention: .80,
  drawLimit: 20, failureLoss: .25, surplusThreshold: 60, practiceReserve: 20 });
