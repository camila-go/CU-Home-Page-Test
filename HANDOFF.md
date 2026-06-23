# Developer Handoff — Capella University Homepage

Engineering notes for anyone picking up this build. Covers the toolchain, the
animation system, responsive behavior, accessibility, asset handling, and the
edge cases / gotchas that aren't obvious from the code alone.

> See also: [`README.md`](README.md) for the quick-start.

---

## 1. Stack & tooling

| Thing | Detail |
| --- | --- |
| Build tool | [Vite 6](https://vitejs.dev) (`vite`, `vite build`, `vite preview`) |
| Language | Vanilla HTML + CSS + ES modules. **No framework, no CSS preprocessor.** |
| JS deps | None used at runtime. `vanilla-tilt` is still in `package.json` but **no longer imported** (the 3D tilt was removed — popular-program cards now use a CSS-only hover scale). Safe to `npm uninstall vanilla-tilt`. |
| Icons | Font Awesome Kit loaded via `<script src="https://kit.fontawesome.com/...">` in `<head>` |
| Fonts | Adobe Typekit (`acumin-pro-extra-condensed`, `acumin-pro`) + Google Fonts (`Inter`) |
| Dev server | `npm run dev` → http://localhost:5173 |

```bash
npm install
npm run dev      # local dev w/ HMR
npm run build    # production build → dist/
npm run preview  # serve the production build
```

`vite.config.js` is intentionally minimal (`root: '.'`). If this is ever
deployed under a sub-path (e.g. GitHub Pages project site), set `base` in
`vite.config.js` **and** note the absolute `/assets/...` paths below.

---

## 2. Project structure

```
index.html        # All page markup (single page)
css/
  tokens.css      # Design tokens (colors, type scale, spacing, easings) — imported first
  styles.css      # All component styles, mobile-first with desktop overrides
js/
  main.js         # All interactivity + animations (init* functions)
public/
  assets/         # Images, SVGs (served from /assets/... at runtime)
```

- `public/` is Vite's static dir, so files there are referenced with an
  **absolute path** (`/assets/hero.png`), not a relative one. Don't "fix" these
  to `./assets/...` — that will break the production build.
- `css/tokens.css` is `@import`-ed at the top of `styles.css`. All design
  primitives (color, type scale, radii, durations, easing curves) live there.
  Prefer adding/modifying tokens over hard-coded values.

---

## 3. Assets — read before touching images

- **Cache-busting query strings:** Some `<img src>` values carry `?v=N`
  (e.g. `carousel-portrait-alumni.png?v=8`). These were bumped each time an
  asset on disk was replaced to defeat browser/Vite caching. If you replace one
  of these images, **bump the number**.
- **Kenny (alumni portrait) is a transparent PNG.** It must stay a true
  transparent PNG. A prior version got silently flattened to a JPEG with a baked
  black background during an export/upload step, which looked broken on the
  dark card. If you see a black box behind him, the asset itself is wrong — not
  the CSS. Verify with `file public/assets/carousel-portrait-alumni.png` and
  `sips -g all <file>`.
- **Asset aspect ratios are tuned to their CSS slots.** The carousel portrait
  crops rely on each asset's ratio being close to its slot ratio (so
  `object-position: bottom` doesn't clip heads, and the alumni `object-fit: fill`
  doesn't visibly warp). Swapping in an asset with a very different aspect ratio
  will reintroduce warping/clipping — re-check the carousel at all breakpoints.
- **Figma-sourced assets expire.** Original art was pulled via Figma MCP URLs
  that expire (~7 days). The committed copies in `public/assets/` are the source
  of truth now; don't expect the Figma URLs to still resolve.
- **Responsive CTA art:** the closing "what are you waiting for?" section uses a
  `<picture>` with `cta-mobile.png` (≤768px) and `cta-people.png` (desktop).

---

## 4. Responsive breakpoints

Mobile-first base styles, with these override breakpoints (see `styles.css`):

| Breakpoint | Purpose |
| --- | --- |
| `max-width: 768px` | Mobile layout: stacked nav + mobile header, sticky utility bar, mobile type sizes, mobile carousel coordinates, **program-finder top stacks (title above chips)** |
| `max-width: 1023px` | **Phone/tablet carousel layout** (fixed `294 × 583` aspect card, absolutely-positioned elements scaled via container query) |
| `max-width: 1024px` | Tablet: hamburger nav, **program-finder top is the row layout** (title beside 2×2 chips) |
| `min-width: 769px and max-width: 1199px` | **Tablet/small-desktop hero**: hero gets extra height (reserve 330, capped 640) + higher image crop (`object-position: center 22%`) so the headline clears the people's faces; the program finder (row layout) is short enough to allow it |
| `min-width: 1024px` | **Wide carousel layout** (`1440 × 642` card, Kenny/faculty overflow above the card) |
| `min-width: 1200px` | Desktop refinements: hero capped at **755px** (Figma) + 4-across program-finder chips, content-band bg crop, etc. |
| `max-width: 1280px` / `min-width: 1920px` | `--page-gutter` adjustments only (in `tokens.css`) |

⚠️ **The 1023 / 1024 boundary is load-bearing for the carousel.** The phone and
wide carousel layouts are mutually exclusive and split exactly here. If you
shift this boundary, audit both carousel layouts — they use different
positioning systems (see §6).

---

## 5. Sticky header — edge cases

Two stacked sticky elements, on **both** mobile and desktop:

- `.utility-bar` → `position: sticky; top: 0; z-index: 101;` (height **40px**)
- `.main-nav` → `position: sticky; top: 40px; z-index: 100;`

The `top: 40px` on the nav is intentional — it pins the nav directly **below**
the 40px utility bar so both stay visible while scrolling. If you change the
utility bar height, **update the nav's `top` to match** (base rule + the
`≤768px` override both set this).

