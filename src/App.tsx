import { Field } from './scene/Field'
import { Arrival } from './components/Arrival'
import { Ascent } from './components/Ascent'
import { Footer } from './components/Footer'
import { Launch } from './components/Launch'
import { Nav } from './components/Nav'
import { Stack } from './components/Stack'
import { useHashLanding } from './hooks/useHashLanding'
import { useKonami } from './hooks/useKonami'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useSceneInput } from './hooks/useSceneInput'

export default function App() {
  const reducedMotion = useReducedMotion()
  const hyperspace = useKonami()

  useSceneInput()
  useHashLanding()

  return (
    <>
      <a className="skip" href="#stack">
        Skip to content
      </a>

      {/* No lazy chunk any more: without three this is a few kB, so splitting
          it would cost a round trip to save nothing. */}
      <Field reducedMotion={reducedMotion} />

      <Nav />

      <main className="page">
        <Launch />
        <Ascent />
        <Stack />
        <Arrival />
        <Footer />
      </main>

      {/* A CSS transition, not an animation library. This was the only thing
          still importing `motion`, which cost ~38kB gzipped to fade one toast.
          The global prefers-reduced-motion block already neutralises it. */}
      <div className="toast" data-visible={hyperspace} role="status">
        Hyperspace engaged
      </div>
    </>
  )
}
