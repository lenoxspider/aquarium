import { createSurface } from './core/canvas.js';
import { Loop } from './core/loop.js';
import { createRng } from './core/rng.js';
import { Tank } from './world/tank.js';
import { Water, resolvePalette, BIOME_IDS } from './world/water.js';
import { Substrate } from './world/substrate.js';
import { Plants } from './world/plants.js';
import { Bubbles } from './world/bubbles.js';
import { Particulates } from './world/particulates.js';
import { Food } from './entities/food.js';
import { Fish } from './entities/fish.js';
import { Snail } from './entities/snail.js';
import { Shrimp } from './entities/shrimp.js';
import { SPECIES, STOCK } from './entities/species/index.js';
import { Renderer } from './render/layers.js';
import { PostFx } from './render/postfx.js';
import { Input } from './systems/input.js';
import { Sound } from './audio/sound.js';
import { mountControls } from './ui/controls.js';

const SEED = 20261118;
const DEFAULT_MOOD = 0.35;
const CYCLE_SECONDS = 240; // a full dawn-to-dawn day when auto cycle is on

const canvas = document.getElementById('tank');
const surface = createSurface(canvas);
const sound = new Sound();

const state = { mood: DEFAULT_MOOD, biome: 'clear', autoCycle: false, uiMood: DEFAULT_MOOD };

const world = {
  tank: new Tank(surface.width, surface.height),
  water: new Water(),
  substrate: new Substrate(),
  plants: new Plants(),
  bubbles: new Bubbles(),
  motes: new Particulates(),
  food: new Food(),
  fish: [],
  shrimps: [],
  snail: null,
  palette: resolvePalette(DEFAULT_MOOD, 'clear'),
  parallax: { x: 0, y: 0 },
  pointer: { x: 0, y: 0, active: false },
  startle: { x: 0, y: 0, t: 0 },
};

const renderer = new Renderer(surface, world, new PostFx());
const input = new Input({ surface, canvas, onFeed: (x, y) => feed(x, y) });

function applyPalette() {
  world.palette = resolvePalette(state.mood, state.biome);
}

function feed(x, y) {
  world.food.spawn(x, y);
  world.water.addRipple(x, y, { strength: 1, born: loop.time });
  sound.feed();
}

function takePhoto() {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'aquarium.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  sound.shutter();
}

/** Rebuild the static parts of the tank for the current size. */
function build() {
  world.tank.resize(surface.width, surface.height);
  world.substrate.rebuild(world.tank, createRng(SEED + 7));
  world.plants.regrow(world.tank, createRng(SEED + 11));
  world.bubbles.reset(world.tank, createRng(SEED + 13));
  world.motes.reset(world.tank, createRng(SEED + 17));
  world.snail = new Snail(world.tank, createRng(SEED + 29));

  world.shrimps.length = 0;
  const shrimpRng = createRng(SEED + 31);
  for (let i = 0; i < 4; i += 1) world.shrimps.push(new Shrimp(world.tank, shrimpRng));
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
  world.pointer = input.pointer;
  input.update(dt);

  if (state.autoCycle) {
    state.mood = (state.mood + dt / CYCLE_SECONDS) % 1;
    applyPalette();
    if (Math.abs(state.mood - state.uiMood) > 0.01) {
      state.uiMood = state.mood;
      controls.setMood(state.mood);
    }
  }

  if (world.startle.t > 0) world.startle.t = Math.max(0, world.startle.t - dt * 0.85);

  world.bubbles.update(dt, world.tank, time, (x) => {
    world.water.addRipple(x, world.tank.surfaceY + 2, { strength: 0.5, surface: true, born: time });
    sound.pop(0.5);
  });
  world.motes.update(dt, world.tank, time);
  world.food.update(dt, world.tank, time);
  world.snail.update(dt, world.tank, time);
  for (const shrimp of world.shrimps) shrimp.update(dt, world.tank, time);
  for (const fish of world.fish) fish.update(dt, world);
}

build();
stock();

const controls = mountControls(document.getElementById('ui'), {
  mood: state.mood,
  biome: state.biome,
  onMood: (value) => {
    state.mood = value;
    state.uiMood = value;
    applyPalette();
  },
  onFeed: () => feed(world.tank.width * (0.25 + Math.random() * 0.5), world.tank.surfaceY + 50),
  onStartle: () => {
    world.startle.x = world.tank.width * (0.2 + Math.random() * 0.6);
    world.startle.y = world.tank.height * (0.28 + Math.random() * 0.36);
    world.startle.t = 1.3;
    for (const fish of world.fish) fish.burst = Math.max(fish.burst, 0.7);
    world.water.addRipple(world.startle.x, world.startle.y, { strength: 1.4, born: loop.time });
    sound.startle();
  },
  onPhoto: takePhoto,
  onSound: (on) => sound.setEnabled(on),
  onCycle: (on) => {
    state.autoCycle = on;
  },
  onBiome: (id) => {
    state.biome = BIOME_IDS.includes(id) ? id : 'clear';
    applyPalette();
  },
});

controls.setStats(`${world.fish.length} fish · ${world.shrimps.length} shrimp · 1 snail · ${SPECIES.length + 2} species`);
input.attach();

const intro = document.getElementById('intro');
intro.querySelector('.intro__enter').addEventListener('click', () => {
  intro.classList.add('intro--gone');
  sound.setEnabled(true);
  controls.setSound(true);
  setTimeout(() => intro.remove(), 900);
});

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
    controls.setStats(`${world.fish.length} fish · ${world.shrimps.length} shrimp · 1 snail · ${SPECIES.length + 2} species`);
  }, 160);
});

loop.start();

// Exposed for debugging in the console; the scene does not depend on it.
window.aquarium = { world, loop, surface, renderer, sound, state };
