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

## Round 4 — quality governor ratchet, pointer lag

Reported: scrolling down and back up permanently degrades the dots and the
animation; the pointer hover effect feels laggy.

### RCA 1 — the governor measures the wrong quantity, and never recovers

`Field.tsx` steps `dprScale` down whenever 45 net frames exceed 22ms, and by
design never steps back up. Simulated against the real constants:

| Condition | Result |
|---|---|
| 60Hz clean | stays at 1.00 |
| 60Hz, ~55% of frames hitching during scroll | floor (0.55) after 17.8s |
| Display capped at 30Hz (battery saver) | floor (0.55) after 2.2s |

Down-and-back-up through eight screens is well over 20s of the middle row.

At the floor on desktop (`maxDpr` 1.75) the effective DPR is 0.963 — the canvas
renders *below* one device pixel per CSS pixel and is upscaled. Because
`gl_PointSize = sizeCss * uPixelRatio`, the points shrink with it: a typical
particle goes from ~3.7 device px across to ~2.0 (55% of the diameter, 30% of the
area), and the smallest fall under 1px and vanish into the radial falloff. That
double hit is why it reads as the dots losing quality, not just softness.

The root problem is that `dt` is the interval *between* rAF callbacks — set by
the display refresh rate and main-thread congestion, not by GPU cost. Lowering
render resolution cannot fix either. The fixed 22ms threshold silently assumes a
60Hz display. At 1512x900 the scene draws ~30k points / ~630k fragments a frame,
which is nowhere near fill-rate bound; the `Field.tsx:36` comment predates the
three.js removal.

Two main-thread jank sources feeding it, both on the scroll path:

1. `useSceneInput` read `documentElement.scrollHeight` on **every scroll event** —
   a forced synchronous layout, and four sticky pins keep layout dirty.
2. Five selectors carried permanent `will-change: transform, opacity`, but
   `.reveal` is a one-shot transition — after it completes the promotion is pure
   cost, including `.hero__title` at up to 9.5rem.

### RCA 2 — pointer lag is tuning, not performance

`damp` reaches 95% at `3/lambda` seconds. Position ran at lambda 8 (**375ms** to
catch up); strength at lambda 3 (**1000ms** to ramp in from zero). Since `wanted`
drops to 0 after 2.5s of stillness, intermittent movement never reached full
strength. The event path itself is clean — passive listener, plain fields, no
React render.

### Plan

- [x] Governor: derive the slow-frame threshold from observed display cadence
      (20th percentile, ~1.6x) instead of a hardcoded 22ms
- [x] Governor: 2s cooldown after any step, so it cannot cascade three steps in 2.2s
- [x] Governor: allow recovery — step up 0.1 (vs 0.2 down) after a sustained clean
      run, cap the down/up cycles then latch, keeping the anti-oscillation intent
- [x] Governor: clamp the floor so `maxDpr * dprScale >= 1.0` — never render below
      CSS resolution
- [x] `useSceneInput`: cache `scrollHeight - innerHeight` in `measure()`
- [x] `global.css`: move `will-change` onto `[data-revealed='false'] .reveal` only
- [x] Pointer: position lambda 8 -> 20; strength asymmetric, 12 rising / 2 falling
- [x] Debug hook so governor steps are observable in a real browser
- [x] `npm run build` clean; bundle size roughly unchanged

### Bug found while verifying the fix

The relative threshold on its own **introduced a false negative**. A device that is
*uniformly* slow calibrates its own slowness as the baseline and then reports every
frame as normal — so a sustained 40ms/frame machine, which the old fixed 22ms
threshold did catch, sailed straight past the new one. The governor would have
stopped protecting exactly the devices it exists for.

Fixed with a second, absolute test (`ABSOLUTE_SLOW_MS = 36`), plus clamping the
measured baseline to `MAX_REFRESH_MS = 34` so our own slowness cannot inflate the
relative threshold. 36ms sits just above 30Hz's 33.3ms, so the slowest real display
cadence is still not mistaken for a struggling one.

