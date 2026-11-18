import { mix, rgba } from '../core/color.js';
import { depthScale } from '../systems/depth.js';

const PREY_MAX = 26; // only small fish are worth a lunge

/**
 * An intruder, not a resident: a shark silhouette that crosses the tank,
 * picks a victim, lunges, and leaves. Sometimes it connects, and the tank
 * remembers the loss until a replacement swims in.
 */
export class Shark {
  constructor() {
    this.state = 'idle';
    this.z = 0.5;
    this.length = 150;
    this.x = 0;
    this.y = 0;
    this.px = 0;
    this.py = 0;
    this.angle = 0;
    this.speed = 0;
    this.dir = 1;
    this.t = 0;
    this.target = null;
    this.phase = 0;
    this.draw = (ctx, alpha, env) => this._draw(ctx, alpha, env);
  }

  get active() {
    return this.state !== 'idle';
  }

  launch(tank, fromLeft) {
    this.state = 'enter';
    this.dir = fromLeft ? 1 : -1;
    this.x = this.px = fromLeft ? -this.length : tank.width + this.length;
    this.y = this.py = tank.surfaceY + tank.waterHeight * (0.25 + Math.random() * 0.35);
    this.angle = fromLeft ? 0 : Math.PI;
    this.speed = 80;
    this.t = 0;
    this.target = null;
  }

  _pickTarget(world) {
    let best = null;
    let bestD = Infinity;
    for (const f of world.fish) {
      if (!f.alive || f.length > PREY_MAX) continue;
      const d2 = (f.x - this.x) * (f.x - this.x) + (f.y - this.y) * (f.y - this.y);
      if (d2 < bestD) {
        bestD = d2;
        best = f;
      }
    }
    this.target = best;
  }

  update(dt, world, events = {}) {
    if (this.state === 'idle') return;
    const tank = world.tank;
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    this.phase += dt * (3 + this.speed * 0.02);

    if (this.state === 'enter') {
      this.speed += 60 * dt;
      this.x += Math.cos(this.angle) * this.speed * dt;
      if (this.x > 140 && this.x < tank.width - 140) {
        this.state = 'hunt';
        this._pickTarget(world);
      }
    } else if (this.state === 'hunt') {
      if (!this.target || !this.target.alive) this._pickTarget(world);
      if (this.target) {
        const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.angle = this._turn(this.angle, want, 1.6 * dt);
        this.speed = 165;
        const d = Math.hypot(this.target.x - this.x, this.target.y - this.y);
        if (d < 240) {
          this.state = 'lunge';
          this.t = 0;
          if (events.onLunge) events.onLunge(this);
        }
      } else {
        this.state = 'exit';
      }
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt * 0.6;
    } else if (this.state === 'lunge') {
      if (this.target && this.target.alive) {
        const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.angle = this._turn(this.angle, want, 3.4 * dt);
      }
      this.speed = 430;
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;

      if (this.target && this.target.alive) {
        const d = Math.hypot(this.target.x - this.x, this.target.y - this.y);
        if (d < this.length * 0.42) {
          if (events.onCatch) events.onCatch(this.target, this);
          this.target = null;
          this.state = 'exit';
          this.t = 0;
        }
      }
      if (this.state === 'lunge' && this.t > 1.5) {
        this.state = 'exit';
        this.t = 0;
        if (events.onMiss) events.onMiss(this);
      }
    } else if (this.state === 'exit') {
      this.speed += 120 * dt;
      this.angle = this._turn(this.angle, this.dir === 1 ? 0 : Math.PI, 1.2 * dt);
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt * 0.4;
      if (this.x < -this.length * 1.2 || this.x > tank.width + this.length * 1.2) {
        this.state = 'idle';
      }
    }

    const minY = tank.surfaceY + 60;
    const maxY = tank.sandY - 40;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
  }

  _turn(current, target, maxStep) {
    let d = (target - current + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    d -= Math.PI;
    if (Math.abs(d) <= maxStep) return target;
    return current + Math.sign(d) * maxStep;
  }

  _draw(ctx, alpha, env) {
    if (this.state === 'idle') return;
    const p = env.palette;
    const x = this.px + (this.x - this.px) * alpha;
    const y = this.py + (this.y - this.py) * alpha;
    const L = this.length * depthScale(this.z);
    const H = L * 0.3;
    const sway = Math.sin(this.phase) * H * 0.12;
    const body = mix('#1c2b36', p.deep, 0.4);

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    if (Math.cos(this.angle) < 0) ctx.scale(1, -1);

    // Tail crescent.
    ctx.beginPath();
    ctx.moveTo(-L * 0.42, 0);
    ctx.quadraticCurveTo(-L * 0.6, sway - H * 0.9, -L * 0.72, sway - H * 1.15);
    ctx.quadraticCurveTo(-L * 0.6, sway - H * 0.2, -L * 0.58, sway);
    ctx.quadraticCurveTo(-L * 0.6, sway + H * 0.3, -L * 0.68, sway + H * 0.75);
    ctx.quadraticCurveTo(-L * 0.56, sway + H * 0.25, -L * 0.42, 0);
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.9);
    ctx.fill();

    // Dorsal fin.
    ctx.beginPath();
    ctx.moveTo(-L * 0.05, -H * 0.42);
    ctx.quadraticCurveTo(L * 0.02, -H * 1.25, L * 0.2, -H * 0.4);
    ctx.closePath();
    ctx.fill();

    // Body.
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.bezierCurveTo(L * 0.3, -H * 0.55, -L * 0.1, -H * 0.5, -L * 0.44, 0);
    ctx.bezierCurveTo(-L * 0.1, H * 0.5, L * 0.3, H * 0.55, L * 0.5, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5);
    g.addColorStop(0, body);
    g.addColorStop(0.75, body);
    g.addColorStop(1, mix(body, '#cfd8dc', 0.35));
    ctx.fillStyle = g;
    ctx.fill();

    // Pectoral fin.
    ctx.beginPath();
    ctx.moveTo(L * 0.16, H * 0.2);
    ctx.quadraticCurveTo(L * 0.02, H * 0.85, -L * 0.14, H * 0.6);
    ctx.quadraticCurveTo(-L * 0.02, H * 0.3, L * 0.16, H * 0.2);
    ctx.closePath();
    ctx.fillStyle = rgba(body, 0.85);
    ctx.fill();

    // Gill slits.
    ctx.strokeStyle = rgba(mix(body, '#000000', 0.4), 0.5);
    ctx.lineWidth = Math.max(0.8, L * 0.008);
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(L * (0.26 - i * 0.045), 0, H * 0.34, -0.9, 0.9);
      ctx.stroke();
    }

    // Eye.
    ctx.beginPath();
    ctx.arc(L * 0.36, -H * 0.12, Math.max(1, L * 0.018), 0, Math.PI * 2);
    ctx.fillStyle = rgba('#dfe8ec', 0.8);
    ctx.fill();

    ctx.restore();
  }
}
