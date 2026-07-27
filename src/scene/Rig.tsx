import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { damp, frameDelta, scene } from './state'
import { CAM_Y, CAM_Z, LOOK_Y, track } from './timeline'

/**
 * Camera, flown entirely by the scroll timeline, orbiting the field's origin.
 *
 * The pointer only adds a small parallax offset on top — enough that the scene
 * feels alive under the cursor, not enough that anyone has to "play" it.
 *
 * Positions are damped toward their timeline targets rather than snapped. Scroll
 * events arrive coarse and bursty (especially on a trackpad or a mouse wheel
 * with large deltas), and snapping straight to them makes the camera stutter in
 * step with the wheel instead of gliding.
 */
export const CAMERA_HOME: [number, number, number] = [0, CAM_Y[0][1], CAM_Z[0][1]]
const LOOK_AT_Z = 0

/** Pointer influence, in world units. Deliberately small. */
const PARALLAX_X = 7
const PARALLAX_Y = 3

export function Rig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const lookY = useRef(LOOK_Y[0][1])

  useLayoutEffect(() => {
    camera.position.set(...CAMERA_HOME)
    camera.lookAt(0, LOOK_Y[0][1], LOOK_AT_Z)
  }, [camera])

  useFrame((_, rawDelta) => {
    if (!scene.running) return
    const dt = frameDelta(rawDelta)
    const t = scene.timeline

    const targetX = scene.pointerX * PARALLAX_X
    const targetY = track(CAM_Y, t) + scene.pointerY * PARALLAX_Y
    const targetZ = track(CAM_Z, t) - scene.hyper * 16

    camera.position.x = damp(camera.position.x, targetX, 3, dt)
    camera.position.y = damp(camera.position.y, targetY, 4, dt)
    camera.position.z = damp(camera.position.z, targetZ, 4, dt)

    lookY.current = damp(lookY.current, track(LOOK_Y, t), 4, dt)
    camera.lookAt(0, lookY.current, LOOK_AT_Z)

    const fov = 55 + scene.hyper * 22
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = damp(camera.fov, fov, 4, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