`initNavScroll()` toggles `.main-nav--scrolled` after 24px of scroll (shrinks
the nav). `z-index: 100/101` on the header sits above the parallax band
(`z-index: 1`) and carousel content — keep new stacking contexts below 100.

### Hero height is "fill the fold" (keeps the program finder above the fold)

The hero's `min-height` is **not** a fixed value — it's
`max(<floor>, min(<cap>, calc(100svh - var(--hero-fold-reserve))))`. The hero
fills the viewport minus the sticky header above it and the program-finder top
row below it, so the program finder is always above the fold. `--hero-fold-reserve`
is tuned per breakpoint (≈ header + program-finder top area). On desktop
(`≥1200px`) the cap is **755px** (the Figma hero height at 1920); on
`769–1199px` the hero is allowed to grow (cap 640) so the headline clears the
people. Uses `svh` so mobile browser chrome doesn't break it. If you change the
header height, re-tune the reserve values (search `--hero-fold-reserve`).

---

## 6. Carousel — the trickiest component

`initCarousel()` in `main.js`. Pointer-based drag/swipe with snap.

- **Drag vs. scroll intent:** the first few px of a pointer move decide whether
  the gesture is horizontal (carousel drag) or vertical (let the page scroll).
  Don't remove the `Math.abs(dx) > Math.abs(dy)` check or vertical scrolling
  breaks on touch.
- **Click suppression:** a real drag sets `moved`, and a capture-phase `click`
  handler cancels the click so links/buttons inside a slide don't fire after a
  swipe. Keep this if you add interactive elements to slides.
- **Two layout systems, by breakpoint:**
  - **≤1023px:** card is a fixed `294 × 583` aspect box. Children are
    absolutely positioned using a container-query unit:
    `--px: calc(100cqi / 294)`, e.g. `top: calc(284 * var(--px))`. This keeps the
    card from ballooning in height on narrow screens. Coordinates map directly
    to Figma pixel values.
    - **Don't use fluid font scaling for the card body text here** — it was
      capped to a fixed size because large fluid text overflowed the fixed-height
      card.
  - **≥1024px:** card is `1440 × 642` aspect with `overflow: visible`, so the
    portrait figures intentionally **extend above** the card top.
    - **Content is anchored to exact Figma coordinates**, not flex gaps. Each
      slide's content (`--student` / `--alumni` / `--faculty` modifier on
      `.carousel__content`) absolutely positions its title / body / attribution /
      button at the Figma `y` (e.g. faculty title `184`, attribution `348`,
      button `472`) via the `--px` unit. This avoids vertical drift from
      accumulated line-height.
    - **Buttons** ("Button text", "Full bio") are scaled to the Figma `60px`
      pill (`padding 16/28`, `font 20`, `radius 32`) via `--px` — do **not** let
      them fall back to the unscaled `.btn--lg`, which stretches full-width.
    - **Portrait sizing.** The shared `.carousel__portrait` box is the literal
      Figma slot (`x84 y0 741×642`) with **no** scale. **Faculty** uses its own
      exact dims (`x60 y-15 660×657`, no scale) — do not let it inherit a scale
      or it renders ~17% too big. **Alumni** alone adds `scale: 1.17` + `top:
      -3rem` to match the design's zoomed-in framing of Kenny (head/torso
      prominent, rising above the card). The scale is intentionally
      alumni-scoped — keep it off the base rule so faculty stays correct.
