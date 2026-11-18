import { mix, rgba } from '../core/color.js';

/**
 * Time-of-day keyframes per biome. Each stop describes the same tank under
 * different light, so the palette can be interpolated without special cases.
 */
const BIOMES = {
  clear: [
  {
    at: 0.0,
    top: '#7fd6d6',
    mid: '#2b93a8',
    deep: '#0b3d52',
    bottom: '#04202f',
    light: '#ffe6bd',
    tint: '#2a7f92',
    ambient: 0.72,
  },
  {
    at: 0.35,
    top: '#3fc4d4',
    mid: '#0f7d95',
    deep: '#053246',
    bottom: '#021826',
    light: '#e6fdff',
    tint: '#1a7f95',
    ambient: 0.96,
  },
  {
    at: 0.7,
    top: '#8292c6',
    mid: '#2c5478',
    deep: '#0d2138',
    bottom: '#040c18',
    light: '#ffbf8f',
    tint: '#28506b',
    ambient: 0.58,
  },
  {
    at: 1.0,
    top: '#16314f',
    mid: '#0a1e33',
    deep: '#030c16',
    bottom: '#01060c',
    light: '#9fc4ff',
    tint: '#123049',
    ambient: 0.32,
  },
  ],
  blackwater: [
    {
      at: 0.0,
      top: '#d8a86a',
      mid: '#8a5a2e',
      deep: '#3a2412',
      bottom: '#1a0f08',
      light: '#ffe0a8',
      tint: '#7a4e26',
      ambient: 0.7,
    },
    {
      at: 0.35,
      top: '#c99552',
      mid: '#7a4c26',
      deep: '#33200f',
      bottom: '#150c06',
      light: '#ffd98f',
      tint: '#6d4420',
      ambient: 0.9,
    },
    {
      at: 0.7,
      top: '#8a6a4a',
      mid: '#4a3018',
      deep: '#1e1208',
      bottom: '#0c0704',
      light: '#ffbf7a',
      tint: '#3f2a14',
      ambient: 0.55,
    },
    {
      at: 1.0,
      top: '#2a1c10',
      mid: '#150d06',
      deep: '#080402',
      bottom: '#030201',
      light: '#c9a06a',
      tint: '#120b05',
      ambient: 0.3,
    },
  ],
  deep: [
    {
      at: 0.0,
      top: '#6fc4d8',
      mid: '#1e6a8a',
      deep: '#0a2a4a',
      bottom: '#041426',
      light: '#d8f0ff',
      tint: '#1e5a7a',
      ambient: 0.7,
    },
    {
      at: 0.35,
      top: '#4aa8c8',
      mid: '#145a7a',
      deep: '#062038',
      bottom: '#020e1c',
      light: '#cfeeff',
      tint: '#14506e',
      ambient: 0.9,
    },
    {
      at: 0.7,
      top: '#3a5a8a',
      mid: '#1a3050',
      deep: '#081428',
      bottom: '#030a14',
      light: '#9fc4ff',
      tint: '#16304e',
      ambient: 0.55,
    },
    {
      at: 1.0,
      top: '#0e1e3a',
      mid: '#061226',
      deep: '#020810',
      bottom: '#01040a',
      light: '#7fa8ff',
      tint: '#0a1c30',
      ambient: 0.3,
    },
  ],
};

export const BIOME_IDS = Object.keys(BIOMES);

export function resolvePalette(t, biome = 'clear') {
  const STOPS = BIOMES[biome] || BIOMES.clear;
  const v = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < STOPS.length - 2 && v > STOPS[i + 1].at) i += 1;

  const a = STOPS[i];
  const b = STOPS[i + 1];
  const k = (v - a.at) / Math.max(1e-6, b.at - a.at);

  const palette = {
    top: mix(a.top, b.top, k),
    mid: mix(a.mid, b.mid, k),
    deep: mix(a.deep, b.deep, k),
    bottom: mix(a.bottom, b.bottom, k),
    light: mix(a.light, b.light, k),
    tint: mix(a.tint, b.tint, k),
    ambient: a.ambient + (b.ambient - a.ambient) * k,
  };
  palette.key = `${palette.top}|${palette.mid}|${palette.deep}|${palette.bottom}|${palette.light}|${palette.ambient.toFixed(3)}`;
  palette.biome = biome;
  palette.glow = palette.ambient < 0.55;
  return palette;
}

