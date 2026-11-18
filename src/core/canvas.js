/**
 * Owns the backing store of a full-window canvas: device pixel ratio, resize
 * handling and the logical-pixel transform everything else draws through.
 */
export function createSurface(canvas, { maxDpr = 2 } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const surface = { ctx, width: 0, height: 0, dpr: 1, resize, canvas };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const width = Math.max(320, canvas.clientWidth || window.innerWidth);
    const height = Math.max(320, canvas.clientHeight || window.innerHeight);
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    surface.width = width;
    surface.height = height;
    surface.dpr = dpr;
    return surface;
  }

  resize();
  return surface;
}
