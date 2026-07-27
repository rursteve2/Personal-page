import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_HOME, Rig } from './Rig'
import { Governor } from './Governor'
import { ParticleField } from './ParticleField'
import { damp, frameDelta, scene } from './state'

/**
 * Quality tiers.
 *
 * Vertex count is the thing that actually hurts on a phone here, so the terrain
 * mesh is where we spend or save. Everything else is already cheap.
 */
type Quality = {
  /** Particle count — the single knob that matters for this scene. */
  particles: number
  dpr: [number, number]
}

function pickQuality(): Quality {
  const width = window.innerWidth
  const cores = navigator.hardwareConcurrency ?? 4

  // These are starting points, not verdicts — Governor lowers resolution at
  // runtime if the device can't hold frame budget. Counts are deliberately
  // conservative: a point cloud is fill-rate bound, and past ~30k the extra
  // points mostly land on pixels that are already lit.
  if (width < 700 || cores <= 4) {
    return { particles: 9000, dpr: [1, 1.25] }
  }
  if (width < 1200) {
    return { particles: 18000, dpr: [1, 1.35] }
  }
  return { particles: 30000, dpr: [1, 1.5] }
}

/** Eases the konami flag so every shader can just read `scene.hyper`. */
function HyperDriver() {
  useFrame((_, rawDelta) => {
    const dt = frameDelta(rawDelta)
    scene.hyper = damp(scene.hyper, scene.hyperTarget, 2.4, dt)
  })
  return null
}

/**
 * With reduced motion requested we render a single frame and stop. The scene
 * still exists — it just doesn't move, which is the point of the preference.
 */
function StillFrame() {
  useFrame((state) => {
    state.gl.render(state.scene, state.camera)
  }, 1)
  return null
}

export function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const quality = useMemo(pickQuality, [])

  // Pause the loop when the tab is hidden. The canvas is fixed and sits behind
  // the whole page, so it's never scrolled out of view — tab visibility is the
  // only moment there's genuinely nothing to draw for. Without this the terrain
  // keeps integrating in the background and the page eats battery for no reason.
  useEffect(() => {
    const onVisibility = () => {
      scene.running = !document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        frameloop={reducedMotion ? 'demand' : 'always'}
        dpr={quality.dpr}
        gl={{
          alpha: true,
          // The grid is already antialiased in the shader via fwidth, so MSAA
          // buys very little here and costs a full-screen multisample buffer.
          antialias: false,
          powerPreference: 'high-performance',
          // The CSS gradient behind the canvas is the sky; don't paint over it.
          premultipliedAlpha: false,
        }}
        camera={{ fov: 55, near: 1, far: 3000, position: CAMERA_HOME }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#05070d'), 0)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.15
        }}
      >
        <Suspense fallback={null}>
          {/* No lights: the field is unlit and additively blended. */}
          <ParticleField count={quality.particles} />
          <Rig />
          {!reducedMotion && <Governor maxDpr={quality.dpr[1]} />}
          {reducedMotion ? <StillFrame /> : <HyperDriver />}
        </Suspense>
      </Canvas>
    </div>
  )
}