const TAU = Math.PI * 2;

/**
 * Everything that is water rather than fish: the depth gradient, the caustic
 * net on the sand, the shafts of light and the surface band.
 *
 * Gradients are rebuilt only when the tank size or the palette changes.
 */
export class Water {
  constructor() {
    this._key = '';
    this._grads = null;
    this.ripples = [];
  }

  /** A ring spreading from a touch, a splash or a popping bubble. */
  addRipple(x, y, { strength = 1, surface = false, born = 0 } = {}) {
    this.ripples.push({ x, y, strength, surface, born, life: surface ? 1.6 : 1.1 });
    if (this.ripples.length > 28) this.ripples.shift();
  }

  drawRipples(ctx, tank, time, p) {
    if (!this.ripples.length) return;
    this.ripples = this.ripples.filter((r) => time - r.born < r.life);
    if (!this.ripples.length) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.ripples) {
      const age = time - r.born;
      const fade = 1 - age / r.life;
      for (let ring = 0; ring < 2; ring += 1) {
        const a = age - ring * 0.16;
        if (a < 0) continue;
        const radius = 4 + a * 130;
        const alpha = r.strength * fade * (ring === 0 ? 0.16 : 0.08);
        ctx.beginPath();
        if (r.surface) ctx.ellipse(r.x, r.y, radius, radius * 0.22, 0, 0, Math.PI * 2);
        else ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(p.light, alpha);
        ctx.lineWidth = 1.6 - ring * 0.6;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _makeGradients(ctx, tank, p) {
    const { width: w, height: h, surfaceY, sandY } = tank;

    const backdrop = ctx.createLinearGradient(0, surfaceY, 0, h);
    backdrop.addColorStop(0, p.top);
    backdrop.addColorStop(0.22, p.mid);
    backdrop.addColorStop(0.62, p.deep);
    backdrop.addColorStop(1, p.bottom);

    const pool = ctx.createRadialGradient(w * 0.5, surfaceY, 10, w * 0.5, surfaceY, h * 0.95);
    pool.addColorStop(0, rgba(p.light, 0.12));
    pool.addColorStop(0.45, rgba(p.light, 0.03));
    pool.addColorStop(1, rgba(p.light, 0));

    const surfaceBand = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + h * 0.09);
    surfaceBand.addColorStop(0, rgba(p.light, 0.16));
    surfaceBand.addColorStop(1, rgba(p.light, 0));

    const sandLight = ctx.createLinearGradient(0, sandY - h * 0.1, 0, sandY + h * 0.08);
    sandLight.addColorStop(0, rgba(p.light, 0.0));
    sandLight.addColorStop(0.6, rgba(p.light, 0.1));
    sandLight.addColorStop(1, rgba(p.light, 0.02));

    return { backdrop, pool, surfaceBand, sandLight };
  }

  _gradients(ctx, tank, p) {
    const key = `${tank.width}x${tank.height}|${tank.surfaceY}|${tank.sandY}|${p.key}`;
    if (key === this._key) return this._grads;
    this._key = key;
    this._grads = this._makeGradients(ctx, tank, p);
    return this._grads;
  }

  backdrop(ctx, tank, p) {
    ctx.drawImage(this._backdropImage(ctx, tank, p), 0, 0, tank.width, tank.height);
  }

  /** The depth gradient and the light pool never animate: bake them once. */
  _backdropImage(ctx, tank, p) {
    const key = `${tank.width}x${tank.height}|${tank.surfaceY}|${p.key}`;
    if (this._bdKey === key) return this._bd;

    const { width: w, height: h, surfaceY } = tank;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g2 = canvas.getContext('2d');
    const g = this._makeGradients(g2, tank, p);

    g2.fillStyle = p.bottom;
    g2.fillRect(0, 0, w, h);
    g2.fillStyle = g.backdrop;
    g2.fillRect(0, surfaceY, w, h - surfaceY);
    g2.globalCompositeOperation = 'lighter';
    g2.fillStyle = g.pool;
    g2.fillRect(0, surfaceY, w, h - surfaceY);

    this._bd = canvas;
    this._bdKey = key;
    return canvas;
  }

  /** Slow web of light on the substrate. */
  caustics(ctx, tank, time, p) {
    const { width: w, sandY, height: h } = tank;
    const top = sandY - 4;
    const depth = h - top;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, sandY - 2, w, h - sandY + 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 16) {
        const sway =
          Math.sin(x * 0.014 + time * 0.62 + i * 1.7) * 5 +
          Math.sin(x * 0.033 - time * 0.9 + i * 0.6) * 3.2 +
          Math.sin(x * 0.007 + time * 0.24 + i * 2.1) * 7;
      const y = top + ((i + 0.5) / 6) * depth + sway;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(p.light, 0.07 + (i % 3) * 0.016);
      ctx.lineWidth = 1.6 + (i % 4) * 0.7;
      ctx.stroke();
    }

    ctx.restore();
  }

