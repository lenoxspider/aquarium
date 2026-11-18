import { mix, rgba, shade } from '../core/color.js';

const GREENS = ['#2f7a4e', '#3d8c58', '#4f9c62', '#2a6b47', '#5aa86a', '#24603f'];
const RUST = ['#7d4c3b', '#8d5a40', '#6d4433'];

/** Points along a stem, bent by a per-stem curve plus a slow two-part sway. */
function stemPoints(stem, time, segments = 10) {
  const sway =
    Math.sin(time * stem.speed + stem.phase) * 0.55 +
    Math.sin(time * stem.speed * 0.43 + stem.phase * 1.7) * 0.45;
  const bend = stem.bend + sway * 0.42;
  const pts = [];

  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    pts.push({
      u,
      x: stem.x + bend * stem.height * (0.1 * u + 0.9 * u * u),
      y: stem.baseY - stem.height * u,
    });
  }
  return pts;
}

function bladePath(ctx, pts, widthProfile) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    const w = widthProfile(pts[i].u);
    ctx.lineTo(pts[i].x - w, pts[i].y);
  }
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const w = widthProfile(pts[i].u);
    ctx.lineTo(pts[i].x + w, pts[i].y);
  }
  ctx.closePath();
}

function bladeGradient(ctx, stem) {
  const key = `${stem.color}|${stem.tip}`;
  if (stem._gradKey === key) return stem._grad;
  const grad = ctx.createLinearGradient(0, stem.baseY, 0, stem.baseY - stem.height);
  grad.addColorStop(0, mix(stem.color, '#000000', 0.28));
  grad.addColorStop(0.55, stem.color);
  grad.addColorStop(1, stem.tip);
  stem._grad = grad;
  stem._gradKey = key;
  return grad;
}

function drawBlade(ctx, stem, time) {
  const pts = stemPoints(stem, time, 11);
  const half = stem.width * 0.5;
  const profile = (u) => half * Math.pow(1 - u, 0.75);

  bladePath(ctx, pts, profile);
  // Distant blades are fogged flat anyway; skip the gradient rasterisation.
  ctx.fillStyle = stem.z < 0.4 ? stem.color : bladeGradient(ctx, stem);
  ctx.fill();
}

function drawFern(ctx, stem, time) {
  const pts = stemPoints(stem, time, 12);
  const half = stem.width * 0.5;

  bladePath(ctx, pts, (u) => half * Math.pow(1 - u, 0.6));
  ctx.fillStyle = mix(stem.color, '#000000', 0.2);
  ctx.fill();

  for (let i = 2; i < pts.length - 1; i += 1) {
    const p = pts[i];
    const prev = pts[i - 1];
    const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
    const length = stem.leaf * (1 - p.u * 0.65);
    const side = i % 2 === 0 ? 1 : -1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + side * 0.62);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -length * 0.16, length, 0);
    ctx.quadraticCurveTo(length * 0.5, length * 0.14, 0, 0);
    ctx.fillStyle = i > pts.length * 0.6 ? stem.tip : stem.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawBroad(ctx, stem, time) {
  const pts = stemPoints(stem, time, 12);
  const half = stem.width * 0.55;

  bladePath(ctx, pts, (u) => half * Math.pow(1 - u, 0.4));
  ctx.fillStyle = mix(stem.color, '#000000', 0.3);
  ctx.fill();

  const leaves = stem.leafCount;
  for (let i = 0; i < leaves; i += 1) {
    const u = 0.28 + (i / Math.max(1, leaves - 1)) * 0.66;
    const idx = Math.min(pts.length - 1, Math.round(u * (pts.length - 1)));
    const p = pts[idx];
    const prev = pts[Math.max(0, idx - 1)];
    const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
    const side = i % 2 === 0 ? 1 : -1;
    const size = stem.leaf * (1 - u * 0.4);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + side * 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.35, -size * 0.55, size * 1.15, -size * 0.42, size * 1.25, 0);
    ctx.bezierCurveTo(size * 1.15, size * 0.42, size * 0.35, size * 0.55, 0, 0);
    ctx.fillStyle = i % 2 === 0 ? stem._leafDark : stem._leafLight;
    ctx.fill();
    ctx.strokeStyle = rgba('#0b2a1b', 0.18);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }
}

function drawBush(ctx, stem, time) {
  for (const child of stem.blades) drawBlade(ctx, child, time);
}

const RENDERERS = { blade: drawBlade, fern: drawFern, broad: drawBroad, bush: drawBush };

