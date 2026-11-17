export type RingGeometry = {
  ratio: number;
  circumference: number;
  dashOffset: number;
};

/** Geometry of a progress ring: ratio is clamped to 0..1. */
export function ringGeometry(
  value: number,
  max: number,
  radius: number,
): RingGeometry {
  const circumference = 2 * Math.PI * radius;
  const raw = max > 0 && Number.isFinite(value) ? value / max : 0;
  const ratio = Math.min(1, Math.max(0, raw));
  return { ratio, circumference, dashOffset: circumference * (1 - ratio) };
}
