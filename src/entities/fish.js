import { mix, rgba, shade } from '../core/color.js';
import { depthAlpha, depthFog, depthParallax, depthScale } from '../systems/depth.js';
import { desiredHeading, rotateTowards } from '../systems/flock.js';

const TAU = Math.PI * 2;

function bodyPath(ctx, L, H) {
  ctx.beginPath();
  ctx.moveTo(L * 0.5, -H * 0.06);
  ctx.bezierCurveTo(L * 0.34, -H * 0.52, -L * 0.06, -H * 0.5, -L * 0.43, 0);
  ctx.bezierCurveTo(-L * 0.06, H * 0.5, L * 0.34, H * 0.52, L * 0.5, -H * 0.06);
  ctx.closePath();
}

const TAIL_REACH = { fork: 0.8, fan: 0.72, veil: 1.0, flat: 0.62 };
const TAIL_SPREAD = { fork: 0.7, fan: 0.86, veil: 0.95, flat: 0.5 };

/** Gradients live in the fish's local space, so they only change with colour. */
function cachedGradient(owner, ctx, key, make) {
  if (owner._gradKey === key && owner._grad) return owner._grad;
  owner._grad = make();
  owner._gradKey = key;
  return owner._grad;
}

export function drawTail(ctx, spec, L, H, sway, fill) {
  const type = spec.tail || 'fork';
  const reach = L * (TAIL_REACH[type] ?? 0.78);
  const spread = H * (TAIL_SPREAD[type] ?? 0.75);
  const root = -L * 0.4;
  const swayTip = sway;

  ctx.fillStyle = rgba(fill, 0.72);

  ctx.beginPath();
  ctx.moveTo(root, 0);

  if (type === 'fork') {
    ctx.quadraticCurveTo(-L * 0.6, swayTip - spread * 0.7, -reach, swayTip - spread);
    ctx.quadraticCurveTo(-L * 0.72, swayTip - spread * 0.18, -L * 0.62, swayTip * 0.4);
    ctx.quadraticCurveTo(-L * 0.72, swayTip + spread * 0.18, -reach, swayTip + spread);
    ctx.quadraticCurveTo(-L * 0.6, swayTip + spread * 0.7, root, 0);
  } else if (type === 'flat') {
    ctx.quadraticCurveTo(-L * 0.55, swayTip - spread * 0.9, -reach, swayTip - spread);
    ctx.lineTo(-reach, swayTip + spread);
    ctx.quadraticCurveTo(-L * 0.55, swayTip + spread * 0.9, root, 0);
  } else {
    ctx.quadraticCurveTo(-L * 0.6, swayTip - spread * 0.85, -reach, swayTip - spread);
    ctx.quadraticCurveTo(-reach * 1.08, swayTip, -reach, swayTip + spread);
    ctx.quadraticCurveTo(-L * 0.6, swayTip + spread * 0.85, root, 0);
  }

  ctx.closePath();
  ctx.fill();

  // Fin rays.
  ctx.strokeStyle = rgba(fill, 0.25);
  ctx.lineWidth = Math.max(0.4, L * 0.012);
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(root * 0.9, 0);
    ctx.quadraticCurveTo(-L * 0.6, swayTip * 0.5 + (spread * 0.45 * i), -reach * 0.95, swayTip + spread * 0.9 * i * 0.5);
    ctx.stroke();
  }
}

export function drawDorsal(ctx, spec, L, H, sway, fill) {
  const h = H * spec.dorsal * (spec.tall ? 0.8 : 0.6);
  ctx.beginPath();
  ctx.moveTo(-L * 0.2, -H * 0.36);
  ctx.quadraticCurveTo(-L * 0.06 + sway * 0.2, -H * 0.44 - h, L * 0.22, -H * 0.34 - h * 0.4);
  ctx.quadraticCurveTo(L * 0.06, -H * 0.26, -L * 0.2, -H * 0.36);
  ctx.closePath();
  ctx.fillStyle = rgba(fill, 0.55);
  ctx.fill();
}

export function drawVentral(ctx, spec, L, H, sway, fill) {
  const h = H * spec.dorsal * (spec.tall ? 0.8 : 0.35);
  ctx.beginPath();
  ctx.moveTo(L * 0.06, H * 0.34);
  ctx.quadraticCurveTo(-L * 0.02 + sway * 0.2, H * 0.44 + h, -L * 0.24, H * 0.34 + h * 0.55);
  ctx.quadraticCurveTo(-L * 0.1, H * 0.28, L * 0.06, H * 0.34);
  ctx.closePath();
  ctx.fillStyle = rgba(fill, 0.5);
  ctx.fill();

  if (spec.tall) {
    // The long trailing pelvic filaments angelfish are known for.
    ctx.beginPath();
    ctx.moveTo(L * 0.04, H * 0.4);
    ctx.quadraticCurveTo(L * 0.08, H * 0.9 + sway, L * 0.0, H * 1.25);
    ctx.strokeStyle = rgba(fill, 0.4);
    ctx.lineWidth = Math.max(0.8, L * 0.022);
    ctx.stroke();
  }
}

