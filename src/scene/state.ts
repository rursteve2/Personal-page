/**
 * Mutable scene state, deliberately outside React.
 *
 * Pointer moves and scroll fire far more often than we'd ever want to re-render
 * at, so nothing here goes through setState — the r3f frame loop reads these
 * fields directly and the React tree never re-renders because of them.
 */
export type SceneState = {
  /** Page scroll progress, 0 at the top of the hero → 1 at the end of the page. */
  scroll: number
  /**
   * Position along the four-act scroll timeline, 0 → 4. This is what the scene
   * actually reads; see `timeline.ts`. Measured from the real act elements, so
   * it stays aligned with what's on screen at any viewport size.
   */
  timeline: number
  /** Scroll velocity, normalised and signed. Drives the motion smear. */
  velocity: number
  /** Pointer position in NDC-ish space, -1..1 on both axes. */
  pointerX: number
  pointerY: number
  /** Timestamp (ms) of the last real pointer/touch input, for the autopilot handoff. */
  lastInput: number
  /** Whether the visitor has ever taken the controls this session. */
  everTouched: boolean
  /** Konami target (0 or 1) and the eased value the shaders actually read. */
  hyperTarget: number
  hyper: number
  /** False when the tab is hidden — the frame loop early-outs. */
  running: boolean
}

export const scene: SceneState = {
  scroll: 0,
  timeline: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  lastInput: -Infinity,
  everTouched: false,
  hyperTarget: 0,
  hyper: 0,
  running: true,
}

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v

/**
 * Frame delta, floored as well as capped.
 *
 * The cap handles the enormous delta a backgrounded tab hands back on resume.
 * The floor matters more than it looks: r3f reports delta 0 on the first frame
 * (and can again whenever two frames land in the same millisecond), and
 * anything dividing by it produces NaN. A NaN fed into a rotation silently
 * poisons the object's matrix — the mesh keeps its position and still reports
 * visible, it just stops rasterising entirely, and NaN never washes back out.
 */
export const frameDelta = (raw: number) => clamp(raw, 1 / 240, 0.05)
