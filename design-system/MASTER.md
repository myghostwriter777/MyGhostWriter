# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** GhostwriterMe
**Generated:** 2026-07-26 (ui-ux-pro-max `--design-system --persist`, hand-corrected against `src/App.jsx`)
**Updated:** 2026-08-03 (Student brand color reconciled with the live app)
**Category:** SaaS — AI writing assistant (dark theme, Create React App, inline styles)
**Stack:** Create React App, inline style objects in `App.jsx`. No Tailwind, no CSS framework, no UI library. Env vars are `REACT_APP_*` only.

> **Source of truth note:** every value below was verified against the `C` and `TZ` color objects and `GLOBAL_CSS` block in `src/App.jsx`. This file documents the real brand; it does not invent one.

---

## Global Rules

### Color Palette

| Role | Hex / Value | Source | Notes |
|------|-----|--------|-------|
| Background | `#000000` | `C.bg` | Pure black. Intentional brand choice — do not lighten to avoid "OLED smear," that's a generic recommendation, not this brand's call. |
| Surface | `#080d14` | `C.surface` | Panels, section backgrounds |
| Card | `#0c1220` | `C.card` | Cards, sheets, modal bodies |
| Border | `#162030` | `C.border` | Hairline borders/dividers |
| Text (primary) | `#ffffff` | `C.text` | |
| Text (muted) | `#8eacc4` | `C.muted` | Secondary copy, helper text |
| **Primary / Accent / CTA — Denim Blue** | `#79BAEC` | `C.blue` | Primary brand color, default button/link/focus color |
| Denim Blue — light variant | `#a8d4f5` | `C.accent` | Gradient partner for primary buttons (`linear-gradient(135deg, #79BAEC, #a8d4f5)`) |
| Denim Blue — glow | `rgba(121,186,236,0.2)` | `C.blueGlow` | Ambient glow behind hero art / active icons |
| Denim Blue — soft fill | `rgba(121,186,236,0.1)` | `C.accentSoft` | Subtle highlight backgrounds (e.g. Pro plan badge fill) |
| Success | `#3ddba4` | `C.green` | Also doubles as the **Free plan** color |
| Error / Destructive | `#f06b6b` | `C.red` | |
| Warning | `#f5c842` | `C.yellow` | |

**Plan colors** (see also the "Never Change" section below):

| Plan | Color | Hex | Status |
|------|-------|-----|--------|
| Free | Green | `#3ddba4` | Live (`C.green`) |
| Pro | Denim Blue | `#79BAEC` | Live — same token as primary/CTA (`C.blue`) |
| Student | Purple | `#c084fc` | Live (`C.violet`) |
| Elite | Gold | `#c9a227` (core) / `#e6c965` (light) | **Reserved — not yet implemented** |

> **Elite** does not exist anywhere in `App.jsx` (confirmed via search — only `free` / `pro` / `student` plan branches exist). It's documented here as a reserved future tier, reusing the gold values that already exist in the codebase (`TZ.gold` / `TZ.goldL`, currently used only for the tarot-card back design) rather than inventing a new gold.

### Typography

The generated suggestion (Inter) was **replaced** — it doesn't match what's actually shipping. The app already imports and uses a real pairing 98 times across `App.jsx`:

- **Display / accent font:** Instrument Serif (italic) — used for emphasis phrases and hero flourishes
- **UI / body / heading font:** Cabinet Grotesk — weights 400, 500, 700, 800, 900 — used for nearly everything else (headings, buttons, body copy, labels)
- **Google Fonts import (already in `GLOBAL_CSS` in `App.jsx`):**

```css
@import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
```

- **Mood:** premium, confident, editorial-meets-technical — matches a dark professional AI SaaS without leaning generic-startup (Inter would have been generic-startup).
- **Type scale in use:** roughly 9 / 10 / 11 / 12 / 13 / 14 / 15 / 16 / 17px for UI text, 20–22px for section subheads, larger display sizes in the hero. Keep this granular scale rather than collapsing to a strict 12/14/16/18/24/32 system — the existing UI relies on the finer steps for dense card/list layouts.

