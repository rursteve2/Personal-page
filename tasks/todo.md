# Portfolio rebuild — stephencchen.com

## Direction (confirmed with Stephen)

- **Aesthetic:** dark technical / terminal. Navy → black, greys, white, one accent.
- **3D centerpiece:** games-flavored, *show don't tell*. No system-architecture infographic —
  it's obvious a SWE builds APIs and queues. An endless procedural terrain flythrough with a
  steerable craft instead.
- **Content:** minimal. No resume bullet points — recruiters arrive here *from* the resume.
  No employer named, no job duties. Less text, more showing.
- **No dead links.** The 2019 student projects are retired.

## Plan

- [x] Extract content from 2025 bullet-point doc + 2021 resume PDF
- [x] Audit existing site (React 16 / CRA 3 / class components)
- [x] Confirm direction with Stephen
- [x] Toolchain: Vite 8 + React 19 + TypeScript, replacing CRA 3 / React 16
- [x] Global design tokens + dark technical styling
- [x] 3D hero: procedural terrain flythrough (`src/scene/`)
- [x] Sections: Hero / Stack / Contact / Footer
- [x] Konami-code easter egg
- [x] Nav + hash deep-linking
- [x] Accessibility pass
- [x] Build + verify
- [x] Retire dead links and old CRA files

## Review

### What changed

Complete rewrite. The old site was CRA 3 / React 16.8 class components, a fixed Unsplash
background, and five project cards whose demo links (surge.sh, heroku) have been dead for years.

**Toolchain** — CRA 3.0.1 → Vite 8, React 16.8 → 19.2, JS → TypeScript. Added `three`,
`@react-three/fiber`, `@react-three/drei`, `motion`. Deleted `build/` and all old components.
Deploy path unchanged (`npm run deploy` → `gh-pages -d dist`); `CNAME` moved to `public/` so
Vite copies it into the deploy output.

**The scene** — one plane displaced by 4-octave fbm in a vertex shader, sampled at
`worldPos + scrollOffset`, so the terrain is genuinely infinite and costs the CPU nothing per
frame. Grid lines are computed in the fragment shader from world coordinates so they flow over
the hills. Steerable craft with critically-damped follow and velocity-driven bank, autopilot on
idle. Instanced starfield that stretches to streaks in hyperspace (Konami).

**Content** — generic by design: technologies, nothing about where he works or what he does
there. Stack lists what's current rather than the 2019 bootcamp list (Ruby/Rails/Sequelize).

### Bugs found and fixed during verification

Three of these produced *no console error* and would have shipped as "the 3D just doesn't work":

1. **Terrain never drew.** `fwidth` failed to compile. three emits GLSL ES 1.00, and on a
   WebGL2 context derivatives are neither core there nor reachable via
   `GL_OES_standard_derivatives` — the extension isn't exposed at all. Verified both routes in
   an isolated WebGL harness before switching to `THREE.GLSL3`.
2. **Still didn't draw** — GLSL3 has no `gl_FragColor`, and three aliases only the
   `varying`/`attribute` keywords, so the fragment output needed declaring explicitly.
3. **The craft never drew.** `dt` is 0 on the first frame, so `(x - prevX) / dt` was `NaN`,
   which reached `rotation.z` and poisoned the matrix. The mesh kept its position, reported
   `visible: true`, and projected to correct screen coordinates — it simply stopped
   rasterising, and NaN never washes out. Fixed with a `frameDelta()` floor used by every
   frame loop.
4. **Stars were sub-pixel** — a fixed 0.6-unit segment is invisible at 600 units out. Tail
   length now scales with view depth.
5. **Craft rendered black** at `metalness: 0.65` with no environment map to reflect.
6. **Motion ignored `prefers-reduced-motion`** — CSS can't reach motion's inline styles, and
   every entrance starts at `opacity: 0`. Added `<MotionConfig reducedMotion="user">`.
7. **`#stack` deep links didn't scroll** — the browser resolves the fragment while the document
   is still an empty `#root`. Added `useHashLanding`.
8. Copy button had a live region nested inside it, folding "copied to clipboard" into its
   accessible name. Moved out, explicit `aria-label` added.

### Verification

- `npm run build` clean; no TypeScript errors; no console errors beyond an r3f-internal
  `THREE.Clock` deprecation warning.
- Scene verified visually: terrain, grid, starfield, craft all rendering.
- Section layout verified at desktop and narrow widths; `documentElement.scrollWidth ===
  innerWidth`, so no horizontal overflow.
