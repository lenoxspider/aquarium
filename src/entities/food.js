import { createRng } from '../core/rng.js';
import { mix, rgba } from '../core/color.js';
import { depthParallax, depthScale } from '../systems/depth.js';

function drawFlake(flake, ctx, alpha, env) {
  const p = env.palette;
  const x = flake.px + (flake.x - flake.px) * alpha;
  const y = flake.py + (flake.y - flake.py) * alpha;
  const s = flake.size * depthScale(flake.z);
  const par = depthParallax(env.parallax, flake.z);

  ctx.save();
  ctx.translate(x + par.x, y + par.y);
  ctx.rotate(flake.angle);
  ctx.globalAlpha = (0.55 + flake.z * 0.45) * flake.fade;
  ctx.fillStyle = mix(flake.color, p.mid, (1 - p.ambient) * 0.4 + (1 - flake.z) * 0.25);
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 1.5, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Flakes dropped on click. They sink, drift with the current, and rest on the
 * sand for a while before dissolving.
 */
export class Food {
  constructor() {
    this.items = [];
    this.rng = createRng(0x5eed);
  }

  spawn(x, y, count = 16) {
    for (let i = 0; i < count; i += 1) {
      const flake = {
        x: x + this.rng.gauss() * 34,
        y: y + this.rng.gauss() * 22,
        z: this.rng.range(0.25, 0.95),
        size: this.rng.range(0.9, 1.9),
        sink: this.rng.range(10, 24),
        sway: this.rng.range(6, 18),
        phase: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(0.6, 1.5),
        angle: this.rng.range(0, Math.PI * 2),
        color: this.rng.pick(['#e8cc90', '#d8b878', '#f0dcaa']),
        fade: 1,
        rest: 0,
        alive: true,
      };
      flake.px = flake.x;
      flake.py = flake.y;
      flake.draw = (ctx, a, env) => drawFlake(flake, ctx, a, env);
      this.items.push(flake);
    }
  }

  update(dt, tank, time) {
    for (const flake of this.items) {
      flake.px = flake.x;
      flake.py = flake.y;
      if (!flake.alive) continue;

      if (flake.y >= tank.sandY - 2) {
        flake.rest += dt;
        if (flake.rest > 9) {
          flake.fade -= dt * 0.5;
          if (flake.fade <= 0) flake.alive = false;
        }
        continue;
      }

      flake.y += flake.sink * dt;
      flake.x += Math.sin(time * flake.speed + flake.phase) * flake.sway * dt;
      flake.angle += dt * 0.4 * (flake.speed - 1);
    }

    if (this.items.length > 220) {
      this.items = this.items.filter((f) => f.alive);
    }
  }

  nearest(x, y, maxDistance, band) {
    let best = null;
    let bestD = maxDistance * maxDistance;
    for (const flake of this.items) {
      if (!flake.alive) continue;
      const dx = flake.x - x;
      const dy = flake.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = flake;
      }
    }
    return best;
  }

  tryEat(x, y, radius) {
    for (const flake of this.items) {
      if (!flake.alive) continue;
      const dx = flake.x - x;
      const dy = flake.y - y;
      if (dx * dx + dy * dy < radius * radius) {
        flake.alive = false;
        return true;
      }
    }
    return false;
  }

  collect(out) {
    for (const flake of this.items) out.push(flake);
  }
}