- **People are bottom-anchored at every width.** Portrait containers pin to the
  card's bottom edge, and the images use `object-position: center bottom`. The
  alumni image uniquely uses `object-fit: fill` (its ratio matches the slot, so
  it fills without visible warp); everything else uses `object-fit: cover`.
  If figures float off the bottom after an edit, check these two properties.
- `goTo(activeIndex, false)` re-runs on `resize` to recompute the step width.

---

## 7. Animations & microinteractions

All live in `main.js`, initialized on `DOMContentLoaded`. Every one is
**gated on `prefers-reduced-motion`** (see §8).

| Function | What it does | Trigger |
| --- | --- | --- |
| `initTextReveal()` | Splits target headings into per-word spans (`.word` mask + `.word__inner`) that rise up from behind a clip mask, staggered via `--word-index`. | IntersectionObserver (per heading) |
| `initRevealAnimations()` | Fade-up for elements with `.reveal`. Optional stagger via `data-reveal-delay="N"` (× 80ms). | IntersectionObserver |
| `initCountUp()` | Animates the stats numbers (40 / 80 / 1,530+ / 63%) counting up with a custom cubic-bezier ease. Preserves prefixes/suffixes/grouping. | IntersectionObserver (threshold 0.4) |
| `initParallax()` | Translates the content-band background image on scroll for depth. | `scroll`/`resize`, throttled with `requestAnimationFrame` |
| Card hover scale | CSS-only `transform: scale(1.02)` on `.stats-section__program:hover` (replaced the removed VanillaTilt 3D tilt — it caused a "jiggle"). Disabled under reduced-motion. | hover |
| Glass shine | CSS-only diagonal sheen sweep on `.glass-card:hover` (`::before`). | hover |

> **Removed:** `initTilt()` / VanillaTilt. The cursor-following 3D tilt on the
> popular-program cards read as a jiggle and was replaced by the CSS hover scale
> above. The dependency is still in `package.json` but unused (§1).

### Text-reveal details / gotchas
- Headings that get the effect are listed in `TEXT_REVEAL_SELECTORS`. To add
  one, append its selector — `splitWords()` preserves `<br>` line breaks and
  inter-word spacing automatically.
- **Carousel titles are intentionally excluded** — they contain a decorative
  quote-mark span and live in an absolutely-positioned layout, so word-splitting
  would break them.
- `.word` uses `overflow: hidden` with `padding-bottom: 0.12em` +
  `margin-bottom: -0.12em` so the clip mask has room for descenders without
  shifting layout. Keep this if you change heading line-heights.

### Parallax details / gotchas
- The bg image has built-in **vertical overshoot** (`height: 116%; top: -8%`),
  giving the transform room to move without exposing a band edge.
- JS amplitude (`rect.height * 0.06`) is deliberately **less than** the 8% CSS
  overshoot. If you increase the amplitude, increase the overshoot too or the
  band edge will show.
- **The desk image starts partway down the band, not at the top.** Per Figma the
  "Content Section Background Image" begins ~lower-third of the carousel, so
  `.content-band__bg` is offset (`top: var(--content-bg-top, 26%)`) with a top
  mask fade — the area above stays page-black. Adjust `--content-bg-top` to move
  the desk's start up/down.

---

## 8. Accessibility notes

- **Reduced motion:** `prefers-reduced-motion: reduce` is honored everywhere.
  - JS: each `init*` animation early-returns or jumps to the final state. Text
    reveals render fully visible; counters skip to final values; parallax/tilt
    are disabled.
  - CSS: a `@media (prefers-reduced-motion: reduce)` block neutralizes `.reveal`,
    `.reveal-text .word__inner`, and the glass-card sheen.
  - **When adding any new animation, add both the JS guard and (if CSS-driven) a
    reduced-motion override.** This is a hard requirement for this project.
- **Screen readers & split text:** `splitWords()` keeps real space text nodes
  between words, so headings still read as normal sentences. Don't strip the
  whitespace nodes.
