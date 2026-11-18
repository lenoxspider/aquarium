const TAU = Math.PI * 2;

function wrapAngle(a) {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
}

export function rotateTowards(current, target, maxStep) {
  const delta = wrapAngle(target - current);
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

/**
 * Where a fish wants to go this instant, expressed as a direction plus a
 * speed multiplier. Pure calculation: it reads fish state and writes nothing.
 */
export function desiredHeading(fish, world) {
  const { tank, fish: school, food, startle } = world;
  const spec = fish.spec;
  const b = tank.bounds(spec.band);

  let dx = 0;
  let dy = 0;
  let speedScale = 1;

  // Wander target.
  dx += (fish.target.x - fish.x) * 0.9;
  dy += (fish.target.y - fish.y) * 0.9;

  // Schooling: alignment, cohesion and separation from the same species.
  let cx = 0;
  let cy = 0;
  let ax = 0;
  let ay = 0;
  let count = 0;
  let sepX = 0;
  let sepY = 0;

  for (const other of school) {
    if (other === fish) continue;
    const ox = other.x - fish.x;
    const oy = other.y - fish.y;
    const d2 = ox * ox + oy * oy;
    if (d2 > 150 * 150 || d2 < 1e-4) continue;

    const d = Math.sqrt(d2);
    const personal = (fish.length + other.length) * 0.55;
    if (d < personal) {
      sepX -= (ox / d) * (personal - d);
      sepY -= (oy / d) * (personal - d);
      continue;
    }

    if (other.spec.id === spec.id && spec.schooling > 0) {
      cx += other.x;
      cy += other.y;
      ax += Math.cos(other.angle);
      ay += Math.sin(other.angle);
      count += 1;
    }
  }

  if (count > 0) {
    cx = cx / count - fish.x;
    cy = cy / count - fish.y;
    const s = spec.schooling;
    dx += cx * 1.1 * s;
    dy += cy * 1.1 * s;
    dx += ax * 26 * s;
    dy += ay * 26 * s;
  }

  dx += sepX * 2.6;
  dy += sepY * 2.6;

  // Glass and sand.
  const margin = 64;
  if (fish.x < b.minX + margin) dx += (b.minX + margin - fish.x) * 2.2;
  if (fish.x > b.maxX - margin) dx -= (fish.x - (b.maxX - margin)) * 2.2;
  if (fish.y < b.minY + margin) dy += (b.minY + margin - fish.y) * 2.4;
  if (fish.y > b.maxY - margin) dy -= (fish.y - (b.maxY - margin)) * 3.2;

  // Food, unless the water is in panic: a scared fish is not hungry.
  const bite = startle && startle.t > 0.35 ? null : food.nearest(fish.x, fish.y, 260);
  if (bite) {
    dx += (bite.x - fish.x) * 2.6;
    dy += (bite.y - fish.y) * 2.6;
    speedScale = 1.7;
  }

  // Startle: everything turns away from the disturbance.
  if (startle && startle.t > 0) {
    const sx = fish.x - startle.x;
    const sy = fish.y - startle.y;
    const d2 = sx * sx + sy * sy;
    if (d2 > 1) {
      const d = Math.sqrt(d2);
      const weight = Math.min(1, 460 / d);
      dx += (sx / d) * 760 * weight * startle.t;
      dy += (sy / d) * 760 * weight * startle.t;
      speedScale = Math.max(speedScale, 1.9);
    }
  }

  return { dx, dy, speedScale };
}
