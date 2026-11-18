/**
 * Geometry of the glass box. Everything else asks the tank where the water is.
 */
export class Tank {
  constructor(width = 1280, height = 800) {
    this.resize(width, height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    // Water line near the top, sand bed along the bottom.
    this.surfaceY = Math.round(height * 0.055);
    this.sandY = Math.round(height * 0.845);
    this.glass = Math.max(0, Math.round(Math.min(width, height) * 0.006));
  }

  get waterHeight() {
    return this.sandY - this.surfaceY;
  }

  /** Swim bounds, inset from the glass and the sand. */
  bounds(band = 'open') {
    const pad = Math.min(56, this.width * 0.045);
    if (band === 'bottom') {
      return {
        minX: pad,
        maxX: this.width - pad,
        minY: this.sandY - this.height * 0.16,
        maxY: this.sandY - 10,
      };
    }
    if (band === 'top') {
      return {
        minX: pad,
        maxX: this.width - pad,
        minY: this.surfaceY + 34,
        maxY: this.surfaceY + this.waterHeight * 0.35,
      };
    }
    return {
      minX: pad,
      maxX: this.width - pad,
      minY: this.surfaceY + 46,
      maxY: this.sandY - this.height * 0.045,
    };
  }
}
