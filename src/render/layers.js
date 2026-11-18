import { depthScale } from '../systems/depth.js';

/**
 * Back-to-front compositing. Everything that lives at a depth is collected,
 * sorted once and drawn in a single pass, so a fish can swim behind a plant
 * stem and in front of another one in the same frame.
 */
export class Renderer {
  constructor(surface, world, postfx) {
    this.surface = surface;
    this.world = world;
    this.postfx = postfx;
    this._items = [];
    this._shadowGrad = null;
  }

  _shadowGradient(ctx) {
    if (this._shadowGrad) return this._shadowGrad;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    g.addColorStop(0.6, 'rgba(0, 0, 0, 0.22)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this._shadowGrad = g;
    return g;
  }

  /** Soft shadows cast on the sand, fainter the higher the fish swims. */
  _shadows(ctx, world, env) {
    const { tank, palette: p, fish } = world;
    const span = tank.waterHeight * 0.8;

    for (const f of fish) {
      const dist = tank.sandY - f.y;
      if (dist > span || dist < -20) continue;
      const k = 1 - Math.max(0, dist) / span;
      const a = 0.5 * k * k * (0.35 + f.z * 0.65) * p.ambient;
      if (a < 0.012) continue;
      const rx = f.length * depthScale(f.z) * 0.6;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(f.x + env.parallax.x * 0.3, tank.sandY + 10 + (1 - f.z) * 16);
      ctx.scale(rx, rx * 0.3);
      ctx.fillStyle = this._shadowGradient(ctx);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  draw(alpha, time) {
    const world = this.world;
    const { ctx } = this.surface;
    const { tank, palette } = world;

    const env = {
      tank,
      palette,
      time,
      parallax: world.parallax,
    };

    world.water.backdrop(ctx, tank, palette);
    world.substrate.draw(ctx, tank, palette);
    world.water.caustics(ctx, tank, time, palette);
    this._shadows(ctx, world, env);
    world.motes.drawBack(ctx, palette);

    const items = this._items;
    items.length = 0;
    world.plants.collect(items);
    for (const fish of world.fish) items.push(fish);
    for (const shrimp of world.shrimps) items.push(shrimp);
    world.bubbles.collect(items);
    world.food.collect(items);

    items.sort((a, b) => a.z - b.z);
    for (const item of items) item.draw(ctx, alpha, env);

    world.water.drawRipples(ctx, tank, time, palette);
    world.motes.drawFront(ctx, palette);
    world.water.surface(ctx, tank, time, palette);
    world.water.shafts(ctx, tank, time, palette);
    if (world.snail) world.snail.draw(ctx, alpha, env);
    this.postfx.draw(ctx, tank, palette, time);
  }
}
