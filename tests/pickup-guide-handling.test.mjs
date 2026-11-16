import test from "node:test";
import assert from "node:assert/strict";
import { pickupGuideMarkup, pickupLesson } from "../dist/pickup-guide.mjs";

test("pickup key identifies base and separately learned Cache and Flash handling", () => {
  const row = (markup, kind) =>
    new RegExp(
      `<article[^>]+data-pickup-kind="${kind}"[\\s\\S]*?</article>`,
    ).exec(markup)?.[0] || "";
  const baseline = pickupGuideMarkup({ modifiers: { collectorFetchMass: 2 } });
  assert.match(row(baseline, "light"), /Collector can fetch/);
  assert.match(row(baseline, "cluster"), /Collector can fetch/);
  assert.match(
    row(baseline, "cache"),
    /Touch with your wisp · needs Cache Handling/,
  );
  assert.match(
    row(baseline, "sight"),
    /Touch with your wisp · needs Flash Handling/,
  );
  const cache = pickupGuideMarkup({ modifiers: { collectorFetchMass: 3 } });
  assert.match(row(cache, "cache"), /Collector can fetch/);
  assert.match(row(cache, "sight"), /needs Flash Handling/);
  const flash = pickupGuideMarkup({ modifiers: { collectorFlashFetch: true } });
  assert.match(row(flash, "cache"), /needs Cache Handling/);
  assert.match(row(flash, "sight"), /Collector can fetch/);
});

test("first-contact lessons use actual packet mass and mounted handling without promising recovery unlocks", () => {
  assert.match(
    pickupLesson(
      { kind: "light", sparkMass: 3 },
      { modifiers: { collectorFetchMass: 2 } },
    ).text,
    /Touch with your main wisp.*Cache Handling/,
  );
  assert.match(
    pickupLesson("cache", { modifiers: { collectorFetchMass: 3 } }).text,
    /lower shell flows into a small green circle: Collector can latch/,
  );
  assert.match(
    pickupLesson("sight", { modifiers: { collectorFlashFetch: false } }).text,
    /Touch with your main wisp.*Flash Handling/,
  );
  assert.match(
    pickupLesson("sight", { modifiers: { collectorFlashFetch: true } }).text,
    /lower shell flows into a small green circle: Collector can latch/,
  );
  assert.match(
    pickupLesson("light", { companions: ["protector"] }).text,
    /Touch with your main wisp/,
  );
});

test("Dusk and Dark keep caution and manual-contact descriptions after all handling upgrades", () => {
  const key = pickupGuideMarkup({
    modifiers: { collectorFetchMass: 3, collectorFlashFetch: true },
    discovered: ["dark", "dusk"],
  });
  for (const kind of ["dark", "dusk"]) {
    const row = new RegExp(
      `<article[^>]+data-pickup-kind="${kind}"[\\s\\S]*?</article>`,
    ).exec(key)[0];
    assert.match(row, /Caution · body contact only/);
    assert.doesNotMatch(row, /Collector can fetch/);
  }
});
