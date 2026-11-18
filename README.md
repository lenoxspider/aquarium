# Aquarium

A living, procedural aquarium that runs in the browser: fish, plants, substrate,
light and water effects are all generated and simulated at runtime. No image or
audio assets, no build step.

## Running it

The project uses native ES modules, which browsers will not load over `file://`.
Serve the folder with any static server and open it:

```
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

- **Click the water** (or press space, or the Feed button) to drop flakes; fish
  notice and come for them.
- **Rest the pointer** in the water: curious species (tetras, guppies) swim over
  to inspect the finger on the glass.
- **Move the pointer** to look through the glass: the scene parallaxes by depth.
- **Light slider** moves the tank from dawn through day and dusk to night.
- **Auto day and night** lets the light cycle on its own, four minutes per day.
- **Biome** switches the whole water column: clear water, tannin-stained
  blackwater, or cold deep water. At night the deep biome glows: suspended
  motes turn bioluminescent.
- **Startle** sends a disturbance through the water and everything scatters.
- **Photo** saves the current frame as a PNG.
- **Sound** toggles a fully synthesised ambience: water bed, bubble blips,
  feeding splashes and a startle sweep. It starts when you enter the tank.

## Residents

30 fish across six species, four cherry shrimp that hover and dart among the
stems, and one snail grazing the front glass, leaving a fading slime trail.
Fish cast soft shadows on the sand, and touches, splashes and popping bubbles
send ripples through the water.

## Structure

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
│  │  ├─ color.js          # hex blending and rgba helpers
│  │  └─ rng.js            # seeded PRNG (reproducible tanks)
│  ├─ world/
│  │  ├─ tank.js           # geometry, swim bounds, water line, sand line
│  │  ├─ water.js          # palette keyframes, light shafts, caustics, surface
│  │  ├─ substrate.js      # baked sand: grain, ripples, pebbles
│  │  ├─ plants.js         # planted stems in clusters, sway, depth tint
│  │  ├─ bubbles.js        # bubble streams, recycled at the surface
│  │  └─ particulates.js   # suspended motes in two batched depth passes
│  ├─ entities/
│  │  ├─ fish.js           # steering integration + procedural body drawing
│  │  ├─ species/          # one module per species (shape, palette, gait)
│  │  └─ food.js           # flakes: sinking, drifting, resting, being eaten
│  ├─ systems/
│  │  ├─ flock.js          # wander, schooling, separation, food, startle
│  │  ├─ depth.js          # depth -> scale, opacity, fog, parallax
│  │  └─ input.js          # pointer parallax and click-to-feed
│  ├─ render/
│  │  ├─ layers.js         # back-to-front compositing, single depth sort
│  │  └─ postfx.js         # vignette, glass edges, drifting reflection
│  └─ ui/
│     ├─ controls.js       # glass panel: light, feed, startle
│     └─ styles.css
```

## Design rules

- **No bundler.** Native ES modules and a static server; the build step is zero.
- **One concern per module.** Adding a fish species means adding one file in
  `entities/species/` and one line in `species/index.js`.
- **Simulation is separated from drawing.** Systems update state; render modules
  read it. Nothing draws inside an update.
- **Seeded randomness.** A tank can be regenerated identically from its seed.
- **Depth drives everything visual.** Position `z` decides scale, opacity, tint
  and draw order, so the tank reads as volume rather than a flat plane.
- **Static pixels are baked.** Sand grain, the water gradient and the vignette
  are rendered once into offscreen canvases and blitted, so per-frame cost is
  only what actually moves.

## Notes

- `window.aquarium` exposes `{ world, loop, surface, renderer }` for console
  experiments; the scene does not depend on it.
- Audio is created only after the visitor clicks through the intro card, so the
  browser's autoplay rules are respected and the tank opens with a title beat.
- Rendering targets 60 fps on GPU-composited browsers. Everything is Canvas 2D.
│  ├─ audio/
│  │  └─ sound.js          # synthesised ambience: bed, blips, splashes
│  ├─ core/
│  │  ├─ snail.js          # glass grazer with a fading slime trail
│  │  ├─ shrimp.js         # hovering, darting cherry shrimp
│  │  ├─ fish.js           # steering integration + procedural body drawing