  /** Wide, soft columns of light falling from the surface. */
  shafts(ctx, tank, time, p) {
    const { width: w, surfaceY, height: h } = tank;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const drift = Math.sin(time * 0.16 + i * 1.9) * w * 0.035;
      const x = t * w + drift;
      const topHalf = w * (0.02 + (i % 2) * 0.008);
      const bottomHalf = w * (0.07 + ((i * 7) % 4) * 0.012);
      const tilt = Math.sin(time * 0.1 + i) * w * 0.02;

      // Three nested, feathered passes so the edges never read as hard lines.
      for (let k = 0; k < 3; k += 1) {
        const shrink = 1 - k * 0.3;
        const alpha = 0.016 + k * 0.014;
        const grad = ctx.createLinearGradient(x, surfaceY, x + tilt, h);
        grad.addColorStop(0, rgba(p.light, alpha * 0.95));
        grad.addColorStop(0.5, rgba(p.light, alpha));
        grad.addColorStop(1, rgba(p.light, 0));

        ctx.beginPath();
        ctx.moveTo(x - topHalf * shrink, surfaceY);
        ctx.lineTo(x + topHalf * shrink, surfaceY);
        ctx.lineTo(x + bottomHalf * shrink + tilt, h * 0.94);
        ctx.lineTo(x - bottomHalf * shrink + tilt, h * 0.94);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** The water line: a dark rim above, moving highlights and a soft glow below. */
  surface(ctx, tank, time, p) {
    const { width: w, surfaceY, height: h } = tank;
    const g = this._gradients(ctx, tank, p);

    ctx.save();

    ctx.fillStyle = mix(p.bottom, '#000814', 0.4);
    ctx.fillRect(0, 0, w, surfaceY);

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g.surfaceBand;
    ctx.fillRect(0, surfaceY, w, h * 0.09);

    // Two overlaid ripple sets make the line breathe instead of pulse.
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.beginPath();
      const amp = pass === 0 ? 1.9 : 3.4;
      const speed = pass === 0 ? 1.1 : 0.62;
      for (let x = 0; x <= w; x += 10) {
        const y = surfaceY + Math.sin(x * 0.021 + time * speed) * amp + Math.sin(x * 0.047 - time * 0.8) * amp * 0.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(p.light, pass === 0 ? 0.14 : 0.07);
      ctx.lineWidth = pass === 0 ? 1.4 : 2.6;
      ctx.stroke();
    }

    // Meniscus: the bright edge where water meets glass.
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = surfaceY + Math.sin(x * 0.02 + time * 1.1) * 1.6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(p.light, 0.3);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore();
  }
}

export { TAU };
