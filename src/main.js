import { createSurface } from './core/canvas.js';
import { Loop } from './core/loop.js';
import { createRng } from './core/rng.js';
import { Tank } from './world/tank.js';
import { Water, resolvePalette } from './world/water.js';
import { Substrate } from './world/substrate.js';
import { Plants } from './world/plants.js';
import { Bubbles } from './world/bubbles.js';
import { Particulates } from './world/particulates.js';
import { Food } from './entities/food.js';
import { Fish } from './entities/fish.js';
import { SPECIES, STOCK } from './entities/species/index.js';
import { Renderer } from './render/layers.js';
import { PostFx } from './render/postfx.js';
import { Input } from './systems/input.js';
import { mountControls } from './ui/controls.js';

const SEED = 20261118;
const DEFAULT_MOOD = 0.35;

const canvas = document.getElementById('tank');
const surface = createSurface(canvas);

const world = {
  tank: new Tank(surface.width, surface.height),
  water: new Water(),
  substrate: new Substrate(),
  plants: new Plants(),
  bubbles: new Bubbles(),
  motes: new Particulates(),
  food: new Food(),
  fish: [],
  palette: resolvePalette(DEFAULT_MOOD),
  parallax: { x: 0, y: 0 },
  startle: { x: 0, y: 0, t: 0 },
};

const renderer = new Renderer(surface, world, new PostFx());
const input = new Input({
  surface,
  canvas,
  onFeed: (x, y) => world.food.spawn(x, y),
});

/** Rebuild the static parts of the tank for the current size. */
function build() {
  world.tank.resize(surface.width, surface.height);
  world.substrate.rebuild(world.tank, createRng(SEED + 7));
  world.plants.regrow(world.tank, createRng(SEED + 11));
  world.bubbles.reset(world.tank, createRng(SEED + 13));
  world.motes.reset(world.tank, createRng(SEED + 17));
}

function stock() {
  world.fish.length = 0;
  const rng = createRng(SEED + 23);
  for (const { species, count } of STOCK) {
    for (let i = 0; i < count; i += 1) world.fish.push(new Fish(species, world.tank, rng));
  }
}

function update(dt, time) {
  world.parallax.x = input.parallax.x;
  world.parallax.y = input.parallax.y;
  input.update(dt);

  if (world.startle.t > 0) world.startle.t = Math.max(0, world.startle.t - dt * 0.85);

  world.bubbles.update(dt, world.tank, time);
  world.motes.update(dt, world.tank, time);
  world.food.update(dt, world.tank, time);

  for (const fish of world.fish) fish.update(dt, world);
}

build();
stock();

const controls = mountControls(document.getElementById('ui'), {
  mood: DEFAULT_MOOD,
  onMood: (value) => {
    world.palette = resolvePalette(value);
  },
  onFeed: () => {
    const w = world.tank.width;
    world.food.spawn(w * (0.25 + Math.random() * 0.5), world.tank.surfaceY + 50);
  },
  onStartle: () => {
    world.startle.x = world.tank.width * (0.2 + Math.random() * 0.6);
    world.startle.y = world.tank.height * (0.28 + Math.random() * 0.36);
    world.startle.t = 1.3;
    for (const fish of world.fish) fish.burst = Math.max(fish.burst, 0.7);
  },
});

controls.setStats(`${world.fish.length} fish · ${SPECIES.length} species`);
input.attach();

const loop = new Loop({
  update,
  render: (alpha, time) => renderer.draw(alpha, time),
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    surface.resize();
    build();
    stock();
    controls.setStats(`${world.fish.length} fish · ${SPECIES.length} species`);
  }, 160);
});

loop.start();

// Exposed for debugging in the console; the scene does not depend on it.
window.aquarium = { world, loop, surface, renderer };
