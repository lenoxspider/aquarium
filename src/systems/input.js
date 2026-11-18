/**
 * Pointer state for the whole tank: a smoothed parallax offset for the camera
 * feel, and clicks that drop food into the water.
 */
export class Input {
  constructor({ surface, canvas, onFeed }) {
    this.surface = surface;
    this.canvas = canvas;
    this.onFeed = onFeed;
    this.parallax = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.pointer = { x: 0, y: 0, active: false };
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onKey = this._onKey.bind(this);
  }

  attach() {
    // Feeding listens on the canvas only, so clicks on the control panel never
    // drop food behind the user's back.
    this.canvas.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('pointerleave', this._onLeave);
    window.addEventListener('keydown', this._onKey);
  }

  _onMove(event) {
    const w = this.surface.width;
    const h = this.surface.height;
    this.target.x = (event.clientX / w - 0.5) * 26;
    this.target.y = (event.clientY / h - 0.5) * 16;
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.active = true;
  }

  _onDown(event) {
    if (event.button !== 0) return;
    this.onFeed(event.clientX, event.clientY);
  }

  _onLeave() {
    this.target.x = 0;
    this.target.y = 0;
    this.pointer.active = false;
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