/** Colours only change when the light changes, so derive them once per palette. */
function tintStem(stem, p) {
  if (stem._pKey === p.key) return;
  const fog = (1 - stem.z) * 0.5 + (1 - p.ambient) * 0.22;
  stem.color = mix(stem.baseColor, p.mid, fog);
  stem.tip = mix(stem.baseTip, p.light, (1 - stem.z) * 0.16 + (1 - p.ambient) * 0.1);
  stem._leafDark = mix(stem.color, '#000000', 0.18);
  stem._leafLight = stem.tip;
  stem._grad = null;
  stem._pKey = p.key;
}

function drawStem(self, ctx, env) {
  const p = env.palette;
  tintStem(self, p);
  for (const child of self.blades) tintStem(child, p);

  ctx.save();
  ctx.globalAlpha = 0.58 + self.z * 0.42;
  const par = env.parallax || { x: 0, y: 0 };
  ctx.translate(par.x * (0.25 + self.z * 0.9), par.y * (0.25 + self.z * 0.9));
  (RENDERERS[self.type] || drawBlade)(ctx, self, env.time);
  ctx.restore();
}

/**
 * Planted stems, built in clusters the way an aquascape is actually planted:
 * a tall back wall, midground groups and a couple of foreground clumps that
 * frame the glass. Each stem carries its own depth so it can interleave with
 * the fish.
 */
export class Plants {
  constructor() {
    this.stems = [];
  }

  regrow(tank, rng) {
    this.stems.length = 0;
    const w = tank.width;
    const h = tank.height;

    const makeStem = (type, cx, z, scale, height) => {
      const rust = rng.chance(0.06);
      const baseColor = rust ? rng.pick(RUST) : rng.pick(GREENS);
      const stem = {
        type,
        z: Math.min(0.99, Math.max(0.02, z + rng.range(-0.05, 0.05))),
        x: cx + rng.gauss() * 62 * scale,
        baseY: tank.sandY + rng.range(2, 22),
        height,
        width: rng.range(4, 10) * (0.7 + z * 0.6),
        bend: rng.range(-0.28, 0.28),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.5, 1.1),
        leaf: rng.range(10, 20) * (0.7 + z * 0.6),
        leafCount: rng.int(3, 5),
        baseColor,
        baseTip: shade(baseColor, rng.range(0.12, 0.3)),
        blades: [],
      };
      stem.color = stem.baseColor;
      stem.tip = stem.baseTip;
      return stem;
    };

    const addCluster = (cx, z, type, count, scale) => {
      for (let i = 0; i < count; i += 1) {
        const height = h * rng.range(0.17, 0.36) * scale;
        const stem = makeStem(type, cx, z, scale, height);

        if (type === 'bush') {
          const fans = rng.int(5, 9);
          for (let b = 0; b < fans; b += 1) {
            const child = makeStem('blade', cx, z, scale, height * rng.range(0.45, 1));
            child.z = stem.z;
            child.x = stem.x + rng.range(-18, 18);
            child.bend = rng.range(-0.5, 0.5);
            child.width = stem.width * rng.range(0.5, 0.9);
            stem.blades.push(child);
          }
        }

        stem.draw = (ctx, alpha, env) => drawStem(stem, ctx, env);
        this.stems.push(stem);
      }
    };

    // Back wall: tall enough to fill the middle of the tank.
    addCluster(w * 0.14, 0.12, 'blade', 10, 1.55);
    addCluster(w * 0.42, 0.16, 'fern', 8, 1.5);
    addCluster(w * 0.78, 0.2, 'broad', 8, 1.45);
    addCluster(w * 0.6, 0.1, 'blade', 7, 1.35);

    // Midground.
    addCluster(w * 0.3, 0.44, 'fern', 7, 1.05);
    addCluster(w * 0.62, 0.52, 'blade', 8, 1.0);
    addCluster(w * 0.46, 0.36, 'broad', 5, 0.95);
    addCluster(w * 0.86, 0.46, 'fern', 6, 1.0);

    // Foreground framing, kept to the edges so the centre stays open water.
    addCluster(w * 0.06, 0.9, 'blade', 7, 1.35);
    addCluster(w * 0.96, 0.94, 'fern', 6, 1.3);

    // Carpet.
    for (let i = 0; i < 8; i += 1) {
      addCluster(w * rng.range(0.08, 0.92), rng.range(0.3, 0.6), 'bush', 4, 0.65);
    }

    this.stems.sort((a, b) => a.z - b.z);
  }

  collect(out) {
    for (const stem of this.stems) out.push(stem);
  }
}
