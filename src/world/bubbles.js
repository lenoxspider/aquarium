import { rgba } from '../core/color.js';

function drawBubble(bubble, ctx, env) {
  if (!bubble.alive) return;
  const p = env.palette;
  const z = bubble.z;
  const r = bubble.r * (0.55 + z * 0.8);
  const x = bubble.x;
  const y = bubble.y;

  ctx.save();
  ctx.globalAlpha = (0.28 + z * 0.55) * (0.6 + p.ambient * 0.4);
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(p.light, 0.1);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(p.light, 0.55);
  ctx.lineWidth = Math.max(0.6, r * 0.22);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.34, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.fill();

  ctx.restore();
}

/**
 * Bubble streams from three points on the sand. Bubbles are recycled at the
 * water line rather than reallocated, so the population stays constant.
 */
export class Bubbles {
  constructor() {
    this.items = [];
    this.emitters = [];
  }

  reset(tank, rng) {
    this.items.length = 0;
    this.rng = rng;
    this.emitters = [
      { x: tank.width * 0.2, z: 0.55, interval: 0.34, timer: 0 },
      { x: tank.width * 0.68, z: 0.8, interval: 0.5, timer: 0.2 },
      { x: tank.width * 0.88, z: 0.35, interval: 0.72, timer: 0.45 },
    ];

    for (const emitter of this.emitters) {
      for (let i = 0; i < 6; i += 1) {
        this.items.push(this._make(emitter, tank, rng, i * 0.05));
      }
    }
  }

  _make(emitter, tank, rng, life = 0) {
    const bubble = {
      x: emitter.x + rng.range(-7, 7),
      y: tank.sandY - rng.range(0, 60),
      z: Math.min(0.98, Math.max(0.1, emitter.z + rng.range(-0.12, 0.18))),
      r: rng.range(1.6, 4.4),
      speed: rng.range(34, 74),
      amp: rng.range(2, 9),
      phase: rng.range(0, Math.PI * 2),
      wobble: rng.range(1.4, 3.2),
      emitter,
      alive: true,
    };
    bubble.y = Math.min(tank.sandY - 4, bubble.y - life * tank.waterHeight);
    bubble.draw = (ctx, alpha, env) => drawBubble(bubble, ctx, env);
    return bubble;
  }

  update(dt, tank, time, onPop) {
    const rng = this.rng;

    for (const emitter of this.emitters) {
      emitter.timer += dt;
      if (emitter.timer >= emitter.interval) {
        emitter.timer = 0;
        const spare = this.items.find((b) => !b.alive);
        const bubble = spare || this._make(emitter, tank, rng);
        bubble.x = emitter.x + rng.range(-7, 7);
        bubble.y = tank.sandY - 4;
        bubble.alive = true;
        bubble.r = rng.range(1.6, 4.4);
        bubble.emitter = emitter;
        if (!spare) this.items.push(bubble);
      }
    }

    for (const bubble of this.items) {
      if (!bubble.alive) continue;
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(time * bubble.wobble + bubble.phase) * bubble.amp * dt;
      if (bubble.y < tank.surfaceY + 4) {
        bubble.alive = false;
        if (onPop) onPop(bubble.x);
      }
    }
  }

  collect(out) {
    for (const bubble of this.items) if (bubble.alive) out.push(bubble);
  }
}
