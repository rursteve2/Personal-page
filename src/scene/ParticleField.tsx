import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { damp, frameDelta, scene } from './state'
import { FIELD_OPACITY, FIELD_SIZE, FIELD_SPREAD, track } from './timeline'

/**
 * The field.
 *
 * Every particle's position is computed analytically in the vertex shader from
 * its index — nothing is simulated and no state is stored between frames. That
 * matters for more than performance: because position is a pure function of
 * scroll, dragging the scrollbar backwards runs the whole morph in reverse
 * exactly, with no settling or catch-up. A GPGPU ping-pong simulation would
 * look similar going forwards and wrong going back.
 *
 * It also means one buffer, uploaded once, and one draw call for the entire
 * field. The only per-frame CPU work is writing a handful of uniforms.
 */

const FORM_COUNT = 5

const VERTEX = /* glsl */ `
precision highp float;

attribute float aIndex;
attribute vec3  aSeed;

uniform float uTime;
uniform float uCount;
uniform float uFormA;
uniform float uFormB;
uniform float uBlend;
uniform float uSpread;
uniform float uSize;
uniform vec2  uPointer;
uniform float uPointerStrength;
uniform float uAspect;
uniform float uVelocity;
uniform float uHyper;
uniform float uPixelRatio;

varying float vGlow;
varying float vSeed;

const float TAU = 6.28318530718;
/** Golden angle — the increment that makes a Fibonacci sphere even. */
const float GOLDEN = 2.39996322973;

/** 0: drifting cloud. Where the field rests. */
vec3 formCloud(float i, float n, vec3 seed) {
  vec3 p = (seed - 0.5) * vec3(560.0, 300.0, 520.0);
  // Pull the middle out so the name is never sitting in soup.
  float radial = length(p.xy) / 280.0;
  p.xy *= 0.55 + radial * 0.75;
  p.y += sin(uTime * 0.18 + seed.z * TAU) * 14.0;
  return p;
}

/** 1: hollow sphere, evenly distributed. */
vec3 formSphere(float i, float n, vec3 seed) {
  float y = 1.0 - 2.0 * n;
  float r = sqrt(max(1.0 - y * y, 0.0));
  float theta = i * GOLDEN;
  vec3 p = vec3(cos(theta) * r, y, sin(theta) * r) * 150.0;
  // Breathe, so a held scroll position still feels alive.
  p *= 1.0 + sin(uTime * 0.4 + n * 6.0) * 0.015;
  return p;
}

/** 2: flat lattice. The calm backdrop the stack text reads against. */
vec3 formGrid(float i, float n, vec3 seed) {
  float cols = 220.0;
  float gx = mod(i, cols);
  float gz = floor(i / cols);
  float rows = ceil(uCount / cols);
  return vec3(
    (gx / cols - 0.5) * 620.0,
    -40.0,
    (gz / max(rows, 1.0) - 0.5) * 620.0
  );
}

/** 3: the lattice, rippling. */
vec3 formWave(float i, float n, vec3 seed) {
  vec3 p = formGrid(i, n, seed);
  float d = length(p.xz) * 0.016;
  p.y += sin(d - uTime * 1.1) * 46.0 / (1.0 + d * 0.55);
  return p;
}

/** 4: spiral collapse. */
vec3 formVortex(float i, float n, vec3 seed) {
  float angle = i * GOLDEN * 0.5 + uTime * 0.25;
  float radius = pow(n, 0.65) * 210.0;
  return vec3(
    cos(angle) * radius,
    (n - 0.5) * 230.0 + sin(angle * 2.0) * 12.0,
    sin(angle) * radius
  );
}

vec3 formPosition(float form, float i, float n, vec3 seed) {
  // Branching on a uniform is uniform across every invocation in the draw, so
  // there is no divergence cost here.
  if (form < 0.5) return formCloud(i, n, seed);
  if (form < 1.5) return formSphere(i, n, seed);
  if (form < 2.5) return formGrid(i, n, seed);
  if (form < 3.5) return formWave(i, n, seed);
  return formVortex(i, n, seed);
}

void main() {
  float i = aIndex;
  float n = i / uCount;

  vec3 pos;
  if (uBlend < 0.001) {
    pos = formPosition(uFormA, i, n, aSeed);
  } else if (uBlend > 0.999) {
    pos = formPosition(uFormB, i, n, aSeed);
  } else {
    pos = mix(formPosition(uFormA, i, n, aSeed), formPosition(uFormB, i, n, aSeed), uBlend);
  }
  pos *= uSpread;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);

  // --- scroll velocity: smear along the axis of travel -------------------
  // Each particle lags by a different amount, which reads as motion blur
  // rather than as the whole field sliding.
  mv.y += uVelocity * (0.35 + aSeed.x * 1.3) * 26.0;

  // --- pointer: repel in screen space ------------------------------------
  // Done in NDC so the falloff is a circle on screen regardless of how far
  // away the particle is, then converted back into a view-space offset scaled
  // by depth so near particles move further — which is what makes it read as
  // a bulge in 3D rather than a flat 2D smudge.
  vec4 clip = projectionMatrix * mv;
  if (clip.w > 0.0001 && uPointerStrength > 0.001) {
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float force = exp(-dist * dist * 24.0) * uPointerStrength;
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0, 1.0);
    mv.xy += dir * force * (0.045 * -mv.z);
  }

  gl_Position = projectionMatrix * mv;

  float depth = -mv.z;
  gl_PointSize = uSize * uPixelRatio * (1.0 + uHyper * 0.8) * (420.0 / max(depth, 30.0));
  gl_PointSize = clamp(gl_PointSize, 1.1, 3.4);

  // Nearer particles read brighter; the seed keeps the field from looking
  // uniformly lit.
  vGlow = mix(0.25, 1.0, 1.0 - clamp(depth / 1500.0, 0.0, 1.0)) * (0.55 + aSeed.y * 0.45);
  vSeed = aSeed.z;
}
`

const FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec3  uColorNear;
uniform vec3  uColorFar;
uniform float uOpacity;

varying float vGlow;
varying float vSeed;

void main() {
  // Round the square point off with a soft radial falloff. No discard — under
  // additive blending a zero alpha already contributes nothing, and discard
  // defeats early-Z on some tilers.
  vec2 d = gl_PointCoord - 0.5;
  float falloff = 1.0 - smoothstep(0.05, 0.5, length(d));
  if (falloff <= 0.0) { gl_FragColor = vec4(0.0); return; }

  // Hue is deliberately NOT driven by vGlow directly. vGlow has to run high for
  // the field to be visible at all, and feeding it straight into the colour mix
  // dragged almost every particle onto the near colour — which is how the field
  // ended up reading white instead of blue. Biasing the mix keeps the midtones
  // in the accent and reserves the pale end for the genuinely close ones.
  vec3 color = mix(uColorFar, uColorNear, pow(vGlow, 2.2));

  // A sparse few run brighter, so the field isn't flat. Narrow threshold: this
  // should be a scattering of highlights, not a wash.
  color = mix(color, vec3(0.30, 0.62, 1.0), smoothstep(0.972, 1.0, vSeed) * 0.6);

  gl_FragColor = vec4(color, min(falloff * vGlow * uOpacity * 2.9, 1.0));
}
`

export function ParticleField({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const size = useThree((s) => s.size)

  const geometry = useMemo(() => {
    const index = new Float32Array(count)
    const seed = new Float32Array(count * 3)
    // Positions are computed in the shader, but three still needs a position
    // attribute to know how many vertices to draw.
    const position = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      index[i] = i
      seed[i * 3] = Math.random()
      seed[i * 3 + 1] = Math.random()
      seed[i * 3 + 2] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(position, 3))
    g.setAttribute('aIndex', new THREE.BufferAttribute(index, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    // The shader ignores `position`, so three's computed bounds are meaningless.
    // Give it a generous manual sphere so it is never wrongly culled.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000)
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCount: { value: count },
      uFormA: { value: 0 },
      uFormB: { value: 1 },
      uBlend: { value: 0 },
      uSpread: { value: 1 },
      uSize: { value: 1.7 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerStrength: { value: 0 },
      uAspect: { value: 1 },
      uVelocity: { value: 0 },
      uHyper: { value: 0 },
      uPixelRatio: { value: 1 },
      // The page accent and its deep partner, straight from the CSS custom
      // properties. Let three do the sRGB->linear conversion rather than
      // hand-authoring linear values: #5ea9ff converts to linear(0.112, 0.397,
      // 1.0), and an earlier attempt to write "linear" numbers by hand used
      // 0.62 for red instead of 0.112 — five times too much — which is what
      // turned the navy field pastel.
      uColorNear: { value: new THREE.Color('#5ea9ff') },
      uColorFar: { value: new THREE.Color('#2f6fd0') },
      uOpacity: { value: 1 },
    }),
    [count],
  )

  useFrame((_, rawDelta) => {
    if (!scene.running || !material.current) return
    const dt = frameDelta(rawDelta)
    const t = scene.timeline
    const u = material.current.uniforms

    u.uTime.value += dt
    u.uAspect.value = size.width / Math.max(size.height, 1)

    // The timeline maps directly onto the form sequence: act boundaries are
    // where one form has fully become the next.
    const clamped = Math.min(Math.max(t, 0), FORM_COUNT - 1)
    const from = Math.floor(clamped)
    u.uFormA.value = from
    u.uFormB.value = Math.min(from + 1, FORM_COUNT - 1)
    u.uBlend.value = clamped - from

    u.uSpread.value = damp(u.uSpread.value, track(FIELD_SPREAD, t), 4, dt)
    u.uSize.value = damp(u.uSize.value, track(FIELD_SIZE, t), 4, dt)
    u.uOpacity.value = damp(u.uOpacity.value, track(FIELD_OPACITY, t), 4, dt)
    u.uHyper.value = scene.hyper
    u.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2)

    // The scroll handler only ever raises velocity; it falls off here, so the
    // smear relaxes smoothly when scrolling stops instead of snapping to zero.
    scene.velocity = damp(scene.velocity, 0, 4.5, dt)
    u.uVelocity.value = damp(u.uVelocity.value, scene.velocity, 8, dt)

    const pointer = u.uPointer.value as THREE.Vector2
    pointer.x = damp(pointer.x, scene.pointerX, 8, dt)
    pointer.y = damp(pointer.y, -scene.pointerY, 8, dt)
    // Fade the repulsion out when the pointer has gone quiet, so a parked
    // cursor doesn't leave a permanent dent in the field.
    const wants = performance.now() - scene.lastInput < 2500 ? 15 : 0
    u.uPointerStrength.value = damp(u.uPointerStrength.value, wants, 3, dt)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
