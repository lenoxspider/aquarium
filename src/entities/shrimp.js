import { mix, rgba } from '../core/color.js';
import { depthAlpha, depthFog, depthParallax, depthScale } from '../systems/depth.js';

/**
 * Cherry shrimp. They hover almost motionless among the stems, then dart a
 * short distance and hover again, translucent enough to see plants through.
 */
export class Shrimp {
  constructor(tank, rng) {
    this.rng = rng;
    this.z = rng.range(0.35, 0.8);
    const b = tank.bounds('bottom');
    this.x = this.px = rng.range(b.minX, b.maxX);
    this.y = this.py = rng.range(b.minY + 20, b.maxY);
    this.angle = rng.chance(0.5) ? rng.range(-0.4, 0.4) : Math.PI + rng.range(-0.4, 0.4);
    this.length = rng.range(10, 14);
    this.state = 'hover';
    this.timer = rng.range(1, 5);
    this.phase = rng.range(0, Math.PI * 2);
    this.draw = (ctx, alpha, env) => this._draw(ctx, alpha, env);
  }

  update(dt, tank, time) {
    this.px = this.x;
    this.py = this.y;

    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state === 'hover') {
        this.state = 'dart';
        this.timer = this.rng.range(0.25, 0.45);
        this.angle = this.rng.range(0, Math.PI * 2);
      } else {
        this.state = 'hover';
        this.timer = this.rng.range(2, 7);
        this.angle = this.rng.chance(0.5) ? this.rng.range(-0.4, 0.4) : Math.PI + this.rng.range(-0.4, 0.4);
      }
    }

    const speed = this.state === 'dart' ? 130 : 6;
    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt * 0.5 + Math.sin(time * 3 + this.phase) * 3 * dt;

    const b = tank.bounds('bottom');
    this.x = Math.min(b.maxX, Math.max(b.minX, this.x));
    this.y = Math.min(b.maxY, Math.max(b.minY, this.y));
  }

  _draw(ctx, alpha, env) {
    const p = env.palette;
    const z = this.z;
    const x = this.px + (this.x - this.px) * alpha;
    const y = this.py + (this.y - this.py) * alpha;
    const par = depthParallax(env.parallax || { x: 0, y: 0 }, z);
    const L = this.length * depthScale(z);
    const body = mix('#e8897a', p.mid, depthFog(z, p.ambient));

    ctx.save();
    ctx.globalAlpha = depthAlpha(z) * 0.8;
    ctx.translate(x + par.x, y + par.y);
    ctx.rotate(this.angle + Math.sin(this.phase + env.time * 2) * 0.05);
    if (Math.cos(this.angle) < 0) ctx.scale(1, -1);

    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.1, -L * 0.34, -L * 0.35, -L * 0.12);
    ctx.quadraticCurveTo(-L * 0.1, L * 0.16, L * 0.5, L * 0.1);
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.6);
    ctx.fill();
    ctx.strokeStyle = rgba(mix(body, '#ffffff', 0.3), 0.5);
    ctx.lineWidth = Math.max(0.5, L * 0.04);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-L * 0.32, -L * 0.1);
    ctx.lineTo(-L * 0.62, -L * 0.28);
    ctx.lineTo(-L * 0.58, L * 0.06);
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.45);
    ctx.fill();

    ctx.strokeStyle = rgba(body, 0.55);
    ctx.lineWidth = Math.max(0.4, L * 0.03);
    ctx.beginPath();
    ctx.moveTo(L * 0.48, -L * 0.02);
    ctx.quadraticCurveTo(L * 0.9, -L * 0.3, L * 1.15, -L * 0.18);
    ctx.moveTo(L * 0.48, L * 0.02);
    ctx.quadraticCurveTo(L * 0.95, L * 0.05, L * 1.1, L * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(L * 0.4, -L * 0.06, Math.max(0.6, L * 0.05), 0, Math.PI * 2);
    ctx.fillStyle = rgba('#101418', 0.9);
    ctx.fill();

    ctx.restore();
  }
}
