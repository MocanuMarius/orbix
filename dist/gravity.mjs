// Compatibility only: Gravity is retired and never moves or collects packets.
export const GRAVITY_TUNING = Object.freeze({ range: 0, maxRange: 0 });
export const gravityRadius = () => 0;
export const updateGravityPackets = () => false;
