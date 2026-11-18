/**
 * Pointer state for the whole tank: a smoothed parallax offset for the camera
 * feel, and clicks that drop food into the water.
 */
export class Input {
  constructor({ surface, onFeed }) {
    this.surface = surface;
    this.onFeed = onFeed;
    this.parallax = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  attach(target = window) {
    this.targetEl = target;
    target.addEventListener('pointermove', this._onMove, { passive: true });
    target.addEventListener('pointerdown', this._onDown);
    target.addEventListener('pointerleave', this._onLeave);
    window.addEventListener('keydown', this._onKey);
  }

  _onMove(event) {
    const w = this.surface.width;
    const h = this.surface.height;
    this.target.x = (event.clientX / w - 0.5) * 26;
    this.target.y = (event.clientY / h - 0.5) * 16;
  }

  _onDown(event) {
    if (event.button !== 0) return;
    this.onFeed(event.clientX, event.clientY);
  }

  _onLeave() {
    this.target.x = 0;
    this.target.y = 0;
  }

  _onKey(event) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.onFeed(this.surface.width * (0.3 + Math.random() * 0.4), this.surface.height * 0.2);
    }
  }

  update(dt) {
    const k = Math.min(1, dt * 3.2);
    this.parallax.x += (this.target.x - this.parallax.x) * k;
    this.parallax.y += (this.target.y - this.parallax.y) * k;
  }
}
