/**
 * The two matrices this scene needs, and nothing else.
 *
 * Column-major, the layout WebGL expects, so they upload straight through
 * `uniformMatrix4fv` with no transpose.
 */

export type Mat4 = Float32Array

export const mat4 = (): Mat4 => new Float32Array(16)

/** Standard OpenGL perspective projection. `fovY` in radians. */
export function perspective(out: Mat4, fovY: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)

  out[0] = f / aspect
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = 0
  out[5] = f
  out[6] = 0
  out[7] = 0
  out[8] = 0
  out[9] = 0
  out[10] = (far + near) * nf
  out[11] = -1
  out[12] = 0
  out[13] = 0
  out[14] = 2 * far * near * nf
  out[15] = 0
}

/**
 * View matrix for a camera at `eye` looking at `target`, Y-up.
 *
 * This is the inverse of the camera's world transform, which is why the
 * translation row is a set of dot products rather than a negated position.
 */
export function lookAt(
  out: Mat4,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
) {
  // Forward (camera looks down -Z, so z axis points back toward the eye).
  let zx = eyeX - targetX
  let zy = eyeY - targetY
  let zz = eyeZ - targetZ
  let len = Math.hypot(zx, zy, zz)
  if (len === 0) {
    // Degenerate: eye sits on the target. Any orientation is as good as another.
    zz = 1
    len = 1
  }
  zx /= len
  zy /= len
  zz /= len

  // right = up x z, with up = (0,1,0)
  let xx = zz
  let xy = 0
  let xz = -zx
  len = Math.hypot(xx, xy, xz)
  if (len === 0) {
    // Looking straight up or down: the cross product collapses. Pick an axis.
    xx = 1
    xy = 0
    xz = 0
  } else {
    xx /= len
    xy /= len
    xz /= len
  }

  // up = z x right
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx

  out[0] = xx
  out[1] = yx
  out[2] = zx
  out[3] = 0
  out[4] = xy
  out[5] = yy
  out[6] = zy
  out[7] = 0
  out[8] = xz
  out[9] = yz
  out[10] = zz
  out[11] = 0
  out[12] = -(xx * eyeX + xy * eyeY + xz * eyeZ)
  out[13] = -(yx * eyeX + yy * eyeY + yz * eyeZ)
  out[14] = -(zx * eyeX + zy * eyeY + zz * eyeZ)
  out[15] = 1
}

/**
 * sRGB hex to linear-light RGB.
 *
 * three used to do this on our behalf, and its output went to the framebuffer
 * unconverted — which is what gave the field its deep navy. Reproducing that
 * conversion here keeps the colour identical now that nothing does it for us,
 * and keeps these values tied to the CSS `--accent` tokens.
 */
export function srgbHexToLinear(hex: string): [number, number, number] {
  const int = parseInt(hex.replace('#', ''), 16)
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255]

  return channels.map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
}
