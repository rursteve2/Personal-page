import { useEffect, useRef } from 'react'
import { FRAGMENT_SHADER, VERTEX_SHADER } from './field.glsl'
import { lookAt, mat4, perspective, srgbHexToLinear } from './mat4'
import { clamp, damp, frameDelta, scene } from './state'
import { CAM_Y, CAM_Z, FIELD_OPACITY, FIELD_SIZE, FIELD_SPREAD, LOOK_Y, track } from './timeline'

/**
 * The particle field, on raw WebGL2.
 *
 * This replaces three.js + react-three-fiber, which together were ~230kB
 * gzipped — about three quarters of the page — to issue a single
 * `drawArrays(POINTS)`. Nothing else in the scene used a scene graph, lights,
 * materials, raycasting or loaders, so almost all of that weight was carried
 * for nothing.
 *
 * Everything lives in one effect: create the context, compile one program,
 * upload one buffer, then write uniforms per frame. React renders this
 * component once and is not involved again.
 */

const FORM_COUNT = 5
const FOV_Y = (55 * Math.PI) / 180
const NEAR = 1
const FAR = 3000

/** Matches the CSS `--accent` and `--accent-deep` tokens. */
const COLOR_NEAR = srgbHexToLinear('#5ea9ff')
const COLOR_FAR = srgbHexToLinear('#2f6fd0')

type Quality = { particles: number; maxDpr: number }

function pickQuality(): Quality {
  const width = window.innerWidth
  const cores = navigator.hardwareConcurrency ?? 4

  // A point cloud is fill-rate bound; past ~30k the extra points mostly land on
  // pixels that are already lit.
  if (width < 700 || cores <= 4) return { particles: 9000, maxDpr: 1.25 }
  if (width < 1200) return { particles: 18000, maxDpr: 1.35 }
  return { particles: 30000, maxDpr: 1.5 }
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Shaders fail silently otherwise — the draw simply produces nothing, with
    // no error anywhere. Always surface this.
    console.error(
      `[field] ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader failed:\n` +
        gl.getShaderInfoLog(shader),
    )
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function buildProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vertex || !fragment) return null

  const program = gl.createProgram()!
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  // Safe to drop once linked; the program keeps its own copy.
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[field] program link failed:\n' + gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

