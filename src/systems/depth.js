/**
 * Depth is a single number between 0 (far wall) and 1 (front glass). Scale,
 * opacity and parallax all derive from it, which is what makes the tank read
 * as a volume rather than a flat picture.
 */
export const depthScale = (z) => 0.62 + z * 0.72;

export const depthAlpha = (z) => 0.55 + z * 0.45;

/** Fog amount for something at depth z: more water between the eye and it. */
export const depthFog = (z, ambient) => (1 - z) * 0.34 + (1 - ambient) * 0.26;

/** Parallax is stronger the closer something is to the glass. */
export const depthParallax = (par, z) => ({
  x: par.x * (0.2 + z * 0.95),
  y: par.y * (0.2 + z * 0.95),
});
