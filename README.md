# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Node.js and Vercel runtime

Use Node.js 24.x locally and in Vercel Project Settings. The root `package.json` pins this version for builds and functions. API routes, shared server helpers, and `scripts/build.js` use CommonJS; keep their `require` / `module.exports` format. ESM-only AI SDK packages load through native dynamic `import()` calls. Do not add `"type": "module"` at the project root without migrating the existing CommonJS files.

## Voice playback

Listen buttons and spoken interview questions use the speech engine built into the user's browser or device. No third-party text-to-speech key is required.

## Presentation PDFs and AI-content estimates

Present → Create Script accepts one PDF (up to 4 MB / 100 pages) in place of a topic. It extracts a slide-text preview locally with PDF.js, then sends the complete PDF through the existing `/api/openai` studio route, which uses Anthropic, so visual and scanned slides can be read too. Speaker, section, timing, and delivery settings still apply. Password-protected and damaged PDFs display actionable errors. Attachments and extracted previews stay in memory and are not saved in history or session storage; generated scripts keep the existing save behavior.

Humanize → Analyze AI content assesses either the pasted text or the humanized result on demand. It uses the same studio route and existing `ANTHROPIC_API_KEY`; no new provider credentials are required. The 1–100% score is a model-based style estimate, not a calibrated probability or a measurement of actual AI authorship. Analysis requires 200–20,000 characters, shows supporting observations, and clears stale results when the analyzed text changes. Rewriting remains a separate action.

## Meeting Assist

Meeting Assist is released to every Master subscriber (September 2026). Manga Studio remains behind the admin-tester gate in `src/featureAvailability.js`.

Meeting Assist listens to a live conversation and prepares three spoken-style answer options every time the other party finishes a turn.

- **Audio sources:** the **Microphone** (default; works on phones, in person, and with any meeting app) hears the room or the device's speakers, with echo cancellation deliberately off so a remote voice playing through the speakers is not stripped out. The capture graph adds a high-pass (85 Hz) and low-pass (7.6 kHz) filter before analysis. **Meeting tab audio** (desktop Chrome/Edge) captures only the remote participants of a Meet, Teams or Zoom browser tab.
- **Speaker turns:** an energy-based voice-activity detector with a short onset requirement (clicks and taps are ignored) groups speech into turns. A turn ends only after **two seconds of silence**, so a question with thinking pauses stays together and answers are prepared once, for the whole question. While the person is still talking, audio is handed out in chunks at natural pauses and transcribed in the background (two at a time), so when the turn ends only the short tail is left to transcribe. Trailing silence is trimmed, chunks without pitched (voiced) frames are never sent to the model, and a turn is force-closed after 45 s of continuous speech.
- **Transcription:** chunks go to `/api/transcribe` (Vercel AI Gateway, `openai/gpt-4o-mini-transcribe`) as 16 kHz WAV, downsampled with an anti-aliasing low-pass and peak-normalised. The optional **Conversation language** (stored per account) and a short vocabulary hint (situation plus proper nouns from "About you") are passed as provider options; if the provider rejects the hints the route retries once without them. If the route reports a terminal failure (no credits, not configured, unreachable), the session switches to the on-device Whisper model automatically.
- **Who is speaking:** in microphone mode Claude labels every completed turn as the other party, the user, or unclear, using the conversation, turn-taking, and an optional six-second voice sample (median pitch and brightness, stored only in this browser). When a voice sample exists and consecutive chunks of one turn flip between the user and someone else, the turn is split at that point. Lines attributed to the user never become suggestions. The **"I'm speaking · pause"** toggle flushes the open turn immediately (so the question is answered while the user talks) and then drops audio until **Resume listening**.
- **Answers:** the `meeting` structured output returns exactly three distinct first-person options (direct, example-led, and one ending in a clarifying question) grounded only in the "About you" context, with `[placeholders]` where a detail is unknown. Every turn from the other party gets options, even a remark; if the model labels a line as the other party but returns none, it is asked once more. A failed answer request is retried once after 2.5 s, and a request that never returns cannot block later questions (75 s watchdog). The floating answer panel (Document Picture-in-Picture) mirrors the options and the pause toggle.

