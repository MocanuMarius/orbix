const DISPLAY_SCALE = .3;

// Only the flight owns these charges. Rehearsal and recorded inputs leave them intact.
export class FlightBoon {
  constructor(engine, id) {
    this.engine = engine;
    this.id = id;
    const favors=engine.mod?.eventFavors||[];
    this.reserveWick=favors.includes('wick');
    this.giftLifts=favors.includes('feather')?2:0;
    this.farLens=favors.includes('lens');this.quickChime=favors.includes('haste');
    this.extraCostLifts=favors.includes('burden')?6:0;
    this.ward = id === 'edgeweaver';
    this.lifts = id === 'long-glide' ? 3 : 0;
    this.liftBudget = 9 / DISPLAY_SCALE;
    this.pickups = id === 'constellation' ? 3 : 0;
    this.survey = id === 'wayfinder';
  }

  get awake() {
    const dream = this.engine.dream;
    return !dream || (dream.mode !== 'record' && !dream.active);
  }

  get recoveryRate() {
    return this.awake?Math.max(this.quickChime?1.25:1,this.id==='wild-circuit'?1.2:1):1;
  }

  get drainScale() {
    return this.id === 'night-sail' && this.awake ? .75 : 1;
  }

  get luminanceScale() {
    if(!this.awake)return 1;
    if(this.farLens)return 1.35;
    if(this.id!=='flash-relay')return 1;
    const wakingTime = this.engine.time - (this.engine.dream?.duration || 0);
    return wakingTime < 15 ? 1.25 : 1;
  }

  tryReserve() {
    const f=this.engine;
    if(!this.awake||!this.reserveWick||f.flame*DISPLAY_SCALE>=6)return 0;
    this.reserveWick=false;
    const gain=Math.min(f.maxFlame-f.flame,9/DISPLAY_SCALE);
    f.flame+=gain;f.flameRestored+=gain;
    f.setEvent?.('Reserve Wick · +9 Sparks');
    return gain;
  }
  get wardReady() {
    return this.ward && this.awake;
  }

  liftSaving(cost) {
    return !this.awake?0:this.giftLifts?cost:this.lifts?Math.min(cost,this.liftBudget):0;
  }

  spendLift(cost) {
    if(this.awake&&this.giftLifts){this.giftLifts--;return 0;}
    const saving = this.liftSaving(cost);
    if (saving > 0) {
      this.lifts--;
      this.liftBudget = Math.max(0, this.liftBudget - saving);
    }
    return cost - saving;
  }

  fuelPickup(packet, spec) {
    if (!this.pickups || !this.awake || packet.generated || spec.dim || !(spec.fuel > 0)) return 0;
    this.pickups--;
    const flight = this.engine;
    const restored = Math.min(2 / DISPLAY_SCALE, flight.maxFlame - flight.flame);
    flight.flame += restored;
    flight.flameRestored += restored;
    return restored;
  }

  drawSurvey(context, scale, polygons) {
    const flight = this.engine;
    if (!this.survey || !flight.paused || flight.time !== 0 || flight.dream?.mode === 'record') return;
    const distance = flight.distance;
    const start = flight.player.x;
    const end = Math.min(flight.width, start + flight.baseSpeed * 2.5);
    const visibleEnd = Math.min(flight.width, end + flight.getLightState().baseRadius);
    const c = context;
    c.save();
    c.scale(scale, scale);
    c.beginPath();
    c.rect(start, 0, visibleEnd - start, flight.height);
    c.clip();
    c.fillStyle = 'rgba(31,66,70,.23)';
    c.fillRect(start, 0, end - start, flight.height);
    c.fillStyle = 'rgba(83,120,119,.5)';
    c.strokeStyle = '#adcebe';
    c.lineWidth = 2;
    for (const obstacle of flight.layout.obstacles) {
      if (obstacle.x - distance > visibleEnd + obstacle.width) break;
      if (obstacle.destroyed || obstacle.x + obstacle.width * 2 - distance < start) continue;
      for (const shape of polygons(obstacle, flight.time)) {
        if (!shape.length) continue;
        c.beginPath();
        shape.forEach(([x,y], i) => i ? c.lineTo(x - distance,y) : c.moveTo(x - distance,y));
        c.closePath(); c.fill(); c.stroke();
      }
    }
    for (const spark of flight.layout.embers) {
      const x = spark.x - distance;
      if (x > visibleEnd + 5) break;
      if (x < start || spark.generated || spark.collected) continue;
      c.fillStyle = spark.harmful || spark.kind === 'dark' || spark.kind === 'dusk' ? '#cf8c8d' : '#d0ddb0';
      c.fillRect(Math.round(x - 2), Math.round(spark.y - 2), 4, 4);
    }
    c.setLineDash([4,8]);
    c.globalAlpha = .55;
    c.beginPath(); c.moveTo(end - 2,0); c.lineTo(end - 2,flight.height); c.stroke();
    c.restore();
  }
}
