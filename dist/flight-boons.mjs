// Neutral flight hooks. The temporary passage boons and event favors that used to drive this class are gone (they paid out as Stored Sparks,
// hearts and card changes instead). The engine (dist/flight.mjs, wisp.mjs, black-holes.mjs, flight-projection.mjs) still calls these members,
// so they stay as no-ops: the Companion recovers at its own rate, Lifts cost their full price, nothing is warded, restored or surveyed.
export class FlightBoon {
  constructor(engine) {
    this.engine = engine;
    this.ward = false;
    this.survey = false;
    this.extraCostLifts = 0;
  }
  get awake() { return true; }
  get recoveryRate() { return 1; }
  get drainScale() { return 1; }
  get luminanceScale() { return 1; }
  get wardReady() { return false; }
  tryReserve() { return 0; }
  liftSaving() { return 0; }
  spendLift(cost) { return cost; }
  fuelPickup() { return 0; }
  drawSurvey() {}
}
