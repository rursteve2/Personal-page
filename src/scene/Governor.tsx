import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { frameDelta, scene } from './state'

/**
 * Runtime quality governor.
 *
 * Picking quality from screen width and core count is a guess — it can't see a
 * throttled laptop, a busy GPU, or a browser compositing on the CPU. This
 * watches actual frame times and lowers resolution when the page can't hold its
 * budget, which is the difference between "looks great on my machine" and
 * "doesn't stutter on a recruiter's four-year-old ThinkPad".
 *
 * It only ever steps down. Stepping back up on recovery invites oscillation —
 * drop resolution, frame time improves, raise it, frame time worsens — and a
 * resolution that visibly pulses is worse than one that is simply lower.
 */

/** Roughly 45fps. Below this consistently, something has to give. */
const SLOW_FRAME_MS = 22

/** Consecutive slow frames before acting. Rides out GC pauses and scroll bursts. */
const PATIENCE = 45

const FLOOR = 0.75

export function Governor({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr)
  const slow = useRef(0)
  const level = useRef(maxDpr)

  useFrame((_, rawDelta) => {
    if (!scene.running) return
    const ms = frameDelta(rawDelta) * 1000

    if (ms > SLOW_FRAME_MS) {
      slow.current += 1
    } else {
      // Decay rather than reset, so a stream of *mostly* slow frames still
      // trips it while the occasional hitch doesn't.
      slow.current = Math.max(0, slow.current - 1)
    }

    if (slow.current >= PATIENCE && level.current > FLOOR) {
      level.current = Math.max(FLOOR, level.current - 0.25)
      setDpr(level.current)
      slow.current = 0
    }
  })

  return null
}
