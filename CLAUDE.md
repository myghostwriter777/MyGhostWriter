# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:3000
npm run build      # Production build to /build
npm test           # Run tests in interactive watch mode
npm test -- --watchAll=false  # Run tests once (CI mode)
```

To run a specific test file:
```bash
npm test -- --testPathPattern="App.test"
```

## Architecture

GhostwriterMe is a **single-file React SPA** (`src/App.jsx`, ~1700 lines). The entire app — all screens, modes, UI atoms, and business logic — lives in that one file. There is no component directory or routing library.

### Screen flow (controlled by `screen` state in the root `GhostwriterMeApp` component)

```
auth → safety → (pricing) → (payment) → app
```

- **AuthScreen** — social/email login (currently mocked with `setTimeout`)
- **SafetyScreen** — three-checkbox disclaimer; must accept all three before proceeding
- **PricingScreen** — plan selection (free / pro / student) with billing toggle
- **PaymentScreen** — card/Apple Pay/PayPal form (mocked, no real payment backend)
- **AppShell** — the main app with a sticky navbar, horizontal mode tab bar, and the active mode rendered below

### AI mode tab routing

`AppShell` maintains `mode` state and renders the corresponding mode component:

| mode id    | component       | plan access     |
|------------|-----------------|-----------------|
| `reply`    | `ReplyMode`     | free (3/day cap)|
| `email`    | `EmailMode`     | free (unlimited)|
| `grammar`  | `GrammarMode`   | free            |
| `essay`    | `EssayMode`     | pro + student   |
| `academic` | `AcademicMode`  | pro + student   |
| `cv`       | `CVMode`        | pro + student   |
| `author`   | `AuthorMode`    | pro + student   |
| `humanize` | `HumanizeMode`  | student only    |
| `history`  | `HistoryMode`   | free            |

Tapping a locked mode triggers `TrialModal` instead of switching to it.

### Claude API calls

All AI generation goes through a single `callClaude(system, user, maxTokens)` function that calls the Anthropic API directly from the browser:

```js
fetch("https://api.anthropic.com/v1/messages", { ... model: "claude-sonnet-4-20250514" ... })
```

**There is no backend.** The API key must be provided client-side (currently not wired — add it to the fetch headers or via an environment variable if needed). All modes parse Claude's response as JSON using `JSON.parse(raw.replace(/```json|```/g,"").trim())`.

`HumanizeMode` is the only two-pass mode: it calls `callClaude` twice (pass 1: rewrite, pass 2: review/fix).

### Persistence

History is stored in `localStorage` via the `HS` utility object:

- Key format: `gwm2_[email]_[mode]`
- Stores last 50 entries per mode
- `HS.loadAll(email)` aggregates all modes sorted by timestamp

### Theming and styling

All styling is inline via a theme constant `C` defined at the top of `App.jsx`:

```js
const C = {
  bg: "#000000", surface: "#080d14", card: "#0c1220", border: "#162030",
  blue: "#79BAEC", ...
}
```

Global CSS (resets, fonts, keyframe animations) is injected via a `<style>` tag in the root component using the `GLOBAL_CSS` string constant. Fonts used: **Cabinet Grotesk** and **Instrument Serif** (from Google Fonts).

Reusable UI atoms defined in the file: `Card`, `PriBtn`, `SecBtn`, `Toggle`, `MicBtn`, `FInput`, `FArea`, `FSelect`, `CopyBtn`, `ListenBtn`, `Spin`, `ErrBox`, `PlanBadge`, `OutputActions`.

### Voice features

- **Input**: `useMic` hook wraps `SpeechRecognition` / `webkitSpeechRecognition`. Enabled via `voice` prop on `FArea`/`FInput`.
- **Output**: `speak()` and `stopSpeak()` helpers use `SpeechSynthesis`. Surfaced via `ListenBtn` inside `OutputActions`.

## Important file notes

`src/App.css` and `src/App.test.js` do **not** contain CSS or tests respectively — they hold an earlier purple-themed version of the app (using `'Plus Jakarta Sans'`/`'Bebas Neue'` fonts and `#8b5cf6` purple accent) kept as reference. The active codebase is `src/App.jsx` (black + denim blue theme), imported by `src/index.js`.
