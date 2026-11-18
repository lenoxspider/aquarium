import { rgba } from '../core/color.js';

/**
 * Everything that happens between the water and your eye: the glass, the
 * vignette and the corner sheen.
 */
export class PostFx {
  constructor() {
    this._staticKey = '';
    this._static = null;
  }

  _makeGradients(ctx, tank, p) {
    const { width: w, height: h } = tank;
    const radius = Math.hypot(w, h) * 0.62;

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.46, radius * 0.42, w * 0.5, h * 0.48, radius);
    vignette.addColorStop(0, rgba('#000000', 0));
    vignette.addColorStop(0.62, rgba('#000610', 0.16));
    vignette.addColorStop(1, rgba('#00030a', 0.5));

    const top = ctx.createLinearGradient(0, 0, 0, h * 0.16);
    top.addColorStop(0, rgba('#000000', 0.32));
    top.addColorStop(1, rgba('#000000', 0));

    const bottom = ctx.createLinearGradient(0, h, 0, h * 0.78);
    bottom.addColorStop(0, rgba('#000000', 0.5));
    bottom.addColorStop(1, rgba('#000000', 0));

    const leftEdge = ctx.createLinearGradient(0, 0, w * 0.035, 0);
    leftEdge.addColorStop(0, rgba(p.light, 0.13));
    leftEdge.addColorStop(0.4, rgba(p.light, 0.03));
    leftEdge.addColorStop(1, rgba(p.light, 0));

    const rightEdge = ctx.createLinearGradient(w, 0, w * 0.965, 0);
    rightEdge.addColorStop(0, rgba(p.light, 0.13));
    rightEdge.addColorStop(0.4, rgba(p.light, 0.03));
    rightEdge.addColorStop(1, rgba(p.light, 0));

    return { vignette, top, bottom, leftEdge, rightEdge };
  }

  draw(ctx, tank, p, time = 0) {
    const { width: w, height: h } = tank;
    ctx.drawImage(this._staticImage(ctx, tank, p), 0, 0, w, h);

    // A slow diagonal reflection drifting across the front pane.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const shift = Math.sin(time * 0.07) * w * 0.02;
    ctx.beginPath();
    ctx.moveTo(w * 0.14 + shift, 0);
    ctx.lineTo(w * 0.3 + shift, 0);
    ctx.lineTo(w * 0.02 + shift, h);
    ctx.lineTo(-w * 0.12 + shift, h);
    ctx.closePath();
    ctx.fillStyle = rgba(p.light, 0.022);
    ctx.fill();
    ctx.restore();
  }

  /** Vignette, framing shadows and glass edges are static: bake them once. */
  _staticImage(ctx, tank, p) {
    const key = `${tank.width}x${tank.height}|${p.key}`;
    if (this._staticKey === key) return this._static;

    const { width: w, height: h } = tank;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g2 = canvas.getContext('2d');
    const g = this._makeGradients(g2, tank, p);

    g2.fillStyle = g.vignette;
    g2.fillRect(0, 0, w, h);
    g2.fillStyle = g.top;
    g2.fillRect(0, 0, w, h * 0.16);
    g2.fillStyle = g.bottom;
    g2.fillRect(0, h * 0.78, w, h * 0.22);
    g2.fillStyle = g.leftEdge;
    g2.fillRect(0, 0, w * 0.035, h);
    g2.fillStyle = g.rightEdge;
    g2.fillRect(w * 0.965, 0, w * 0.035, h);
    g2.strokeStyle = rgba(p.light, 0.1);
    g2.lineWidth = 1;
    g2.strokeRect(0.5, 0.5, w - 1, h - 1);

    this._static = canvas;
    this._staticKey = key;
    return canvas;
  }
}
