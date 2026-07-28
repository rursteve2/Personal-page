import { useEffect } from 'react'
import { scrollToAct } from '../lib/acts'

/**
 * Honour a #act deep link on first load.
 *
 * The browser resolves the fragment while the document is still an empty
 * `#root`, so its own attempt lands on nothing and is silently dropped.
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
