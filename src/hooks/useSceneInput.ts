import { useEffect } from 'react'
import { clamp, scene } from '../scene/state'
import { ACTS } from '../scene/timeline'
import { measureActs, type ActGeometry } from '../lib/acts'

/**
 * Feeds pointer and scroll into the scene store.
 *
 * All of it is passive and writes to plain fields — no React state is touched,
 * so a pointermove or a scroll never costs a render. Listeners live on window
 * because the canvas is `pointer-events: none` and must stay that way for the
 * page on top of it to remain selectable.
 *
 * The timeline is measured from the act elements themselves rather than from a
 * fraction of total document height. Acts have different heights, and deriving
 * it from the document would drift the scene out of sync with whichever act is
 * actually pinned on screen — worse at small viewports, where act heights
 * diverge most.
 */
export function useSceneInput() {
  useEffect(() => {
    let bands: ActGeometry[] = []
    let scrollMax = 0
    const measure = () => {
      bands = measureActs()
      // Reading scrollHeight forces a synchronous layout flush. This used to sit
      // in the scroll handler, so it was paid on every scroll event — and with
      // four sticky pins keeping layout dirty, that is real main-thread time on
      // exactly the frames the field's quality governor is watching. It only
      // changes when layout does, which is when we are already measuring.
      scrollMax = document.documentElement.scrollHeight - window.innerHeight
    }

    let lastY = window.scrollY
    let lastT = performance.now()

    const readScroll = () => {
      const y = window.scrollY

      // Instantaneous scroll speed, normalised so ~2.5px/ms reads as full tilt.
      // It decays back to zero in the frame loop; here we only ever push it up,
      // otherwise a burst of events during a fast flick would cancel itself out.
      const now = performance.now()
      const dt = Math.max(now - lastT, 1)
      const v = clamp((y - lastY) / dt / 2.5, -1, 1)
      if (Math.abs(v) > Math.abs(scene.velocity)) scene.velocity = v
      lastY = y
      lastT = now

      if (bands.length) {
        // Find the act we're inside, and how far through it we are.
        let timeline = 0
        for (let i = 0; i < bands.length; i++) {
          const { top, travel } = bands[i]
          const local = (y - top) / travel
          if (local <= 0) {
            timeline = i
            break
          }
          if (local < 1 || i === bands.length - 1) {
            timeline = i + clamp(local, 0, 1)
            break
          }
        }
        scene.timeline = clamp(timeline, 0, ACTS.length)
      }

      scene.scroll = scrollMax > 0 ? clamp(y / scrollMax, 0, 1) : 0
    }

    const setFromClient = (clientX: number, clientY: number) => {
      scene.pointerX = clamp((clientX / window.innerWidth) * 2 - 1, -1, 1)
      scene.pointerY = clamp((clientY / window.innerHeight) * 2 - 1, -1, 1)
      scene.lastInput = performance.now()
      scene.everTouched = true
    }

    const onPointerMove = (e: PointerEvent) => setFromClient(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) setFromClient(t.clientX, t.clientY)
    }
    const onResize = () => {
      measure()
      readScroll()
    }

    // Fonts and the lazy scene chunk both change layout after first paint, so
    // re-measure once things have settled rather than trusting mount-time values.
    measure()
    readScroll()
    const settle = window.setTimeout(onResize, 400)
    document.fonts?.ready.then(onResize).catch(() => {})

    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
}