- **Semantics already in place:**
  - Carousel dots are `role="tab"` with `aria-selected`; the viewport is
    keyboard-focusable (`tabindex=0`) with ←/→ arrow support.
  - Program-finder chips are `role="tab"` controlling a `role="tabpanel"` that is
    `hidden` until expanded.
  - Mobile menu button uses `aria-expanded` / `aria-controls`; the panel toggles
    the `hidden` attribute.
  - Decorative images use `alt=""`; meaningful images have descriptive `alt`.
    Decorative background containers use `aria-hidden="true"`.
- **Things to watch / improve:**
  - Focus styles: confirm visible focus rings on all interactive elements
    (links, chips, dots, buttons) before launch — verify against brand styling.
  - Color contrast: the carousel disclaimer / legal copy sits on imagery with a
    gradient scrim; re-check contrast if you change the scrim opacity.
  - The carousel auto-snaps on drag but has **no autoplay** (good for a11y —
    don't add autoplay without a pause control + reduced-motion handling).
  - Headings: keep a single `<h1>` (hero) and logical `<h2>`/`<h3>` order if you
    add sections.

---

## 9. Image / performance optimizations already applied

- **Hero (LCP):** `<link rel="preload" as="image" fetchpriority="high">` in
  `<head>` + `fetchpriority="high"` on the `<img>`.
- **Below-the-fold images:** `loading="lazy"` + `decoding="async"`.
- **Above-the-fold / prominent images** (nav logos, content-band bg): eager but
  `decoding="async"` (the parallax band is kept eager on purpose to avoid
  pop-in during scroll).
- Images with intrinsic `width`/`height` keep them to avoid layout shift (CLS);
  the rest are CSS-sized via `object-fit`.

- **Tile images were downsized.** `tile-finish.png` (was 4096×4096 / 28 MB) and
  `tile-apply.png` (was 3000×2112 / 8.6 MB) rendered in ~380px boxes and loaded
  far slower than the others; they're now ~1000–1200px / ~1.6–1.8 MB, in line
  with the rest. If you re-export these, keep them ≲1200px on the long edge.

### Suggested next steps (not yet done)
- Convert large PNGs (`hero.png`, `content-band-desk.png`, carousel portraits,
  `cta-*.png`) to **WebP/AVIF** with PNG fallback via `<picture>`. These are the
  biggest payloads on the page. (The tiles are now reasonable — see above.)
- Add `srcset`/`sizes` for the hero and CTA art to serve smaller files to phones.
- Self-host fonts (or add `&display=swap` is already set for Inter) and consider
  preloading the primary display font to reduce FOUT on the hero headline.

---

## 10. Browser support & assumptions

Relies on reasonably modern browser features — verify if you must support older
browsers:

- **CSS container queries** (`container-type`, `cqi` unit) — core to the ≤1023px
  carousel. No fallback is provided.
- **CSS `@import`** of `tokens.css`, custom properties, `clamp()`,
  `aspect-ratio`, `object-fit`/`object-position`, `backdrop-filter` (glass UI;
  has `-webkit-` prefix), `inset`.
- **JS:** ES modules, `IntersectionObserver`, Pointer Events, `matchMedia`.
- `backdrop-filter` is the one most likely to degrade — on unsupported browsers
  the glass panels fall back to their semi-transparent background (acceptable).

---

## 11. Quick "where do I change…?" index

| I want to change… | Go to |
| --- | --- |
| Colors, type scale, spacing, easings | `css/tokens.css` |
| A breakpoint's layout | the matching `@media` block in `css/styles.css` (§4) |
| Which headings animate in | `TEXT_REVEAL_SELECTORS` in `js/main.js` |
| Carousel behavior / drag | `initCarousel()` in `js/main.js` |
| Stat numbers or count-up speed | the markup values + `data-count-duration` attr (`js/main.js`) |
| Stat number size / overlap | `.stats-section__value` font is `min(clamp(…12.8vw…), 44cqi)`; each `.stats-section__stat` is a container so the value scales to its cell and can't overflow into the next stat |
| Hero height / above-the-fold reserve | `--hero-fold-reserve` + the `min-height` `max(floor, min(cap, …))` on `.hero` (§5) |
| Where the desk background starts | `--content-bg-top` on `.content-band__bg` (§7) |
| Parallax strength | amplitude factor in `initParallax()` + CSS overshoot (§7) |
| Sticky header offsets | `.utility-bar` / `.main-nav` `top`/`z-index` (§5) |
| Program-finder dropdown options | `SPECIALIZATIONS` map in `js/main.js` |
| "See all Capella programs" button alignment | `.stats-section__cta { align-self }` (right-aligned/flush with cards on desktop) |
