# Lessons

## Never kill Windows processes by image name from WSL

**What happened.** A screenshot helper ran
`taskkill.exe /F /IM chrome.exe /T` before each capture, to clear headless
instances that might hold a profile lock. `/IM` matches by *image name*, so it
killed every `chrome.exe` on the host — Stephen's real browser, all tabs, all
windows — on every screenshot. He spent a long session debugging "Chrome
crashes" that were my terminations. He diagnosed it himself from Windows 4688
audit events, uniform exit status 1, and absent Crashpad dumps.

I did the same thing with `taskkill /F /IM node.exe /T` to clear stuck preview
servers, which killed his running `npm run dev`.

**Why it was wrong beyond the blast radius.** The kill was also redundant. The
next line already allocated a fresh profile directory per run
(`prof-$$-$RANDOM`), and a stray process cannot hold a lock on a directory that
does not exist yet. Verified after removal: three back-to-back captures, all
succeeded. It bought nothing and cost him his browser.

**Rules for myself.**

1. From WSL, `taskkill /IM <name>` and `Stop-Process -Name <name>` reach the
   user's real applications. Never match by image name. Never assume a process
   name belongs to me.
2. Kill only PIDs I spawned and still hold a handle to. If I cannot name the
   exact PID, I do not kill it.
3. If cleanup genuinely needs to find strays, filter on something that is
   provably mine — e.g. only processes whose command line references my own
   temp profile root:
   `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
    Where-Object { $_.CommandLine -like '*\Temp\pf\*' }`
4. Prefer designs that make cleanup unnecessary. A fresh profile per run
   removed the need for any kill at all. Isolation beats cleanup.
5. Before adding a destructive step to tooling, ask what it protects against and
   whether something already handles it. Here, something already did.

**Generalisation.** WSL tooling reaches out of the sandbox onto the user's real
desktop. Anything that terminates, deletes, or overwrites by *name* or *pattern*
rather than by an identity I created is a candidate for the same bug — including
`pkill -f`, `rm` on `/mnt/c` paths, and killing by port.

## Verify in the real environment, not just the harness

The headless browser here suspends rAF and mangles `position: fixed` on scrolled
captures. Two shipped bugs (content invisible during sticky-act handover, deep
links landing on blank screens) lived precisely in the states the harness could
not render. When the harness cannot show a state, say so plainly and ask for a
real-browser check — do not let a green build imply the feature works.

## Don't let one value drive two unrelated things

The particle field silently turned white. `vGlow` drove *both* brightness and the
colour mix `mix(uColorFar, uColorNear, vGlow)`. Fixing a visibility problem meant
raising vGlow, which dragged nearly every particle onto the near colour — so a
brightness fix became an unannounced theme change, and Stephen had to spot it.

Rule: when one variable feeds two outputs, changing it for one reason silently
changes the other. Give them separate inputs, or bias the coupling deliberately
(here: `pow(vGlow, 2.2)` for hue, raw `vGlow` for brightness).

Corollary: after tuning something for a functional reason, check what else reads
that value before calling it done.

## Relative and absolute thresholds fail in opposite directions

The field's quality governor called any frame over a fixed 22ms slow. That assumed
a 60Hz display, so on a 30Hz panel it flagged *every* frame and ratcheted the
resolution to its floor in 2.2 seconds — for nothing, since the panel, not the GPU,
was the constraint. The obvious fix was to measure the display's actual cadence and
flag frames relative to it.

That fix quietly broke the other half. A device that is *uniformly* slow calibrates
its own slowness as the baseline and then reports every frame as normal, so a
machine stuck at 25fps — which the crude 22ms rule did catch — sailed past. I only
found it because I simulated the new code against a "genuinely slow GPU" case
instead of only re-running the cases that motivated the change.

Rule: a relative threshold trades false positives for false negatives. When
replacing an absolute test with a relative one, keep both — the relative test for
"worse than this machine's normal", the absolute for "bad by any standard" — and
clamp the measured baseline so the thing being measured cannot inflate its own
threshold.

Corollary for verification: when a change fixes case A, the test set has to include
the case the *old* code got right, not just the case that prompted the change.

## Removing the broken thing is not the same as solving the problem

The act scrim banded into visible concentric rings, so I removed it and replaced it
with a text-shadow halo — which fixed the banding perfectly, measured well on
contrast, and was wrong. Stephen's reaction was immediate: the type now floated on
the field with nothing under it. A halo is invisible by design; it does legibility,
not composition. The scrim was doing a *second* job I had not accounted for —
giving the text something to sit on — and my contrast numbers could not see it,
because contrast ratios do not measure whether a layout reads as deliberate.

Rule: before deleting an element that has a defect, separate what is broken about
it from what it was for. Here the defect was the gradient's *shape* (a percentage-
sized ellipse that banded and reflowed with the viewport), not its existence. The
right fix was to keep the scrim and change the shape — vertical, subtler, dithered.

Corollary: a measurement that improves is not proof the change is good. 16.6:1 vs
15.6:1 said the halo was strictly better on the axis I had chosen to measure, which
made it easy to miss that I had picked the wrong axis.

## Don't hand-author "linear" colour values

Chasing a colour-management issue, I replaced `new THREE.Color('#5ea9ff')` with
hand-written `setRGB(0.62, 0.82, 1.0, LinearSRGBColorSpace)` — but 0.62/0.82/1.0
*are the sRGB numbers*. The true linear value is (0.112, 0.397, 1.000). Red came
out 5.5x too high, and high red next to high green/blue is exactly what turns a
navy pastel. The field went white and Stephen had to raise it twice.

Rule: let the library convert. `new THREE.Color('#rrggbb')` applies sRGB->linear
correctly; typing linear values by hand means doing a 2.4-power transform in my
head, and eyeballed numbers will come out sRGB every time.

If a shader genuinely needs a linear constant, compute it, don't guess:
`c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4` per channel.

Also: reference the design tokens. These uniforms now use the same `#5ea9ff` /
`#2f6fd0` as the CSS `--accent` / `--accent-deep`, so the 3D scene and the page
cannot drift apart.

## Gradient stops interpolate linearly — that is a visible artifact, not a detail

A scrim faded with two stops (`transparent 0%` → `.55 26%`) read as a hard line
across the page. I had assumed any visible edge in a gradient was 8-bit banding and
went straight to dithering. It was not: CSS interpolates linearly between stops, so
the ramp holds one constant slope and then changes to another *instantly* where it
meets the flat section. The eye detects slope discontinuities strongly (Mach
banding), and it happens at any colour depth — dithering cannot touch it.

Rule: a soft fade needs its *slope* to be continuous, not just its value. Sample an
easing curve at several stops — smoothstep reaches both ends with zero slope, so it
joins a flat region without a kink. Two stops is a ramp, not a fade.

And: two different artifacts can look identical. Banding is quantisation, Mach
banding is perceptual. Before reaching for the fix, work out which one is present —
here both were, and fixing only the one I assumed left the symptom in place.

Corollary on measurement: my dither model treated `feTurbulence` as uniform noise
over 0–255. Real `fractalNoise` clusters near mid-grey, so the actual amplitude was
~2.5x smaller than modelled and dithered nothing. When simulating something whose
distribution I have not verified, the assumed distribution is the weakest part of
the result — say so, rather than reporting the number as measured.