### Spacing Variables

Kept from the generated system — it's a standard 4/8pt rhythm and is compatible with the padding values already scattered through `App.jsx` (12/14/16/18/20/24px etc. all fall on or near this scale):

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `8px` | Icon gaps, inline spacing |
| `--space-md` | `16px` | Standard padding |
| `--space-lg` | `24px` | Section padding |
| `--space-xl` | `32px` | Large gaps |
| `--space-2xl` | `48px` | Section margins |
| `--space-3xl` | `64px` | Hero padding |

### Shadow / Glow Depths

The generated scale (`rgba(0,0,0,0.05–0.15)`) is a **light-mode** shadow scale — on a pure-black background those are invisible, so it was replaced with the glow/shadow values already used in the live UI:

| Token | Value | Usage | Source |
|-------|-------|-------|--------|
| `--shadow-card` | `0 2px 12px rgba(0,0,0,0.55)` | Cards, tarot card faces | `TarotCard` component |
| `--shadow-modal` | `0 20px 50px rgba(0,0,0,0.7)` | Auth cards, elevated panels | `AuthScreen` |
| `--glow-primary` | `0 4px 20px rgba(121,186,236,0.3)` | Active/checked primary CTA glow | terms-accept button |
| `--scrim-modal` | `rgba(0,0,0,0.8)` + `backdrop-filter: blur(6px)` | Bottom-sheet / modal overlays | `ContactModal`, `TrialModal`, etc. |
| `--scrim-sticky` | `rgba(0,0,0,0.95)` + `backdrop-filter: blur(14px)` | Sticky top/bottom bars | `AppShell` header/footer |

### Border Radius

