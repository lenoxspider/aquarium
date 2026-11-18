# Aquarium

A living, procedural aquarium that runs in the browser: fish, plants, substrate,
light and water effects are all generated and simulated at runtime. No image or
audio assets required.

**Status:** repository scaffolded. The simulation is not implemented yet.

## Running it

The project uses native ES modules, which browsers will not load over `file://`.
Serve the folder with any static server and open it:

```
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Python environment

Any Python dependency lives in a virtual environment, never in the global
interpreter. Create and activate it before installing anything:

```
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux
```

`venv/` and `.venv/` are gitignored. The runtime itself requires no Python
packages; the server above is the only reason Python is involved.

## Planned structure

One file never holds the whole tank. Each module owns a single concern and its
own state, and exposes a small surface (`update`, `draw`, or a factory).

```
aquarium/
├─ index.html              # canvas host, module entry
├─ src/
│  ├─ main.js              # boot: build world, wire systems, start loop
│  ├─ core/
│  │  ├─ loop.js           # fixed-step update + interpolated render
│  │  ├─ canvas.js         # device-pixel-ratio sizing, resize handling
│  │  ├─ vec2.js           # vector math
│  │  └─ rng.js            # seeded PRNG (reproducible tanks)
│  ├─ world/
│  │  ├─ tank.js           # geometry, bounds, glass, dimensions
│  │  ├─ water.js          # gradient, light shafts, caustics
│  │  ├─ substrate.js      # sand, pebbles, grain texture
│  │  ├─ plants.js         # foliage layers and sway
│  │  └─ bubbles.js        # bubble columns and particles
│  ├─ entities/
│  │  ├─ fish.js           # shared steering + body animation
│  │  ├─ species/          # one module per species (shape, palette, gait)
│  │  └─ food.js           # food flakes and sinking
│  ├─ systems/
│  │  ├─ flock.js          # schooling, separation, avoidance
│  │  ├─ depth.js          # depth sorting, atmospheric fading
│  │  └─ input.js          # pointer, click-to-feed, parallax
│  ├─ render/
│  │  ├─ layers.js         # back-to-front compositing
│  │  └─ postfx.js         # haze, vignette, bloom
│  └─ ui/
│     ├─ controls.js       # panel: time of day, mood, feed
│     └─ styles.css
```

## Design rules

- **No bundler.** Native ES modules and a static server; the build step is zero.
- **One concern per module.** Adding a fish species means adding one file in
  `entities/species/`, not editing the engine.
- **Simulation is separated from drawing.** Systems update state; render modules
  read it. Nothing draws inside an update.
- **Seeded randomness.** A tank can be regenerated identically from its seed.
- **Depth drives everything visual.** Position `z` decides scale, blur, tint and
  draw order, so the tank reads as volume rather than a flat plane.
