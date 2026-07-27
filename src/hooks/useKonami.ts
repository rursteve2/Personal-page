import { useEffect, useRef, useState } from 'react'
import { scene } from '../scene/state'

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/** Konami code → hyperspace. Toggles, so it can be turned back off. */
export function useKonami() {
  const [engaged, setEngaged] = useState(false)
  const progress = useRef(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const expected = SEQUENCE[progress.current]

      if (key === expected) {
        progress.current += 1
        if (progress.current === SEQUENCE.length) {
          progress.current = 0
          setEngaged((on) => {
            const next = !on
            scene.hyperTarget = next ? 1 : 0
            return next
          })
        }
      } else {
        // A wrong key still counts as the first key of a fresh attempt.
        progress.current = key === SEQUENCE[0] ? 1 : 0
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return engaged
}