Not explicit in the generated output but consistent in the codebase — documenting the real scale:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6–8px` | Buttons, inputs, small chips |
| `--radius-md` | `9–10px` | Cards, icon tiles |
| `--radius-lg` | `14px` | Bottom sheets, modals (`14px 14px 0 0` for sheets docked to viewport bottom) |
| `--radius-pill` | `20px+` | Badges, pill buttons |

---

## Component Specs

Reference only — these describe the values already in use as inline styles in `App.jsx`; they are **not** a CSS file to import (no CSS frameworks per stack rules).

### Buttons

```css
/* Primary button (PriBtn, variant="blue") */
.btn-primary {
  background: linear-gradient(135deg, #79BAEC, #a8d4f5);
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 800;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #0c1220;
  color: #8eacc4;
  cursor: not-allowed;
}

/* Secondary / Student variant (PriBtn, variant="violet") */
.btn-secondary-violet {
  background: linear-gradient(135deg, #c084fc, #c4b5fd); /* Student brand gradient */
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 800;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #0c1220;      /* C.card */
  border: 1px solid #162030; /* C.border */
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.55);
  transition: all 200ms ease;
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  background: #080d14;       /* C.surface */
  border: 1px solid #162030; /* C.border */
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;            /* keep >=16px on mobile to avoid iOS auto-zoom */
  transition: border-color 200ms ease;
}
.input:focus {
  border-color: #79BAEC;
  outline: none;
  box-shadow: 0 0 0 3px rgba(121,186,236,0.2);
}
```

### Modals / Bottom Sheets

```css
.modal-overlay {
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(6px);
}
.modal-sheet {
  background: #0c1220;
  border-radius: 14px 14px 0 0;
  padding: 20px 18px 32px;
  max-width: 500px;
  width: 100%;
  animation: slideUpModal 0.3s ease;
}
```

---

## Style Guidelines

**Style:** Dark professional AI SaaS — near-black canvas, denim-blue accent glow, editorial serif flourishes, tarot/mystical motif reserved strictly for the frozen tarot-card component.

**Keywords:** dark, premium, confident, focused, editorial-technical, glow-accented, calm (not "cinematic glassmorphism" — the generated suggestion overstated the blur/glass effect; the app uses blur sparingly, only on modal scrims and sticky bars, not as a general surface treatment).

**Key Effects (real, CSS-based — the generated React Native effects were removed as not applicable to this stack):**
- Transitions: 150–300ms, `ease` or `ease-out`, on `opacity`/`transform`/`border-color`/`background` only
- Entrance animation: `fadeUp 0.2–0.4s ease` (already defined in `GLOBAL_CSS`)
- Bottom sheets: `slideUpModal 0.3s ease`
- Press feedback: subtle `translateY(-1px)` or `translateY(-2px)` lift on hover, not scale-jitter
- Modal scrim: `rgba(0,0,0,0.8)` + `blur(6px)`; sticky bars: `rgba(0,0,0,0.95)` + `blur(14px)`
- Ambient ring/glow accents behind hero art using `border: 1px solid #0d1f30` circles (see `LandingScreen`)

### Page Pattern

The generated "AI Personalization Landing" pattern doesn't match the real app. Actual structure, confirmed from `App.jsx`:

1. **LandingScreen** — marketing hero, tool showcase (tarot-card grid), pricing teaser, FAQ, contact
2. **AuthScreen** — sign up / sign in (Google Identity Services + email)
3. **PricingScreen** — Free / Pro / Student tab comparison → trial/payment flow (Stripe)
4. **AppShell** — the product itself: sticky header/footer nav between tool modes (Reply, Email, Grammar, Essay, Academic, CV, Story Analyzer, Author, Humanize, History)
5. **SettingsScreen** — account, plan management, legal links
6. Standalone legal pages: `/privacy`, `/terms`, `/delete-account`

---

## Never Change

These are frozen by explicit product decision — styling *around* them is fine, but do not alter their logic, content, or these specific color values:

- **Tarot card images** — the embedded base64 tarot card art and the `TarotCard` component's flip logic/back design (gold `#c9a227`/`#e6c965` on `linear-gradient(165deg,#1a1226,#0c0a14)`). This is a fixed cosmetic motif for the tool-showcase grid only — never extend the tarot/mystical aesthetic to the rest of the app.
- **Plan colors as brand identifiers** — Free = green `#3ddba4`, Pro = denim blue `#79BAEC`, Student = purple `#c084fc`, Elite = gold `#c9a227` (reserved). Don't reassign these colors to other plans or reuse them for unrelated UI meaning (e.g. don't use plan-purple as a generic decorative accent).
- **`isTwaApp()` / `TwaSubscriptionNotice` logic**
- **Stripe gating logic**
- **Google Identity Services auth logic**
- **`service-worker.js`, `manifest.json`, `vercel.json`, everything in `api/`**

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ Introducing a second dark-mode palette or "glassmorphism everywhere" — this brand uses blur sparingly (scrims/sticky bars only), not as a general surface treatment
- ❌ **Emojis as structural icons** — use real SVG icons; emoji are fine only where they already appear as decorative/expressive content (e.g. 🎓 next to "Student"), not as functional UI icons
- ❌ **Missing `cursor: pointer`** on clickable elements
- ❌ **Layout-shifting hovers** — avoid scale transforms that shift surrounding content; prefer `translateY`/opacity/shadow changes
- ❌ **Low contrast text** — maintain 4.5:1 minimum contrast ratio against the near-black background
- ❌ **Instant state changes** — always use 150–300ms transitions
- ❌ **Invisible focus states** — focus rings must be visible for keyboard nav
- ❌ Reusing plan colors (green/blue/purple/gold) for anything other than their assigned plan
- ❌ Touching tarot images, Stripe/auth/TWA logic, or `service-worker.js` / `manifest.json` / `vercel.json` / `api/` under the guise of a "styling" change

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as functional icons (use SVG instead)
- [ ] All icons from a consistent icon set, consistent stroke width
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Text contrast ≥ 4.5:1 against the dark background
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive at 375px / 768px / 1024px
- [ ] No content hidden behind sticky headers/footers
- [ ] No horizontal scroll on mobile
- [ ] Loading state on every button that triggers an API call
- [ ] No new npm dependencies, no Tailwind/CSS framework, no `VITE_*` env vars
- [ ] Tarot images, TWA/Stripe/auth logic, and frozen config files untouched