export function Field({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      // The CSS sky gradient shows through; don't paint over it.
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      // Nothing here is depth-tested or stencilled — skip both buffers.
      depth: false,
      stencil: false,
    })

    if (!gl) {
      console.error('[field] WebGL2 unavailable; leaving the sky gradient in place')
      return
    }

    const program = buildProgram(gl)
    if (!program) return

    const quality = pickQuality()

    // --- one buffer, uploaded once ---------------------------------------
    // Positions come from gl_VertexID in the shader, so there is no position
    // attribute at all — only a stable per-particle seed.
    const seeds = new Float32Array(quality.particles * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    const seedBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW)

    const seedLocation = gl.getAttribLocation(program, 'aSeed')
    gl.enableVertexAttribArray(seedLocation)
    gl.vertexAttribPointer(seedLocation, 3, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uniforms = {
      view: u('uView'),
      projection: u('uProjection'),
      time: u('uTime'),
      count: u('uCount'),
      formA: u('uFormA'),
      formB: u('uFormB'),
      blend: u('uBlend'),
      spread: u('uSpread'),
      size: u('uSize'),
      pointer: u('uPointer'),
      pointerStrength: u('uPointerStrength'),
      aspect: u('uAspect'),
      velocity: u('uVelocity'),
      hyper: u('uHyper'),
      pixelRatio: u('uPixelRatio'),
      colorNear: u('uColorNear'),
      colorFar: u('uColorFar'),
      opacity: u('uOpacity'),
    }

    gl.useProgram(program)
    gl.uniform1f(uniforms.count, quality.particles)
    gl.uniform3fv(uniforms.colorNear, COLOR_NEAR)
    gl.uniform3fv(uniforms.colorFar, COLOR_FAR)

    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    // Additive: contribution is colour * alpha, so dim particles simply add less.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.clearColor(0, 0, 0, 0)

    // --- sizing ------------------------------------------------------------
    const projection = mat4()
    const view = mat4()
    let dprScale = 1
    let viewWidth = 1
    let viewHeight = 1

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, quality.maxDpr) * dprScale
      viewWidth = canvas.clientWidth
      viewHeight = canvas.clientHeight

      const width = Math.max(1, Math.round(viewWidth * dpr))
      const height = Math.max(1, Math.round(viewHeight * dpr))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)

      const aspect = width / height
      perspective(projection, FOV_Y, aspect, NEAR, FAR)
      gl.useProgram(program)
      gl.uniformMatrix4fv(uniforms.projection, false, projection)
      gl.uniform1f(uniforms.aspect, aspect)
      gl.uniform1f(uniforms.pixelRatio, dpr)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    // --- camera + animation state -----------------------------------------
    let camX = 0
    let camY = track(CAM_Y, 0)
    let camZ = track(CAM_Z, 0)
    let lookY = track(LOOK_Y, 0)
    let spread = track(FIELD_SPREAD, 0)
    let size = track(FIELD_SIZE, 0)
    let opacity = track(FIELD_OPACITY, 0)
    let pointerX = 0
    let pointerY = 0
    let pointerStrength = 0
    let velocity = 0
    let elapsed = 0

    // Quality governor. Only ever steps down: stepping back up on recovery
    // invites oscillation, and a resolution that visibly pulses is worse than
    // one that is simply lower.
    let slowFrames = 0

    let frame = 0
    let last = performance.now()

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)

      const raw = (now - last) / 1000
      last = now
      if (!scene.running) return

      const dt = frameDelta(raw)
      elapsed += dt

      if (dt * 1000 > 22) slowFrames += 1
      else slowFrames = Math.max(0, slowFrames - 1)

      if (slowFrames >= 45 && dprScale > 0.55) {
        dprScale = Math.max(0.55, dprScale - 0.2)
        slowFrames = 0
        resize()
      }

      const t = scene.timeline

      camX = damp(camX, scene.pointerX * 7, 3, dt)
      camY = damp(camY, track(CAM_Y, t) + scene.pointerY * 3, 4, dt)
      camZ = damp(camZ, track(CAM_Z, t) - scene.hyper * 16, 4, dt)
      lookY = damp(lookY, track(LOOK_Y, t), 4, dt)
      lookAt(view, camX, camY, camZ, 0, lookY, 0)

      spread = damp(spread, track(FIELD_SPREAD, t), 4, dt)
      size = damp(size, track(FIELD_SIZE, t), 4, dt)
      opacity = damp(opacity, track(FIELD_OPACITY, t), 4, dt)

      // The scroll handler only ever raises velocity; it decays here so the
      // smear relaxes rather than snapping when scrolling stops.
      scene.velocity = damp(scene.velocity, 0, 4.5, dt)
      velocity = damp(velocity, scene.velocity, 8, dt)

      pointerX = damp(pointerX, scene.pointerX, 8, dt)
      pointerY = damp(pointerY, -scene.pointerY, 8, dt)
      // Fade the repulsion out once the pointer goes quiet, so a parked cursor
      // doesn't leave a permanent dent.
      const wanted = performance.now() - scene.lastInput < 2500 ? 15 : 0
      pointerStrength = damp(pointerStrength, wanted, 3, dt)

      const clamped = clamp(t, 0, FORM_COUNT - 1)
      const from = Math.floor(clamped)

      gl.useProgram(program)
      gl.uniformMatrix4fv(uniforms.view, false, view)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1f(uniforms.formA, from)
      gl.uniform1f(uniforms.formB, Math.min(from + 1, FORM_COUNT - 1))
      gl.uniform1f(uniforms.blend, clamped - from)
      gl.uniform1f(uniforms.spread, spread)
      gl.uniform1f(uniforms.size, size)
      gl.uniform1f(uniforms.opacity, opacity)
      gl.uniform1f(uniforms.velocity, velocity)
      gl.uniform1f(uniforms.hyper, scene.hyper)
      gl.uniform2f(uniforms.pointer, pointerX, pointerY)
      gl.uniform1f(uniforms.pointerStrength, pointerStrength)

      // Konami easing lived in a separate r3f component before; it is one line.
      scene.hyper = damp(scene.hyper, scene.hyperTarget, 2.4, dt)

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.POINTS, 0, quality.particles)
    }

    const onContextLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(frame)
      frame = 0
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    if (reducedMotion) {
      // One frame, then stop. The scene still exists; it just doesn't move.
      draw(performance.now())
      cancelAnimationFrame(frame)
      frame = 0
    } else {
      frame = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.deleteBuffer(seedBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      // Deliberately NOT loseContext(). StrictMode runs effects twice in dev:
      // mount, clean up, mount again — against the same canvas element. Losing
      // the context in cleanup means the second mount's getContext() hands back
      // a dead context and nothing ever draws. Releasing the GL objects is
      // enough; the context itself goes when the canvas is collected.
    }
  }, [reducedMotion])

  // Pause when the tab is hidden — the only moment there is genuinely nothing
  // to draw for, since the canvas is fixed behind the whole page.
  useEffect(() => {
    const onVisibility = () => {
      scene.running = !document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div className="scene" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
