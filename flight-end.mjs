// Place the refuge just beyond the actual solid scenery, not a duration timer.
// Includes prop polygons so the exit never cuts off a final tree or building.
export function flightEndDistance(layout, playerX = 98, fallback = 0) {
  let right = -Infinity;
  for (const obstacle of layout.obstacles || []) {
    let localRight = -Infinity;
    for (const shape of [obstacle.topShape, obstacle.bottomShape])
      for (const point of shape || []) localRight = Math.max(localRight, point[0]);
    for (const prop of obstacle.sceneProps || [])
      for (const part of prop.parts || [])
        for (const point of part.polygon || []) localRight = Math.max(localRight, point[0]);
    if (!Number.isFinite(localRight)) localRight = (obstacle.width || 0) * 2.5;
    right = Math.max(right, obstacle.x + localRight);
  }
  return Number.isFinite(right) ? Math.max(1, right + 72 - playerX) : fallback;
}