function drawPectoral(ctx, L, H, phase, fill) {
  const angle = Math.sin(phase) * 0.35;
  ctx.save();
  ctx.translate(L * 0.16, H * 0.14);
  ctx.rotate(0.5 + angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.13, H * 0.07, 0, 0, TAU);
  ctx.fillStyle = rgba(fill, 0.5);
  ctx.fill();
  ctx.restore();
}

function drawPattern(ctx, spec, L, H, colors) {
  ctx.save();
  bodyPath(ctx, L, H);
  ctx.clip();

  switch (spec.pattern) {
    case 'neon': {
      ctx.fillStyle = rgba(shade(colors.fin, 0.2), 0.42);
      ctx.fillRect(-L * 0.42, -H * 0.26, L * 0.84, H * 0.46);
      ctx.fillStyle = rgba(shade(colors.fin, 0.4), 1);
      ctx.fillRect(-L * 0.38, -H * 0.13, L * 0.8, H * 0.2);
      ctx.beginPath();
      ctx.ellipse(-L * 0.2, H * 0.16, L * 0.17, H * 0.16, 0, 0, TAU);
      ctx.fillStyle = rgba(colors.accent, 0.85);
      ctx.fill();
      break;
    }
    case 'bars': {
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = rgba(colors.accent, 0.2);
        ctx.fillRect(-L * 0.3 + i * L * 0.17, -H * 0.6, L * 0.075, H * 1.2);
      }
      break;
    }
    case 'disc': {
      const g = ctx.createRadialGradient(0, -H * 0.12, H * 0.08, 0, 0, L * 0.5);
      g.addColorStop(0, rgba(colors.accent, 0.05));
      g.addColorStop(0.5, rgba(colors.accent, 0.42));
      g.addColorStop(1, rgba(colors.accent, 0.02));
      ctx.fillStyle = g;
      ctx.fillRect(-L, -H, L * 2, H * 2);
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = rgba(colors.accent, 0.22);
        ctx.fillRect(-L * 0.34 + i * L * 0.16, -H * 0.6, L * 0.05, H * 1.2);
      }
      break;
    }
    case 'spots': {
      ctx.fillStyle = rgba(colors.accent, 0.4);
      for (let y = -0.45; y <= 0.45; y += 0.22) {
        for (let x = -0.34; x <= 0.44; x += 0.15) {
          ctx.beginPath();
          ctx.arc(L * x + (Math.abs(y) % 0.22) * L * 0.06, H * y, H * 0.045, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    default: {
      const g = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5);
      g.addColorStop(0, rgba(colors.accent, 0));
      g.addColorStop(0.36, rgba(colors.accent, 0.34));
      g.addColorStop(0.52, rgba(colors.accent, 0.06));
      g.addColorStop(1, rgba(colors.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-L * 0.5, -H * 0.6, L, H * 1.2);
    }
  }

  // Belly light.
  const belly = ctx.createRadialGradient(L * 0.04, H * 0.34, 0, L * 0.04, H * 0.3, H * 1.1);
  belly.addColorStop(0, rgba(colors.belly, 0.35));
  belly.addColorStop(1, rgba(colors.belly, 0));
  ctx.fillStyle = belly;
  ctx.fillRect(-L, -H, L * 2, H * 2);

  ctx.restore();
}

function drawEye(ctx, L, H) {
  const ex = L * 0.33;
  const ey = -H * 0.13;
  const r = Math.max(0.9, Math.min(L * 0.05, H * 0.16));

  ctx.beginPath();
  ctx.arc(ex, ey, r * 1.45, 0, TAU);
  ctx.fillStyle = rgba('#f2f7fa', 0.75);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, TAU);
  ctx.fillStyle = rgba('#0a1418', 0.92);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ex - r * 0.32, ey - r * 0.34, r * 0.36, 0, TAU);
  ctx.fillStyle = rgba('#ffffff', 0.85);
  ctx.fill();
}

/**
 * One fish. It owns its state and behaviour; how it is drawn is entirely
 * described by the species record it was built with.
 */
export class Fish {
  constructor(spec, tank, rng) {
    this.spec = spec;
    this.rng = rng;
    this.z = rng.range(0.12, 0.96);
    this.length = spec.length;
    this.scaleJitter = rng.range(0.9, 1.12);
    this.tint = rng.next();

    const b = tank.bounds(spec.band);
    this.x = this.px = rng.range(b.minX, b.maxX);
    this.y = this.py = rng.range(b.minY, b.maxY);
    this.angle = rng.chance(0.5) ? rng.range(-0.6, 0.6) : rng.range(Math.PI - 0.6, Math.PI + 0.6);

    this.cruise = spec.speed * rng.range(0.82, 1.18);
    this.speed = this.cruise;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.phase = rng.range(0, TAU);
    this.retarget = rng.range(0, 3);
    this.target = { x: this.x, y: this.y };
    this.burst = 0;
    this.alive = true;
  }