## Slide Generator rendering

Every slide surface (studio preview, fullscreen, PDF, PNG/JPEG, PPTX and Word previews) renders the same block layout produced by `src/slideLayout.js` on a fixed 1600×900 stage; the preview scales that stage to fit, so exports match the screen. Layouts follow an editorial deck: cover with a curved image panel, evidence cards, process circles, icon columns, an equation card, a takeaway grid, and an editable Sources card. Copy that would overflow is fitted automatically. The deck is shown as soon as the text is ready and visuals arrive progressively for every image-led slide; failed visuals can be retried per deck or replaced per slide.

**Slide visuals.** The generator form offers two sources:

- **Web photos (default):** `/api/slide-photo` builds a query from the slide title, the deck topic and (for generic titles) the visual direction, then searches **Google Images** through the Custom Search JSON API when `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set, falling back to **Wikimedia Commons** (no key; results carry a licence and author) when Google is not configured, over quota, or empty. Tiny, vector, over-sized and already-used pictures are skipped, the best landscape candidate is downloaded server-side, resized to 1600 px JPEG with sharp (so the export canvas is never tainted by a cross-origin image) and returned with its **source**: page URL, title, domain, licence and author. The photo is attached to the slide, its page is added to the deck's editable Sources card and to the slide's footer citation ("Sources 1, 4"), and a small "Photo: author · licence · domain" credit pill is drawn inside the picture on every surface (preview, fullscreen, PDF, PNG/JPEG, PPTX, Word). Removing the photo removes the citation when no other slide uses it. A slide with no suitable photo receives an AI illustration instead. Google's free tier allows 100 image queries per day; each generated deck uses one query per image-led slide.
- **AI illustrations:** `/api/slide-image` (Gateway: Gemini 3 Pro Image first for finish, then Gemini 3.1 Flash Image, Flux and GPT Image). Every visual is rendered in one fixed house style modelled on the reference art the owner supplied: inked graphic-novel artwork with varied-weight black outlines, cel shading plus hatching and stippling, high-chroma colour with glowing cores and rim light, and dense detail with no empty flat regions. The deck theme now supplies mood and palette only and cannot override that style, and photorealism, 3D renders, stock photos, clip art, pastel washes and thin uniform outlines are excluded explicitly. The route asks for a landscape 1K image through Google provider options (retried once without them on a 400), enforces per-attempt deadlines inside a 54 s budget, and recompresses any visual that would exceed Vercel's 4.5 MB response cap.

In the editor, **Web photo** and **AI visual** buttons fetch a visual for the selected slide; each listed photo links to its source page.

## Manga Studio image pipeline

`/api/manga-image` renders one portrait page per request (Gemini 3 Pro Image, then Gemini 3.1 Flash Image, then Flux and GPT Image through the AI Gateway). The route keeps every attempt inside Vercel's 60 s function limit with per-model deadlines (38 s for the first attempt, remaining budget for the rest; models are skipped when under 9 s remain) and reports a clear timeout instead of an HTML gateway error. Gemini is asked for a 1K 2:3 page through Google provider options and retried once without them if the provider rejects them. Any page whose data URL would exceed Vercel's 4.5 MB response limit is recompressed with sharp to a 1536 px JPEG before it is returned. On the device, reference images (up to 12 MB each) are downscaled to 1280 px JPEG before upload, the page-one continuity image sent for later pages is downscaled to 1024 px, each page request has a 90 s client timeout, and HTTP 413/500/504 responses from the platform map to actionable messages.

## Connectors (MCP)

Admin testing only. `canUseConnectors()` in `src/featureAvailability.js` controls what the Settings screen shows, and every server route re-reads `role`/`all_features` from the database on each call, so the gate cannot be lifted from the browser. Run `supabase/connectors.sql` once in the Supabase SQL Editor before using either direction.

### GhostwriterMe as a connector (outbound)

`/api/mcp` is a Model Context Protocol server over Streamable HTTP. Users add the URL in Claude, ChatGPT, Cursor or VS Code and their assistant can then call six tools: `search_history` and `get_history_item` (read the account's own saved work), `write_essay`, `humanize_writing`, `outline_slide_deck` and `check_ai_content`. The read-only pair carry `readOnlyHint`, so clients can tell which calls are safe to make unattended. No tool writes to History.

The server is stateless: it issues no `Mcp-Session-Id`, answers JSON (never SSE), and returns 405 to `GET` because it offers no server-initiated stream. Protocol versions 2025-06-18, 2025-03-26 and 2024-11-05 are accepted and echoed back; anything else is answered with the newest. A tool that fails returns `isError` inside a normal result so the calling model can read the reason, and JSON-RPC errors are reserved for malformed requests.

Auth is a connector token (`gwm_<id>_<secret>`) minted in Settings and sent as `Authorization: Bearer`. A `?token=` query parameter also works for connector UIs that accept only a URL, which is why the settings screen offers the header form first: a token in a URL ends up in logs and browser history. Only a SHA-256 hash of the secret half is stored, so a database leak cannot be replayed against the endpoint, and each token is shown exactly once at creation.

### Connecting other apps into GhostwriterMe (inbound)

Settings → Connectors → Connected apps registers remote MCP servers (Notion, Drive, GitHub, an internal tool). Study Pack and Slide Generator requests then send them to Claude through Anthropic's MCP connector, which needs both halves — `mcp_servers` plus a matching `mcp_toolset` tool and the `mcp-client-2025-11-20` beta — so `buildConnectorPayload()` always emits them together. GhostwriterMe never calls these servers itself; Anthropic's API does. URLs must be public https, and private and link-local hosts are rejected. If the lookup fails the generation still runs, just without the user's own sources.

An access token supplied for a connected app is stored in `user_mcp_servers.auth_token` in plaintext, readable by anyone holding the service-role key, and is never returned to the browser. Treat that column as sensitive when granting database access.

### Why management routes need a Google sign-in

A connector token can read an account's whole History, so `/api/connector-tokens` and `/api/mcp-servers` will not act on an email address alone. The browser fetches a fresh Google access token with the same client and scope the sign-in screen uses, and the server verifies it against Google's userinfo endpoint before doing anything. Accounts created with email sign-in rather than Google cannot manage connectors yet.

## University Portfolio

Pro → Portfolio has two workflows (also included in Master):

- **Create Portfolio:** enter education, achievements, extracurriculars, projects, skills and reflections, or upload UTF-8 `.txt` notes (18,000 characters total). Add up to four PNG/JPEG/WebP photos, 4 MB each, with optional captions. The result uses a designed A4 cover, teal/green accents, grouped sections, framed photos, captions and numbered continuation pages. Photo placement can be adjusted after generation. **Save portfolio as PDF** downloads a PDF directly using the same layout as the preview, without browser headers or footers. Pages are rendered at 3× resolution to preserve multilingual text and images; **Copy** provides the editable text. Missing-information suggestions stay outside the portfolio itself.
- **Review Portfolio PDF:** upload a PDF up to 4 MB / 100 pages and optionally supply course requirements. The full document, including images and layout, is reviewed. The overall 1–100 score is the equal-weight average of Content, Structure, Evidence, Presentation and Accuracy. Feedback includes strengths, page-specific mistakes, corrections, suggestions and missing information. Scores are coaching feedback, not admission probabilities.

Each workflow has an independent follow-up chat grounded in its original inputs and result; PDF-review questions include the full PDF on every turn. Chat and form state survive switching between the two tabs and other app modes. Recent conversation is bounded while the latest question and source attachments are retained. Both workflows reuse the existing Anthropic studio API and credentials. Generated portfolio text and review feedback use existing History storage; raw photos and PDFs stay in memory and are not saved to History.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
