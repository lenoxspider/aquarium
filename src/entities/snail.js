import { mix, rgba } from '../core/color.js';

/**
 * A snail on the front glass: the one resident living between the viewer and
 * the water, grazing slowly and leaving a fading slime trail behind it.
 */
export class Snail {
  constructor(tank, rng) {
    this.z = 0.995;
    this.rng = rng;
    this.x = rng.range(tank.width * 0.25, tank.width * 0.75);
    this.y = rng.range(tank.surfaceY + tank.height * 0.25, tank.sandY - 60);
    this.angle = rng.range(0, Math.PI * 2);
    this.wander = 0;
    this.turn = 0;
    this.speed = rng.range(5, 9);
    this.shell = rng.range(13, 18);
    this.phase = rng.range(0, Math.PI * 2);
    this.trail = [];
    this.trailTimer = 0;
    this.draw = (ctx, alpha, env) => this._draw(ctx, alpha, env);
  }

  update(dt, tank, time) {
    this.turn += dt;
    if (this.turn > 4) {
      this.turn = 0;
      this.wander = this.rng.range(-0.9, 0.9);
    }
    this.angle += this.wander * dt * 0.4;

    const minX = 70;
    const maxX = tank.width - 70;
    const minY = tank.surfaceY + 80;
    const maxY = tank.sandY - 40;
    if (this.x < minX || this.x > maxX || this.y < minY || this.y > maxY) {
      this.angle = Math.atan2((minY + maxY) / 2 - this.y, (minX + maxX) / 2 - this.x);
    }

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.trailTimer += dt;
    if (this.trailTimer > 0.22) {
      this.trailTimer = 0;
      this.trail.push({ x: this.x, y: this.y, born: time });
      if (this.trail.length > 110) this.trail.shift();
    }
    while (this.trail.length && time - this.trail[0].born > 26) this.trail.shift();
  }

  _draw(ctx, alpha, env) {
    const p = env.palette;
    const par = env.parallax || { x: 0, y: 0 };
    const px = par.x * 1.15;
    const py = par.y * 1.15;

    if (this.trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.trail.length; i += 1) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        const fade = Math.max(0, 1 - (env.time - b.born) / 26);
        ctx.beginPath();
        ctx.moveTo(a.x + px, a.y + py);
        ctx.lineTo(b.x + px, b.y + py);
        ctx.strokeStyle = rgba(p.light, 0.05 * fade);
        ctx.lineWidth = this.shell * 0.9;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x + px, this.y + py);
    ctx.rotate(this.angle);
    const s = this.shell;

    // Foot, pressed flat against the glass.
    ctx.beginPath();
    ctx.ellipse(s * 0.15, 0, s * 1.15, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mix('#cbb9a2', p.mid, 0.25), 0.5);
    ctx.fill();

    // Tentacles, feeling ahead.
    ctx.strokeStyle = rgba(mix('#cbb9a2', p.mid, 0.2), 0.55);
    ctx.lineWidth = Math.max(1, s * 0.09);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.95, side * s * 0.18);
      ctx.quadraticCurveTo(s * 1.5, side * s * 0.5, s * 1.75, side * s * 0.32);
      ctx.stroke();
    }

    // Shell with a drawn spiral.
    const shellColor = mix('#8a6a48', p.mid, 0.15);
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
    g.addColorStop(0, mix(shellColor, '#ffffff', 0.35));
    g.addColorStop(0.7, shellColor);
    g.addColorStop(1, mix(shellColor, '#000000', 0.4));
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = rgba(mix(shellColor, '#000000', 0.5), 0.45);
    ctx.lineWidth = Math.max(0.8, s * 0.08);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.22) {
      const r = s * 0.12 + (a / (Math.PI * 5)) * s * 0.8;
      const x = Math.cos(a + this.phase) * r;
      const y = Math.sin(a + this.phase) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }
}
