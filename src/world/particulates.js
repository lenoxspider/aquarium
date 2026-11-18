import { rgba } from '../core/color.js';

const COUNT = 150;

/**
 * Suspended motes. They are batched into two depth passes and three opacity
 * buckets, so a hundred-odd particles cost a handful of fill calls.
 */
export class Particulates {
  constructor() {
    this.motes = [];
  }

  reset(tank, rng) {
    this.motes.length = 0;
    for (let i = 0; i < COUNT; i += 1) {
      this.motes.push({
        x: rng.range(0, tank.width),
        y: rng.range(tank.surfaceY, tank.sandY),
        z: rng.bias(1.6),
        size: rng.range(0.7, 2.3),
        vx: rng.range(-5, 5),
        vy: rng.range(-7, 2),
        phase: rng.range(0, Math.PI * 2),
        drift: rng.range(0.2, 0.7),
      });
    }
  }

  update(dt, tank, time) {
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(time * m.drift + m.phase) * 7) * dt;
      m.y += (m.vy + Math.cos(time * m.drift * 0.7 + m.phase) * 4) * dt;

      if (m.y < tank.surfaceY + 6) m.y = tank.sandY;
      if (m.y > tank.sandY) m.y = tank.surfaceY + 6;
      if (m.x < -10) m.x = tank.width + 10;
      if (m.x > tank.width + 10) m.x = -10;
    }
  }

  _draw(ctx, p, zMin, zMax) {
    for (let bucket = 0; bucket < 3; bucket += 1) {
      const lo = zMin + ((zMax - zMin) * bucket) / 3;
      const hi = zMin + ((zMax - zMin) * (bucket + 1)) / 3;
      ctx.beginPath();
      let any = false;
      for (const m of this.motes) {
        if (m.z < lo || m.z >= hi) continue;
        ctx.moveTo(m.x, m.y);
        ctx.arc(m.x, m.y, m.size * (0.5 + m.z * 0.8), 0, Math.PI * 2);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = rgba(p.light, 0.1 + bucket * 0.13);
      ctx.fill();
    }
  }

  drawBack(ctx, p) {
    this._draw(ctx, p, 0, 0.5);
  }

  drawFront(ctx, p) {
    this._draw(ctx, p, 0.5, 1.01);
  }
}
