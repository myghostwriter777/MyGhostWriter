# GhostwriterMe UI Polish Playbook

Use this playbook for visual and UX work in the GhostwriterMe Create React App. Read `design-system/MASTER.md` before changing UI. That file is the sole source of truth for brand tokens, typography, spacing, effects, and anti-patterns.

## Scope Rules

- Keep UI work in the existing architecture: Create React App and inline style objects in `src/App.jsx`.
- Do not add Tailwind, a CSS framework, a component library, or any npm dependency.
- Use `REACT_APP_*` environment variables only. Never introduce `VITE_*` variables.
- Make visual and UX changes only. Do not refactor, rename, split `App.jsx`, alter prompts, or change API request shapes.
- Deliver complete replacement files, not partial snippets or line-number insertion instructions.
- Preserve existing user work and unrelated working-tree changes.

## Frozen Product Surfaces

Styling around these surfaces is allowed. Their logic, content, data, and contracts are frozen:

- The embedded base64 tarot-card images and the tarot-card flip/back artwork.
- `isTwaApp()` and the content and anti-steering behavior of `TwaSubscriptionNotice`; it must contain no external checkout links.
- Stripe gating, all six Stripe price IDs, cardless-trial eligibility, and `skipTrial` behavior.
- Google Identity Services authentication, session handling, `SESSION_KEY`, and local-storage keys.
- Supabase calls and history persistence behavior.
- Prompt construction, model strings, and the `/api/claude` request shape. Story Guide remains pinned to `claude-sonnet-4-6`.
- `public/service-worker.js`, `public/manifest.json`, `vercel.json`, and everything in `api/`.
- Compliance wording in Settings, legal pages, Delete Account, Report AI Content, and `TwaSubscriptionNotice`.

## Visual Delivery Standard

- Backgrounds remain near-black; primary actions and focus accents use denim blue `#79BAEC`.
- Plan colors remain Free green `#3ddba4`, Pro denim blue `#79BAEC`, Student purple `#c084fc`, and reserved Elite gold `#c9a227`.
- Use real SVG icons for interface controls. Do not use emoji as structural icons.
- Every clickable control uses `cursor: pointer`, unless disabled.
- Interactive hover and press transitions run for 150–300ms and respect `prefers-reduced-motion`.
- Keyboard focus is clearly visible; modal focus is trapped and Escape closes dismissible modals.
- Primary and secondary text maintain at least 4.5:1 contrast against their actual dark background.
- Phone touch targets are at least 44×44 CSS pixels.
- Confirm layouts at 375px, 768px, and 1024px without clipping, overlap, or horizontal scrolling.
- Every API-triggering button has an in-flight loading indicator and disabled state.
- Empty, loading, success, and friendly error states are present wherever asynchronous content is shown. Errors for HTTP 429 and 529 must never expose raw provider text.

## Required Pre-Delivery Checks

Run from the repository root in PowerShell:

```powershell
$env:CI='true'
npm.cmd run build
```

The CRA production build is the required Babel parse and ESLint gate. Any `no-unused-vars`, `no-undef`, warning promoted by CI, syntax error, or build error is a failure.

Also verify:

1. `git diff` contains only the approved UI files and intended documentation.
2. Frozen files and API code have no diff.
3. `src/App.jsx` contains no `VITE_` variables and no legacy Student purple `#9b7fe8`.
4. All checklist items in the regression list below still have their corresponding implementation in `src/App.jsx` or the named public file.
5. The production bundle renders the same GhostwriterMe UI on the website and in the TWA; the TWA is a wrapper around the live web app, so this parity is expected.

## Regression List (must remain at bottom)

- [ ] Landing screen retains the GhostwriterMe/Ghosty hero, Get Started and Sign In actions, tool showcase, pricing teaser, FAQ, updates, and contact surfaces.
- [ ] The tool-selector grid retains AI Replies, Email, Grammar, Essay, Academic Reviewer, CV/Resume, Author, Humanize, Story Guide, and History.
- [ ] Embedded base64 tarot art and the tarot-card flip/back implementation remain byte-for-byte unchanged; only frames and surrounding layout may be styled.
- [ ] Mode and plan badges remain accurate, including Student-locked modes using `#c084fc`.
- [ ] Google Identity Services and email authentication remain available, including the age/terms acknowledgement and existing safety notices.
- [ ] `SESSION_KEY` remains `gwm_session_v1`; all existing local-storage keys and Supabase calls remain unchanged.
- [ ] AppShell retains its product header, navigation, account/settings access, plan handling, and sign-out behavior.
- [ ] Shared writing tools retain input, generation, output, Copy, Listen/text-to-speech, Save as image, image/OCR input where offered, follow-up chat, and history saving.
- [ ] API actions show loading and disabled states; generation failures show inline friendly errors, including retry guidance for HTTP 429 and 529.
- [ ] AI Replies retains tones and its 15-per-day behavior.
- [ ] Email, Grammar, Essay, CV/Resume, and Author retain their mode-specific controls and prompt behavior.
- [ ] Academic retains Reviewer, Research, and Draft tabs plus its academic-integrity acknowledgement/modal.
- [ ] Story Guide retains its Books/Movies paths, illustration/tarot card, guide steps, web-search option, connected story structure, and progress indication; its model/request logic remains unchanged.
- [ ] Humanize retains its two-pass flow, responsible-use notice, change summary, and comparison view.
- [ ] History retains local and remote synchronization, loading skeleton, empty state, error state, mode tags, timestamps, and detail view.
- [ ] Pricing retains Free, Pro, and Student plans, monthly/yearly billing, correct plan colors, 3-day cardless trial messaging, and existing trial eligibility rules. Elite remains reserved and is not invented as a purchasable plan.
- [ ] Stripe Elements checkout retains all six price IDs, `skipTrial` behavior, loading/disabled subscription actions, and existing success/error handling.
- [ ] `TwaSubscriptionNotice` retains its exact anti-steering content and zero external checkout links.
- [ ] Settings retains all account and plan rows, Report AI Content, Delete Account, legal links, contact/support, and SVG chevrons/icons.
- [ ] Report AI Content retains modal focus trapping and Escape-to-close behavior without wording changes.
- [ ] `/privacy`, `/terms`, and `/delete-account` retain their standalone routes, legal/compliance wording, readable mobile layout, and functional navigation.
- [ ] `public/manifest.json`, `public/service-worker.js`, `vercel.json`, and `api/` remain unchanged by UI polish.
- [ ] TWA identity remains package `com.ghostwriterme.app`, with deployed asset links using the approved signing fingerprint beginning `C2:4F:40:6B`.