Lesson: replacing an absolute threshold with a relative one trades false positives
for false negatives. Both tests are needed — they fail in opposite directions.

### Simulated against the constants read out of the source

| Scenario | Before | After |
|---|---|---|
| 60Hz clean | 1.00 | 1.00 |
| 120Hz clean | 1.00 | 1.00 |
| 30Hz display (battery saver) | **floor in 2.2s** | 1.00 |
| 60Hz, 55% jank over a 20s scroll, then calm | **floor, permanent** | dips to 0.57, recovers to 0.87 |
| Sustained 40ms frames, desktop | floor (eff. dpr 0.96) | floor (eff. dpr **1.00**) |
| Sustained 40ms frames, mobile | floor (eff. dpr 1.65) | floor (eff. dpr 1.65) |
| Tab backgrounded 5s mid-run | counted as slow | ignored |

### Pointer

`damp` reaches 95% in `3/lambda` s. Position 375ms → **150ms**; strength ramp-in
1000ms → **250ms**, with the fade-out deliberately slowed 1000ms → 1500ms so the
"no permanent dent" behaviour is unchanged and the effect never pops.

### Verification

- `npm run build` clean, no TypeScript errors. 68.35 → 68.71 kB gzipped (+0.36 kB);
  CSS unchanged at 2.98 kB.
- Production bundle contains no `console.debug` and none of the debug strings —
  the `import.meta.env.DEV` branch is dead-code eliminated. Present in the dev
  transform, so it is available via `npm run dev`.
- `will-change` appears in the built CSS only in the two state-scoped rules.
- All changed modules transform and serve cleanly through the dev server.

**Not verified in a real browser (round 4).** Same limitation as every previous round: the
headless browser here suspends rAF, and a governor that acts on frame cadence is
precisely what that cannot exercise. Run `npm run dev`, scroll down and back up,
and watch the console — `[field] quality down/up → …` lines show every step, the
measured threshold, and the effective DPR. No lines at all is the expected result
on healthy hardware.

## Round 5 — gradient banding ("circles like a solar system")

Reported: concentric circles on each block of text, more prominent after round 4.

### RCA — 8-bit banding in the act scrim

`.act__pin::before` was a full-pin radial gradient, `rgba(4,6,11,.88)` → `.55` at
34% → transparent at 68%. Rendered and measured: **19 concentric rings along one
ray, spaced ~45px**, one set per act — hence "on each block of text".

Ring spacing is `(1/255) ÷ (rate of alpha change)`. A large, soft gradient spreads
256 steps over hundreds of pixels, so every step is a wide, visible ring. The
counterintuitive consequence: **making a gradient gentler makes banding worse**,
and lowering its alpha does too, because the same distance is then covered by
fewer steps. Only steepening or dithering helps.

Round 4 did not create this — it revealed it. Rings scale with how bright the
backdrop is:

| Field brightness | 0 | dim | moderate | bright |
|---|---|---|---|---|
| Rings | 0 | 6 | 19 | 40 |

The old governor was pinning DPR at 0.55 as soon as you scrolled, leaving the
field dim and blurry, which masked the steps. Fixing it restored the brightness
and the rings came with it.

### Was the scrim needed?

Partly. `--ink` over the field, no scrim: 17.9:1 on bare sky, 9.5:1 at moderate
density, but **2.2:1 against a saturated cluster — fails AA**. So darkening earns
its place, but only where the field piles up behind type, which is a *local*
problem being solved with a page-sized gradient.

### Also reported: the circles changed shape between desktop and mobile

Confirmed, and it follows from the same rule. Every number in that gradient was a
percentage of the pin box, so the ellipse reflowed with the viewport's aspect:

| Viewport | rx × ry | Aspect | Centre |
|---|---|---|---|
| Desktop 1512×900 | 1966 × 810 | 2.43 | 333, 702 |
| Tablet 834×1112 | 1084 × 1001 | 1.08 | 183, 867 |
| Phone 390×844 | 507 × 760 | 0.67 | 86, 658 |

