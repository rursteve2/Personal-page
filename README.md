# stephencchen.com

Personal site. React 19 + TypeScript + Vite, with a three.js hero.

## Running it

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build into dist/
npm run preview    # serve the built output
npm run deploy     # build, then publish dist/ to the gh-pages branch
```

Needs Node 20+.

`public/CNAME` is what keeps the custom domain pointed at the site — Vite copies it
into `dist/`, and `gh-pages` publishes from there. Don't move it back to the repo
root or the domain breaks on the next deploy.

## The hero

`src/scene/` is an endless procedural landscape with a craft you can steer.

- **`Terrain.tsx`** — one plane, never rebuilt. Height comes from 4-octave fbm
  sampled at `(worldX, worldZ - scroll)` in the vertex shader, so advancing a
  single uniform scrolls infinite terrain past the camera with no chunk loading
  and nothing per-frame on the CPU. The grid is drawn in the fragment shader from
  those same coordinates, which is why the lines flow over the hills instead of
  sitting flat like a projected texture.
- **`Craft.tsx`** — pointer or touch sets a target; position is critically damped
  toward it and the bank angle comes from lateral velocity, so it rolls into
  turns. Idle for a few seconds and autopilot takes over.
- **`Starfield.tsx`** — line segments rather than points, so hyperspace can
  stretch them into streaks. Tail length scales with view depth to stay a
  constant size on screen.
- **`Rig.tsx`** — camera parallax, scroll response, hyperspace FOV punch.
- **`state.ts`** — pointer and scroll live here, deliberately outside React. They
  fire far too often to re-render on, so the frame loop reads them directly.

Quality tiers pick vertex count and DPR from screen size and core count; the loop
halts when the tab is hidden. `prefers-reduced-motion` renders a single static
frame and stops.

The Konami code toggles hyperspace.

### Two things worth knowing before editing the shaders

- The terrain compiles as **GLSL ES 3.00** (`glslVersion: THREE.GLSL3`) because
  the grid needs `fwidth`. three still emits GLSL ES 1.00 by default, and on a
  WebGL2 context derivatives are neither core there nor reachable via
  `GL_OES_standard_derivatives` — that extension isn't exposed at all, so the
  program fails to link and the terrain silently never draws. GLSL3 also has no
  `gl_FragColor`, and three only aliases the `varying`/`attribute` keywords, so
  the fragment output is declared explicitly.
- Anything dividing by the frame delta must use `frameDelta()`. r3f reports a
  delta of 0 on the first frame, and a NaN that reaches a rotation poisons the
  object's matrix — the mesh keeps its position and still reports `visible`, it
  just stops rasterising, and NaN never washes back out.
