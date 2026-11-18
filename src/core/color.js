const cache = new Map();

function parse(hex) {
  const key = hex;
  const hit = cache.get(key);
  if (hit) return hit;

  let value = hex.replace('#', '');
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  const rgb = [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
  cache.set(key, rgb);
  return rgb;
}

const channel = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hex2 = (v) => channel(v).toString(16).padStart(2, '0');

/** Linear blend of two hex colours; t = 0 is `a`, t = 1 is `b`. */
export function mix(a, b, t) {
  const A = parse(a);
  const B = parse(b);
  return `#${hex2(A[0] + (B[0] - A[0]) * t)}${hex2(A[1] + (B[1] - A[1]) * t)}${hex2(A[2] + (B[2] - A[2]) * t)}`;
}

/** #rrggbb -> rgba() with the given opacity. */
export function rgba(hex, alpha) {
  const [r, g, b] = parse(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Multiplies brightness; negative values darken. */
export function shade(hex, amount) {
  return amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount);
}

export function randomHexInRange(rng, from, to) {
  return mix(from, to, rng.next());
}