  _retarget(tank) {
    const b = tank.bounds(this.spec.band);
    this.target.x = this.rng.range(b.minX, b.maxX);
    this.target.y = this.rng.range(b.minY, b.maxY);
    this.retarget = this.rng.range(1.5, 5.5);
  }

  update(dt, world) {
    if (!this.alive) return;
    const tank = world.tank;
    this.px = this.x;
    this.py = this.y;

    this.retarget -= dt;
    if (this.retarget <= 0) this._retarget(tank);

    const steer = desiredHeading(this, world);
    let heading = Math.atan2(steer.dy, steer.dx);
    // Tall-bodied fish keep their bodies near level instead of pointing at
    // whatever they are chasing.
    if (this.spec.tall) heading = Math.atan2(Math.sin(heading) * 0.28, Math.cos(heading));
    const turnRate = this.spec.turn * (steer.speedScale > 1.2 ? 1.25 : 1);
    this.angle = rotateTowards(this.angle, heading, turnRate * dt);

    if (this.burst > 0) {
      this.burst -= dt;
    } else if (this.rng.chance(dt * 0.045)) {
      this.burst = this.rng.range(0.3, 0.9);
    }

    const targetSpeed = this.cruise * steer.speedScale * (this.burst > 0 ? 2.2 : 1);
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.4);

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const b = tank.bounds(this.spec.band);
    if (this.x < b.minX - 30 || this.x > b.maxX + 30 || this.y < b.minY - 40 || this.y > b.maxY + 40) {
      this.x = Math.min(b.maxX, Math.max(b.minX, this.x));
      this.y = Math.min(b.maxY, Math.max(b.minY, this.y));
      this._retarget(tank);
    }

    this.phase += dt * (5 + this.speed * 0.09) * 2;
    if (this.phase > TAU * 1000) this.phase -= TAU * 1000;

    // Eat with the mouth, not the centre of mass: the nose leads the body by
    // half a body length, which is exactly where a flake disappears.
    const scale = depthScale(this.z);
    const reach = this.length * scale;
    const mouthX = this.x + Math.cos(this.angle) * reach * 0.45;
    const mouthY = this.y + Math.sin(this.angle) * reach * 0.45;
    if (world.food.tryEat(mouthX, mouthY, reach * 0.4 + 5)) {
      this.burst = 0.25;
    }
  }

  draw(ctx, alpha, env) {
    const p = env.palette;
    const spec = this.spec;
    const z = this.z;
    const x = this.px + (this.x - this.px) * alpha;
    const y = this.py + (this.y - this.py) * alpha;
    const par = depthParallax(env.parallax || { x: 0, y: 0 }, z);

    const L = spec.length * this.scaleJitter * depthScale(z);
    const H = L * spec.girth;
    const fog = depthFog(z, p.ambient);
    const c = spec.colors;

    const colors = {
      body: mix(shade(c.body, (this.tint - 0.5) * 0.12), p.mid, fog),
      belly: mix(c.belly, p.mid, fog * 0.9),
      fin: mix(c.fin, p.mid, fog),
      accent: mix(c.accent, p.mid, fog * 0.7),
    };

    const sway = Math.sin(this.phase) * H * 0.16;

    ctx.save();
    ctx.globalAlpha = depthAlpha(z) * (0.72 + p.ambient * 0.28);
    ctx.translate(x + par.x, y + par.y);
    ctx.rotate(this.angle);
    if (Math.cos(this.angle) < 0) ctx.scale(1, -1);

    drawTail(ctx, spec, L, H, sway, colors.fin);
    drawDorsal(ctx, spec, L, H, sway, colors.fin);
    drawVentral(ctx, spec, L, H, sway, colors.fin);

    const bodyGrad = cachedGradient(this, ctx, `${colors.body}|${colors.belly}`, () => {
      const g = ctx.createLinearGradient(0, -H * 0.55, 0, H * 0.55);
      g.addColorStop(0, colors.body);
      g.addColorStop(0.55, colors.body);
      g.addColorStop(1, colors.belly);
      return g;
    });

    bodyPath(ctx, L, H);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    drawPattern(ctx, spec, L, H, colors);

    bodyPath(ctx, L, H);
    ctx.strokeStyle = rgba(shade(colors.body, -0.45), 0.22);
    ctx.lineWidth = Math.max(0.4, L * 0.012);
    ctx.stroke();

    drawPectoral(ctx, L, H, this.phase * 1.4, colors.fin);
    drawEye(ctx, L, H);

    // Mouth.
    ctx.beginPath();
    ctx.moveTo(L * 0.48, H * 0.02);
    ctx.lineTo(L * 0.42, H * 0.07);
    ctx.strokeStyle = rgba(shade(colors.accent, -0.2), 0.4);
    ctx.lineWidth = Math.max(0.4, L * 0.014);
    ctx.stroke();

    ctx.restore();
  }
}