Not one design adapting to screen size — a different shape on every device.

### Fix

First attempt removed the scrim entirely in favour of a text-shadow halo. Stephen
pushed back: the text does need a visible backdrop, just a subtle one. Correct
call — a halo alone is invisible, so the type ended up floating on the field with
nothing under it. Final shape:

- **`.act__pin::before` restored, but vertical instead of radial.** A vertical
  gradient depends only on height and the pin is always `100svh`, so it is
  proportionally identical on every viewport — the desktop/mobile inconsistency
  cannot recur. Transparent at both ends, because pinned acts tile against each
  other and a hard edge would draw a seam at every handover.
- **Peak alpha 0.88 → 0.55.** The halo covers the brightest clusters, so the scrim
  only has to read as a backdrop, not carry the contrast.
- **`--halo` kept but tightened** (16/40px → 10/24px, lower alphas) since it is now
  under a scrim rather than replacing one. Inherited from `.act__pin`, with an
  explicit rule for `a`/`button`, and the same on `.footer`.
- **`--dither` extracted to a token** and applied to both the scrim and
  `body::before`. Geometry cannot fix banding — searched radius and alpha
  combinations for the body glow and the best was still 16px, because lowering
  alpha spreads *fewer* steps over the same distance. Measured: widest flat band
  in the fades **→ 1px** at every pin height tested, for ~1 level of grain.

Contrast, `--ink` against a saturated cluster: bare 2.2:1, scrim alone 7.4:1,
scrim + halo **17.2:1**.

### Verification

- Rendered both gradients to PNG at 1:1 and inspected: the rings are visible in
  the before, absent in the after.
- Built CSS confirmed: no `act__pin::before`, no `130% 90%` gradient; `--halo`,
  the noise tile and `background-size: 120px 120px, auto, auto` all present.
- Inline SVG validated as well-formed; 276 chars in the data URI.
- `npm run build` clean. CSS 2.98 → 3.20 kB gzipped (+0.22 kB); JS unchanged.

**Not verified in a real browser.** The renders are a simulation of the CSS, not a
screenshot of the page — and this round is purely a looks call. Worth 30 seconds
in `npm run dev` to confirm the type still reads well against the field now that
the wash is gone, particularly on `launch`, where the largest type sits over the
densest part of the cloud.

### Round 5, third pass — halo removed, fade eased

Reported: "bubbling around all the text", and the fade reading "in lines".

**The bubbling was the halo.** With the scrim restored it was doing a job nothing
needed doing — dark blobs tracking each glyph on large display type. Removed
entirely (`--halo` and all three uses). The scrim alone holds AA at every field
density: 18.0:1 on bare sky down to **7.4:1 against a saturated cluster**. The
footer loses it too, which returns it to exactly its pre-round-5 state — the old
radial scrim never covered the footer either, so this is not a regression.

**The lines were two things, and I had only fixed one.**

1. *Mach banding*, which I missed entirely. CSS interpolates linearly between
   gradient stops, so a two-stop fade holds one constant slope and then switches
   to another instantly where it meets the flat section. The eye reads that slope
   discontinuity as a hard line — it is a perceptual artifact and shows up even
   with no quantisation left to see. Fixed by sampling smoothstep at seven points
   per fade: smoothstep arrives at both ends with zero slope, so it meets the flat
   section without a kink. Discontinuity at that junction **2.12 → 0.82, 61%
   smaller**.
2. *A dither that was too weak.* The round-5 measurement modelled feTurbulence as
   uniform noise over 0–255 with uniform alpha. Real `fractalNoise` clusters
   tightly around mid-grey with a near-random alpha, so the true amplitude was
   roughly 2.5x smaller than modelled — under one 8-bit step, which dithers
   nothing. Fixed with a `feColorMatrix` stretching 4x about 0.5 and pinning alpha
   to 1, plus `color-interpolation-filters='sRGB'` (filters default to linearRGB,
   which would put the noise somewhere other than where the numbers say).

