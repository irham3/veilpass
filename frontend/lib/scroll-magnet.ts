/**
 * Returns a nearby section anchor only when the reader has already stopped
 * close to it. This makes the landing page feel deliberate without taking
 * control away from trackpad, keyboard, or touch scrolling.
 */
export function magneticSnapPoint(
  progress: number,
  points: readonly number[],
  maximumDistance = 0.045,
) {
  if (points.length === 0) {
    return progress;
  }

  const nearest = points.reduce((current, point) =>
    Math.abs(point - progress) < Math.abs(current - progress) ? point : current,
  );

  return Math.abs(nearest - progress) <= maximumDistance ? nearest : progress;
}
