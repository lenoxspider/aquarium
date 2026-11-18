/**
 * Fixed-step simulation with a variable-rate render.
 *
 * The aquarium advances in exact 1/60s slices so steering and buoyancy behave
 * the same on a 60Hz laptop and a 165Hz monitor. `render` receives the leftover
 * fraction of a step as `alpha` so motion can be interpolated.
 */
export class Loop {
  constructor({ update, render, step = 1 / 60, maxSteps = 5 }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxSteps = maxSteps;
    this.time = 0;
    this.accumulator = 0;
    this.last = 0;
    this.running = false;
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _frame(now) {
    if (!this.running) return;

    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > 0.25) delta = 0.25; // tab was asleep; do not fast-forward

    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSteps) {
      this.time += this.step;
      this.update(this.step, this.time);
      this.accumulator -= this.step;
      steps += 1;
    }
    if (steps === this.maxSteps) this.accumulator = 0; // drop the backlog

    this.render(this.accumulator / this.step, this.time);
    this._raf = requestAnimationFrame(this._frame);
  }
}
