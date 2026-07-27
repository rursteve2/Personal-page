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