- Reduced-motion path verified with `--force-prefers-reduced-motion`.

**Not verified end-to-end:** the headless Chrome available here suspends rAF under
`--virtual-time-budget`, so the frame loop only ever advanced 1–3 frames. Static composition
is confirmed, but the *animation over time* — terrain scroll, craft steering and banking,
autopilot handoff, hyperspace — has only been reasoned about, not watched. Worth 30 seconds in
a real browser (`npm run dev`) before deploying.

### Follow-ups

- `public/homeimg.png` is a stale 2020 asset, no longer referenced. Left in place (tracked,
  harmless) rather than deleted unasked.
- No OG preview image for link unfurls — that needs a real screenshot of the finished site.

## Round 2 — scroll choreography, particle field, performance

The steerable craft was cut (a small object over a landscape reads as a toy and
competes with the name), and the terrain went with it, replaced by a GPU
particle field morphing through five forms across four pinned acts.

### Performance — the biggest win was not the GPU

`useActProgress` ran a **separate rAF loop per act, each calling setState every
frame** — four React re-renders per frame, with the stack re-rendering four
groups and twelve items each time. Replaced by one shared rAF driver
(`scene/scrub.ts`) writing styles directly through refs. The page now renders
once and never again while scrolling.

Also: `background-attachment: fixed` → fixed pseudo-element (it repainted the
whole gradient every scroll frame); removed all 17 `backdrop-filter` blurs, which
were compositing over a live canvas; `antialias: false`; DPR capped at 1.5;
particle counts kept low (30k/18k/9k) because a point cloud is fill-rate bound;
max `gl_PointSize` 3.4. Added `scene/Governor.tsx` — watches real frame times and
steps resolution down on devices that cannot hold budget.

### Bugs found

1. Particles rendered invisible — not alpha, **colour**. Blue at ~0.2 alpha on a
   dark navy background has almost no chromatic separation. Isolated by forcing
   magenta at identical alpha, which was clearly visible.
2. Colour management: `new THREE.Color('#5ea9ff')` converts sRGB→linear, but a
   raw ShaderMaterial gets no `<colorspace_fragment>` include and never converts
   back. Colours are now authored in linear directly.
3. **Deep links landed on a blank screen.** Acts are pinned, so `#stack` targets
   progress 0 — before any content reveals. Fixed by targeting a point inside the
   act and compressing the stagger to finish by p=0.36 (verified numerically).
4. Scroll-driven content started at `opacity: 0`, so any failure of the animation
   layer blanked the page. Now visible by default and scrubbed from there.

### Content

Stack cut 16 → 12 and grouped. Dropped Git, REST, SQL, Linux — all assumed, and
listing assumed things dilutes what isn't. Removed the invented `ALT 0420 m` HUD:
fake telemetry corresponding to nothing.

### Still not verified

Headless Chrome here suspends rAF and mangles `position: fixed` on scrolled
captures, so **no scrolled state has been seen**. The choreography, cursor ripple
and velocity smear are reasoned about and numerically checked, not watched.

## Round 3 — readability

Reported: sections "disappear too fast", "may not show up at the right time",
"almost completely transparent before I even get to it".

**Cause was structural, not tuning.** Acts are sticky, so during a handover two
are on screen at once — the outgoing act's pinned child is sliding up while the
incoming one has already pinned below it. But `timeline` counts only *pinned*
travel, so at scroll 1.7vh:

    act 1 child -> screen [-0.5vh, 0.5vh]   visible, progress 1.0 -> opacity 0
    act 2 child -> screen [ 0.5vh, 1.5vh]   visible, progress 0.0 -> opacity 0

Both on screen, both invisible. Gating legibility on scroll progress was the
wrong model.

**Fix:** content reveals once on entering the viewport (IntersectionObserver, CSS
transition, `--i` stagger) and stays readable until it physically scrolls off.
Scroll drives the particle field and nothing about whether text can be read.
Reveal is visible by default with a 1.5s failsafe, so a failed observer can never
blank a section.

Deleted `scene/scrub.ts`, `hooks/useScrub.ts`, and the now-orphaned `Hero.tsx`
and `Contact.tsx`. With content no longer scroll-driven, the per-frame DOM-writing
layer was dead code.

Added a one-gradient scrim under pinned content — the field is bright and uniform
enough to compete with type, and a gradient buys contrast with no blur and no
extra per-frame compositing.
