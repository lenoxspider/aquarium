import { mix, rgba } from '../core/color.js';

const BAKE = 2; // texture is baked at 2x so grain stays crisp on retina screens
const LIP = 40; // how far above the sand line the dune can rise

/**
 * The sand bed. Grain, ripples and pebbles are baked once into an offscreen
 * canvas; each frame only composites that texture and tints it with the
 * current light, which keeps a textured floor essentially free.
 */
export class Substrate {
  constructor() {
    this.canvas = null;
    this.image = null;
    this.path = null;
    this.originY = 0;
  }

  rebuild(tank, rng) {
    const w = tank.width;
    const h = tank.height;
    const originY = tank.sandY - LIP;
    const sandH = h - originY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * BAKE);
    canvas.height = Math.round(sandH * BAKE);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(BAKE, 0, 0, BAKE, 0, 0);

    // Dune silhouette: two low-frequency waves, shared with the runtime clip.
    const edge = (x) =>
      LIP + Math.sin(x * 0.0042 + 1.3) * 9 + Math.sin(x * 0.0113 + 0.4) * 4.5;

    const path = new Path2D();
    path.moveTo(0, sandH);
    path.lineTo(0, edge(0));
    for (let x = 0; x <= w; x += 12) path.lineTo(x, edge(x));
    path.lineTo(w, sandH);
    path.closePath();

    // Same silhouette in screen space, for clipping the runtime tint.
    const clipPath = new Path2D();
    clipPath.moveTo(0, h);
    clipPath.lineTo(0, originY + edge(0));
    for (let x = 0; x <= w; x += 12) clipPath.lineTo(x, originY + edge(x));
    clipPath.lineTo(w, h);
    clipPath.closePath();

    ctx.save();
    ctx.clip(path);

    const base = ctx.createLinearGradient(0, LIP, 0, sandH);
    base.addColorStop(0, '#c9b287');
    base.addColorStop(0.28, '#b09a76');
    base.addColorStop(0.72, '#8a7a60');
    base.addColorStop(1, '#5a5140');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, sandH);

    // Broad mottling: wet patches and shaded hollows.
    for (let i = 0; i < 46; i += 1) {
      const x = rng.range(-40, w + 40);
      const y = rng.range(LIP - 10, sandH);
      const rx = rng.range(60, 260);
      const ry = rng.range(14, 52);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rng.range(-0.2, 0.2), 0, Math.PI * 2);
      ctx.fillStyle = rng.chance(0.5)
        ? rgba('#4b4535', rng.range(0.05, 0.16))
        : rgba('#e0d3b4', rng.range(0.04, 0.12));
      ctx.fill();
    }

    // Sand ripples left by the current.
    for (let i = 0; i < 7; i += 1) {
      const yBase = LIP + 18 + i * ((sandH - LIP) / 7.4);
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 18) {
        const y = yBase + Math.sin(x * 0.005 + i * 2.2) * 6 + Math.sin(x * 0.013 - i) * 2.5;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba('#f3e7c9', 0.05);
      ctx.lineWidth = 3.2;
      ctx.stroke();
    }

    // Grain.
    const grains = Math.round((w * sandH) / 260);
    for (let i = 0; i < grains; i += 1) {
      const x = rng.range(0, w);
      const y = rng.range(LIP - 6, sandH);
      const size = rng.range(0.6, 1.9);
      ctx.fillStyle = rng.chance(0.5)
        ? rgba('#fff3d6', rng.range(0.08, 0.34))
        : rgba('#3b3325', rng.range(0.06, 0.26));
      ctx.fillRect(x, y, size, size * rng.range(0.7, 1.3));
    }

    // Pebbles, with a lit top-left face and a contact shadow.
    for (let i = 0; i < 34; i += 1) {
      const x = rng.range(6, w - 6);
      const y = rng.range(LIP + 6, sandH - 4);
      const rx = rng.range(4, 15);
      const ry = rx * rng.range(0.55, 0.85);
      const tone = rng.pick(['#8c8272', '#6f6757', '#a29886', '#5c5445']);

      ctx.beginPath();
      ctx.ellipse(x, y + ry * 0.35, rx * 1.05, ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#1d1a13', 0.22);
      ctx.fill();

      const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 0.5, x, y, rx * 1.2);
      g.addColorStop(0, mix(tone, '#ffffff', 0.35));
      g.addColorStop(0.65, tone);
      g.addColorStop(1, mix(tone, '#000000', 0.35));
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rng.range(-0.4, 0.4), 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // Depth at the very bottom of the tank.
    const foot = ctx.createLinearGradient(0, sandH - 60, 0, sandH);
    foot.addColorStop(0, rgba('#000000', 0));
    foot.addColorStop(1, rgba('#000000', 0.45));
    ctx.fillStyle = foot;
    ctx.fillRect(0, sandH - 60, w, 60);

    ctx.restore();

    this.canvas = canvas;
    this.image = canvas;
    this.path = path;
    this.clipPath = clipPath;
    this.originY = originY;
    this.height = sandH;
    this.width = w;
  }

  draw(ctx, tank, p) {
    if (!this.image) return;
    const { width: w, height: h, sandY } = tank;

    ctx.drawImage(this.image, 0, this.originY, w, this.height);

    // Water colour sitting on top of the sand, so the floor darkens with the room.
    ctx.save();
    ctx.clip(this.clipPath);
    ctx.fillStyle = rgba(p.deep, 0.34 + (1 - p.ambient) * 0.22);
    ctx.fillRect(0, sandY - LIP, w, h);
    ctx.restore();

    // A soft bright lip where the sand meets the water.
    const lip = ctx.createLinearGradient(0, sandY - 26, 0, sandY + 22);
    lip.addColorStop(0, rgba(p.light, 0));
    lip.addColorStop(0.55, rgba(p.light, 0.07));
    lip.addColorStop(1, rgba(p.light, 0));
    ctx.fillStyle = lip;
    ctx.fillRect(0, sandY - 26, w, 48);
  }
}
