/**
 * Shaders for the particle field, GLSL ES 3.00.
 *
 * Written against raw WebGL2 rather than three, so there is no injected
 * prefix: `#version` must be the first line, varyings are `in`/`out`, and the
 * fragment output is declared explicitly.
 *
 * Particle positions are computed from `gl_VertexID` — there is no position
 * attribute at all, and no per-frame CPU work beyond writing uniforms. The
 * whole field is one `drawArrays(POINTS)`.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec3 aSeed;

uniform mat4  uView;
uniform mat4  uProjection;
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

out float vGlow;
out float vSeed;

const float TAU = 6.28318530718;
/* Golden angle — the increment that makes a Fibonacci sphere even. */
const float GOLDEN = 2.39996322973;

/* 0: drifting cloud. Where the field rests. */
vec3 formCloud(float i, float n, vec3 seed) {
  vec3 p = (seed - 0.5) * vec3(560.0, 300.0, 520.0);
  // Push the middle outward so the name never sits in soup.
  float radial = length(p.xy) / 280.0;
  p.xy *= 0.55 + radial * 0.75;
  p.y += sin(uTime * 0.18 + seed.z * TAU) * 14.0;
  return p;
}

/* 1: hollow sphere, evenly distributed. */
vec3 formSphere(float i, float n, vec3 seed) {
  float y = 1.0 - 2.0 * n;
  float r = sqrt(max(1.0 - y * y, 0.0));
  float theta = i * GOLDEN;
  vec3 p = vec3(cos(theta) * r, y, sin(theta) * r) * 150.0;
  // Breathe, so a held scroll position still feels alive.
  p *= 1.0 + sin(uTime * 0.4 + n * 6.0) * 0.015;
  return p;
}

/* 2: flat lattice. The calm backdrop the stack text reads against. */
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

/* 3: the lattice, rippling. */
vec3 formWave(float i, float n, vec3 seed) {
  vec3 p = formGrid(i, n, seed);
  float d = length(p.xz) * 0.016;
  p.y += sin(d - uTime * 1.1) * 46.0 / (1.0 + d * 0.55);
  return p;
}

/* 4: spiral collapse. */
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
  // there is no divergence cost.
  if (form < 0.5) return formCloud(i, n, seed);
  if (form < 1.5) return formSphere(i, n, seed);
  if (form < 2.5) return formGrid(i, n, seed);
  if (form < 3.5) return formWave(i, n, seed);
  return formVortex(i, n, seed);
}

void main() {
  float i = float(gl_VertexID);
  float n = i / uCount;

  // Skip the second evaluation when sitting exactly on one form.
  vec3 pos;
  if (uBlend < 0.001) {
    pos = formPosition(uFormA, i, n, aSeed);
  } else if (uBlend > 0.999) {
    pos = formPosition(uFormB, i, n, aSeed);
  } else {
    pos = mix(formPosition(uFormA, i, n, aSeed), formPosition(uFormB, i, n, aSeed), uBlend);
  }
  pos *= uSpread;

  vec4 mv = uView * vec4(pos, 1.0);

  // --- scroll velocity: smear along the axis of travel --------------------
  // Each particle lags by a different amount, which reads as motion blur
  // rather than the whole field sliding.
  mv.y += uVelocity * (0.35 + aSeed.x * 1.3) * 26.0;

  // --- pointer: repel in screen space -------------------------------------
  // Computed in NDC so the falloff is a circle on screen at any depth, then
  // converted back to a view-space offset scaled by distance so near particles
  // move further — which is what makes it read as a bulge in 3D rather than a
  // flat smudge.
  vec4 clip = uProjection * mv;
  if (clip.w > 0.0001 && uPointerStrength > 0.001) {
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float force = exp(-dist * dist * 24.0) * uPointerStrength;
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0, 1.0);
    mv.xy += dir * force * (0.045 * -mv.z);
  }

  gl_Position = uProjection * mv;

  float depth = -mv.z;
  gl_PointSize = clamp(
    uSize * uPixelRatio * (1.0 + uHyper * 0.8) * (420.0 / max(depth, 30.0)),
    1.1,
    3.4
  );

  vGlow = mix(0.25, 1.0, 1.0 - clamp(depth / 1500.0, 0.0, 1.0)) * (0.55 + aSeed.y * 0.45);
  vSeed = aSeed.z;
}
`

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision mediump float;

in float vGlow;
in float vSeed;

uniform vec3  uColorNear;
uniform vec3  uColorFar;
uniform float uOpacity;

out vec4 fragColor;

void main() {
  // Round the square point off with a soft radial falloff. No discard — under
  // additive blending a zero alpha already contributes nothing.
  vec2 d = gl_PointCoord - 0.5;
  float falloff = 1.0 - smoothstep(0.05, 0.5, length(d));
  if (falloff <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  // Hue is deliberately NOT driven by vGlow directly. vGlow has to run high for
  // the field to be visible at all, and feeding it straight into the mix drags
  // nearly every particle onto the near colour — which turns the navy pastel.
  vec3 color = mix(uColorFar, uColorNear, pow(vGlow, 2.2));

  // A sparse few run brighter so the field isn't flat. Narrow threshold: a
  // scattering of highlights, not a wash.
  color = mix(color, vec3(0.30, 0.62, 1.0), smoothstep(0.972, 1.0, vSeed) * 0.6);

  fragColor = vec4(color, min(falloff * vGlow * uOpacity * 2.9, 1.0));
}
`
