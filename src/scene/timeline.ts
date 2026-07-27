/**
 * The scroll timeline.
 *
 * Everything in the scene is a pure function of one number: `scene.timeline`,
 * which runs 0 → 4 across the four acts (0 = top of Launch, 4 = end of Arrival).
 * Nothing in the scene integrates over time or remembers where it was, so
 * scrubbing backwards plays the whole thing in reverse exactly — which is the
 * part that actually reads as choreographed rather than merely animated.
 *
 * The one exception is the field's own slow drift, which accumulates so that a
 * held scroll position still breathes rather than freezing.
 */

export const ACTS = ['launch', 'ascent', 'stack', 'arrival'] as const
export type Act = (typeof ACTS)[number]

/** A keyframe: [timeline position, value]. */
export type Key = readonly [number, number]

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Sample a keyframed track at timeline position `t`.
 *
 * Keys must be sorted. Values are held flat outside the first and last key, so
 * a track only affects the stretch of the page you gave it keys for.
 */
export function track(keys: readonly Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]

  const last = keys[keys.length - 1]
  if (t >= last[0]) return last[1]

  for (let i = 0; i < keys.length - 1; i++) {
    const [aAt, aVal] = keys[i]
    const [bAt, bVal] = keys[i + 1]
    if (t >= aAt && t <= bAt) {
      const span = bAt - aAt
      const local = span === 0 ? 0 : (t - aAt) / span
      return aVal + (bVal - aVal) * smooth(local)
    }
  }

  return last[1]
}

/* ------------------------------------------------------------------ camera */

/**
 * Camera height. Rises to look down onto the lattice in act 03, then drops
 * back to eye level as the field gathers.
 */
export const CAM_Y: readonly Key[] = [
  [0, 26],
  [1, 54],
  [2, 215],
  [3, 78],
  [4, 14],
]

/** Dolly. Closest at the lattice, furthest while the field is dispersed. */
export const CAM_Z: readonly Key[] = [
  [0, 520],
  [1, 470],
  [2, 315],
  [3, 440],
  [4, 380],
]

/** Aim point. Drops to meet the lattice, which sits below the origin. */
export const LOOK_Y: readonly Key[] = [
  [0, 0],
  [1, 4],
  [2, -46],
  [3, 0],
  [4, 0],
]

/* ------------------------------------------------------------------- field */

/** Overall scale of the field. Opens out on the climb, gathers at the end. */
export const FIELD_SPREAD: readonly Key[] = [
  [0, 1],
  [1, 1.15],
  [2, 1.3],
  [3, 1.1],
  [4, 0.8],
]

/** Point size. Larger and softer when dispersed, tighter when formed. */
export const FIELD_SIZE: readonly Key[] = [
  [0, 2.5],
  [1, 2.2],
  [2, 1.9],
  [3, 2.2],
  [4, 2.9],
]

/** Dimmed through the stack act so the text is never fighting the field. */
export const FIELD_OPACITY: readonly Key[] = [
  [0, 1],
  [1, 0.95],
  [2, 0.6],
  [3, 0.85],
  [4, 1],
]