CSS 3.26 → 3.31 kB gzipped; JS unchanged. No `text-shadow` left in the bundle.

**Unverified:** the dither strength (`opacity 0.022`). feTurbulence's actual output
distribution is implementation-defined and cannot be measured from here — it is an
estimate, and the one number in this round that wants a real screen.

### Round 5, fourth pass — black page, original darkness restored

Reported: the backdrop reads grey and washed; the deployed page's *darkness* was
right, only the circles were wrong; make the whole page black.

**The grey was arithmetic, not taste.** The scrim was `rgba(4, 6, 11, .55)`. Over
pure black that plateau settles at `rgb(2.2, 3.3, 6.1)` — a floor it can never get
below, because the scrim's own colour is not black and 45% of the field still shows
through. So the text sat on a visibly lighter slab laid over the page. Restored to
`rgba(0, 0, 0, .88)`: the original opacity, in the page's own black. The plateau now
settles at `rgb(0, 0, 0)`, identical to the background, so the text blends into it
and only the fades are visible at all. Worst-case contrast improved as a side
effect, 7.4:1 → **16.5:1**.

**Page is now black.**

- `--void` `#05070d` → `#000000`.
- **`body::before` deleted.** It carried a navy vertical gradient (`#04060b` →
  `#070b14` → `#05070d`) and a blue radial glow — between them, the reason the page
  never looked black. Removing it also removes the last large soft gradient that
  could band, and the layer itself; a flat background colour repaints nothing on
  scroll, so the reason the pseudo-element existed no longer applies.
- Nav scrim and the Konami toast converted from `rgba(4,6,11,…)` / `rgba(5,7,13,…)`
  to black.

The field is additive, so it reads better against true black than it did against
`#05070d` — nothing was carrying colour except the glow that is now gone.

CSS 3.31 → **3.22 kB** gzipped, smaller than before this round started, since
`body::before` and its dither layer both went. JS unchanged.

**Left alone:** `--deep` and `--panel` are still navy and now have zero uses — dead
before this round, dead after. Not deleted unasked, but they will reintroduce navy
if anything ever picks them up.

### Round 5, fifth pass — the grey was the dither

Reported: black background perfect, but the text backdrop is still a grey, almost
opaque panel.

**Cause: the noise dither, layered over the whole pin.** Its alpha is pinned to 1
and its mean is mid-grey, so at `opacity 0.022` over pure black it settles at
`rgb(3, 3, 3)`. Invisible against a lit field — but in the plateau the field is
knocked down to 12%, so over empty sky that veil was the brightest thing left and
the backdrop read as a flat grey slab. The scrim itself was correct all along;
`#000000e0` in the built CSS is exactly the 0.88 pure black intended.

**Removed, and it is no longer needed.** Banding requires a smooth backdrop to show
on. The page behind the scrim is now pure black plus discrete particles, and black
under a black gradient stays exactly black at every stop — measured 0px of banding.
Where the field is bright enough to band at all, steps are 5–12px, already
invisible. The case that genuinely required dithering was `body::before`'s smooth
gradient, deleted in the previous pass.

The plateau now composites to exactly `rgb(0, 0, 0)` over empty sky — identical to
the page background, which is what "match the black background" asked for.

`--dither` / `--dither-size` deleted; nothing else referenced them.

CSS **3.22 → 2.93 kB** gzipped — below the 2.98 kB it started at before any of the
banding work. JS unchanged.

### Where round 5 landed

Net effect of five passes on `.act__pin::before`: same element, doing the same job,
with the ellipse replaced by a vertical smoothstep gradient in pure black at the
original 0.88. The three defects that were actually present — concentric ring
banding, reflowing with viewport aspect, and a non-black colour that could not
reach the page's own black — are gone. Everything I added along the way to
compensate (halo, dither) turned out to be scaffolding and is gone too.
