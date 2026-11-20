// Graphics presets (owner, 2026-11-20): trade decoration for frame rate on phones.
// High = everything (the default, today's look). Medium drops the foreground layer, the terrain edge glow, wake marks and the star layer.
// Low also drops ground detail (ecology: stones, plants, tufts, roots, pools, animals).
// A preset only decides which DECORATION draw groups the renderer leaves out. It never touches the simulation, collisions, the lighting
// pass (darkness, sight, Luminance, Pulses), Sparks, pickups, hazards, Black Holes (their motes and warning flecks stay), the Wisp,
// the Collector, starter cues or the HUD. The developer URL switches (?skip=..., ?edgelight=0, ...) still work on top of a preset.
export const GRAPHICS_KEY = 'wispbound-graphics';
export const GRAPHICS_PRESETS = Object.freeze(['high', 'medium', 'low']);
export const DEFAULT_GRAPHICS = 'high';
export const GRAPHICS_LABELS = Object.freeze({high: 'High', medium: 'Medium', low: 'Low'});
const MEDIUM = ['foreground', 'edgeglow', 'wake', 'stars'];
const SKIPS = Object.freeze({high: Object.freeze([]), medium: Object.freeze(MEDIUM), low: Object.freeze([...MEDIUM, 'ecology'])});

export const normalizeGraphics = value => { const v = String(value ?? '').toLowerCase(); return GRAPHICS_PRESETS.includes(v) ? v : null; };
export const skippedGroups = preset => SKIPS[normalizeGraphics(preset) || DEFAULT_GRAPHICS];

export function loadGraphics(storage = globalThis.localStorage) { try { return normalizeGraphics(storage?.getItem?.(GRAPHICS_KEY)) || DEFAULT_GRAPHICS; } catch { return DEFAULT_GRAPHICS; } }
export function saveGraphics(preset, storage = globalThis.localStorage) { try { const v = normalizeGraphics(preset); if (v) storage?.setItem?.(GRAPHICS_KEY, v); } catch { /* private mode: keeps the default */ } }
/** ?graphics=low|medium|high overrides the stored choice for this page load only (benchmarks, previews); it is not saved. */
export function urlGraphics(search = globalThis.location?.search || '') { try { return normalizeGraphics(new URLSearchParams(search).get('graphics')); } catch { return null; } }
export const resolveGraphics = (storage, search) => urlGraphics(search) || loadGraphics(storage);

let current = DEFAULT_GRAPHICS, skipSet = new Set(SKIPS[DEFAULT_GRAPHICS]);
export function setGraphicsPreset(preset) { current = normalizeGraphics(preset) || DEFAULT_GRAPHICS; skipSet = new Set(SKIPS[current]); return current; }
export const graphicsPreset = () => current;
/** The renderer asks this per frame for one decoration group; a preset change applies to the very next frame. */
export const graphicsSkips = group => skipSet.has(group);
// The stored (or URL) choice is applied when the module loads, so every renderer sees it from the first frame.
setGraphicsPreset(resolveGraphics());
