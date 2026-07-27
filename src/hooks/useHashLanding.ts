import { useEffect } from 'react'
import { ACTS, type Act } from '../scene/timeline'

/**
 * Where a link to an act should actually put you.
 *
 * Acts are pinned: the element's top is where the act *starts*, which is
 * progress 0 — before any of its content has revealed. Sending someone there
 * lands them on a deliberately blank screen. So links target a point inside the
 * act, past the reveal, where the content is fully up.
 */
const LANDING = 0.42

export function actScrollTarget(id: string): number | null {
  if (!ACTS.includes(id as Act)) return null
  const el = document.getElementById(id)
  if (!el) return null

  const travel = Math.max(el.offsetHeight - window.innerHeight, 0)
  return el.offsetTop + travel * LANDING
}

export function scrollToAct(id: string, behavior: ScrollBehavior = 'smooth') {
  const top = actScrollTarget(id)
  if (top === null) return false
  window.scrollTo({ top, behavior })
  return true
}

/**
 * Honour a #act deep link on first load. The browser resolves the fragment
 * while the document is still an empty #root, so its own attempt lands on
 * nothing and is silently dropped.
 */
export function useHashLanding() {
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return

    // Wait a frame so layout has settled; act heights depend on the viewport.
    const raf = requestAnimationFrame(() => {
      if (!scrollToAct(id, 'auto')) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [])
}
