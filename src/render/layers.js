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
    world.motes.drawBack(ctx, palette);

    const items = this._items;
    items.length = 0;
    world.plants.collect(items);
    for (const fish of world.fish) items.push(fish);
    world.bubbles.collect(items);
    world.food.collect(items);

    items.sort((a, b) => a.z - b.z);
    for (const item of items) item.draw(ctx, alpha, env);

    world.motes.drawFront(ctx, palette);
    world.water.surface(ctx, tank, time, palette);
    world.water.shafts(ctx, tank, time, palette);
    this.postfx.draw(ctx, tank, palette, time);
  }
}
