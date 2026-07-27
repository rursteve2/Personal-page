import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Act as ActId } from '../scene/timeline'

/**
 * A pinned act.
 *
 * The outer element is tall — that height *is* the scroll budget. The inner
 * element sticks to the viewport for the whole of it, so the visitor scrolls
 * through the act without the content moving and the scene animates instead.
 *
 * Reveal is a one-shot on entering the viewport, NOT a function of scroll
 * progress. Because the acts are sticky, two of them are on screen at once
 * during a handover: the outgoing act is at progress ~1 while the incoming act
 * is still at progress ~0. Driving opacity from progress therefore made content
 * invisible during exactly the window it was on screen — leaving one act faded
 * out while it was still visible, and the next one transparent before the
 * visitor reached it. Scroll drives motion and the 3D scene; it does not decide
 * whether text can be read.
 */
export function Act({
  id,
  screens,
  children,
  className = '',
}: {
  id: ActId
  /** Act height in viewport heights. Travel while pinned is this minus one. */
  screens: number
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Fallback: if the observer never fires for any reason, reveal anyway
    // rather than leaving the section permanently blank.
    const failsafe = window.setTimeout(() => setRevealed(true), 1500)

    if (!('IntersectionObserver' in window)) {
      setRevealed(true)
      return () => window.clearTimeout(failsafe)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
          window.clearTimeout(failsafe)
        }
      },
      // Fire a little before the act reaches the viewport, so it is already up
      // by the time any of it is actually on screen.
      { rootMargin: '20% 0px 20% 0px' },
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      window.clearTimeout(failsafe)
    }
  }, [])

  return (
    <section
      id={id}
      ref={ref}
      className="act"
      data-revealed={revealed}
      style={{ height: `${screens * 100}svh` }}
    >
      <div className={`act__pin ${className}`}>{children}</div>
    </section>
  )
}
