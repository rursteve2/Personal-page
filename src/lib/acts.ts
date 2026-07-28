import { ACTS, type Act } from '../scene/timeline'

/**
 * Geometry of a pinned act, measured from the DOM.
 *
 * `travel` must come from the sticky child's own height, not from
 * `window.innerHeight`. The pin is `100svh` — the *small* viewport, with browser
 * chrome showing — while `innerHeight` tracks whatever the viewport currently
 * is, usually the large one once the chrome has collapsed. On a desktop the two
 * are identical, which is why this looked correct; on a phone they differ by the
 * height of the URL bar, so every act's progress and every nav target was off by
 * that much.
 */
export type ActGeometry = { top: number; travel: number }

export function measureAct(id: string): ActGeometry | null {
  const el = document.getElementById(id)
  if (!el) return null

  const pin = el.firstElementChild as HTMLElement | null
  const pinHeight = pin?.offsetHeight ?? window.innerHeight

  return {
    top: el.offsetTop,
    // How far the page scrolls while the child stays stuck.
    travel: Math.max(el.offsetHeight - pinHeight, 1),
  }
}

export function measureActs(): ActGeometry[] {
  return ACTS.map((id) => measureAct(id) ?? { top: 0, travel: 1 })
}

/**
 * Where a link to an act should land.
 *
 * Not the act's top: that is progress 0, before the content has revealed. This
 * targets a point inside the pinned stretch where everything is up.
 */
const LANDING = 0.35

export function actScrollTarget(id: string): number | null {
  if (!ACTS.includes(id as Act)) return null
  const geometry = measureAct(id)
  if (!geometry) return null

  return Math.round(geometry.top + geometry.travel * LANDING)
}

export function scrollToAct(id: string, behavior: ScrollBehavior = 'smooth') {
  const top = actScrollTarget(id)
  if (top === null) return false
  window.scrollTo({ top, behavior })
  return true
}
