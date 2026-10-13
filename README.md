# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Voice playback

Listen buttons and spoken interview questions use the speech engine built into the user's browser or device. No third-party text-to-speech key is required.

## Reliability and performance

Visited tools preserve their drafts and results when switching modes or opening Settings. Each tool has its own recovery boundary, and Meeting Assist and Lecture load on first use to reduce initial JavaScript. Shared generation requests time out through response decoding, distinguish cancellation from failure, and reject empty or incomplete results. Server requests stop on deadlines or client disconnects; research continuations retain tool context without mixing search narration into JSON results.

Meeting transcription queues are isolated per session and cancel on restart or clear. Local Whisper inference is serialized, speech playback always settles when stopped, and late microphone permission results are cleaned up. Image reading is cancelled when its attachment is removed or the form is reset. Slide text measurements are cached and refreshed after fonts load; exports limit concurrent image decoding, report unreadable images, and release raster canvases promptly. The service worker only caches fingerprinted assets indefinitely, so updated PDF/PPTX runtimes are fetched normally.

Run regression checks with `npm test -- --watchAll=false --runInBand` and verify the production bundle with `npm run build`. These checks mock AI providers and do not make paid generation requests.

## English writing levels

Each writing tool has an A1–C2 English level selector. The selected level controls sentence structure, vocabulary, paragraph connections, and feedback while keeping grammar correct at every level. Academic tools start at C1; other tools start at B2. Choices stay with each tool when switching modes, and changing a level applies to subsequent generations and follow-up replies without relabeling existing Essay or Humanize results.

All prose requests use the shared guidance in `src/cefrWriting.js`, informed by the Council of Europe's [CEFR Companion Volume](https://rm.coe.int/16809ea0d4). Both Humanize passes use the same level and compare the rewrite against the original meaning. C1/C2 can retain controlled complex sentences; A1/A2 use accessible structures without imitating learner mistakes. The guidance preserves facts, quotations, and response formats, and leaves exact image transcription and AI-content assessment outside the rewriting rules. Essay, academic-draft, and author output budgets scale with the requested length; Grammar budgets also expand for longer source text.

These are generation targets, not certified CEFR assessments. Regression tests verify level selection, request instructions, follow-up behavior, and output handling with mocked model responses; live writing quality still requires model-output evaluation.

## Language and essay formatting

Settings → AI output language applies immediately to subsequent generations, feedback, and browser voice input. Automatic follows the substantive source text; Meeting replies and Lecture notes always follow the spoken/source language unless the user requests translation. Thai speech receives Thai replies even when the general writing preference is English. Required JSON keys and enum values stay intact, and image OCR preserves the original source language. Speech playback recognizes several distinctive scripts before falling back to the selected device language.

Essay and Academic Draft request plain text and remove Markdown heading and emphasis markers before display, copying, and history storage. Meaningful symbols such as C#, hashtags, and arithmetic remain intact.

## Free Deep Research

Deep Research is available as a standalone free tool for general topics, with up to 4–10 searches, visible source links, History, and follow-up research. Follow-ups attach the complete report as a UTF-8 document instead of putting it into the limited system prompt. Research remains dependent on the configured server AI provider; the free product tier does not remove provider usage costs.

## Lecture

Lecture is a free tool with microphone recording, pause/resume, playback, original mixed-audio download, and an editable transcript grouped by speaker. Speaker groups use conservative pitch/tone estimates, not verified diarization; similar voices or overlapping speech need manual correction. A chronological view is also available. Timestamps are approximate.

Generate Study Notes and Ask AI use the transcript available when clicked, with timestamp references and the lecture's language. Review any failed or incomplete transcription first. Notes, transcript, and questions can be downloaded as plain text or saved to History; oversized history entries prompt a complete download. The raw recording stays only in browser memory until downloaded and is not included in History.

Recording pauses when transcription falls behind, allows failed segments to be retried or corrected, and stops at three hours or 128 MB. Source documents preserve the complete transcript up to six 100,000-character parts; provider context limits can still require a shorter session. The first on-device transcription fallback downloads a multilingual Whisper model. Mobile background recording and real-device microphone quality must be checked on the target phone.

## Google Play app

The website landing page and Settings link to GhostwriterMe on Google Play. The Android wrapper's browser toolbar is controlled by verified Digital Asset Links, not page CSS. See `android/README.md` and run `node android/check-twa.cjs` to check the configured signing fingerprints and website origins. Publishing a changed `public/.well-known/assetlinks.json` is necessary before the installed Play app can verify the new certificate.

## Presentation PDFs and AI-content estimates

Present → Create Script accepts one PDF (up to 4 MB / 100 pages) in place of a topic. It extracts a slide-text preview locally with PDF.js, then sends the complete PDF through the existing `/api/openai` studio route, which uses Anthropic, so visual and scanned slides can be read too. Speaker, section, timing, and delivery settings still apply. Password-protected and damaged PDFs display actionable errors. Attachments and extracted previews stay in memory and are not saved in history or session storage; generated scripts keep the existing save behavior.

Humanize → Analyze AI content assesses either the pasted text or the humanized result on demand. It uses the same studio route and existing `ANTHROPIC_API_KEY`; no new provider credentials are required. The 1–100% score is a model-based style estimate, not a calibrated probability or a measurement of actual AI authorship. Analysis requires 200–20,000 characters, shows supporting observations, and clears stale results when the analyzed text changes. Rewriting remains a separate action.

## Meeting Assist

Meeting Assist listens to a live conversation and prepares three spoken-style answer options every time the other party finishes a turn.

- **Audio sources:** the **Microphone** (default; works on phones, in person, and with any meeting app) hears the room or the device's speakers, with echo cancellation deliberately off so a remote voice playing through the speakers is not stripped out. The capture graph adds a high-pass (85 Hz) and low-pass (7.6 kHz) filter before analysis. **Meeting tab audio** (desktop Chrome/Edge) captures only the remote participants of a Meet, Teams or Zoom browser tab.
- **Speaker turns:** an energy-based voice-activity detector with a short onset requirement (clicks and taps are ignored) groups speech into turns. Meeting turns end after **1.2 seconds of silence**. Chunks with at least 0.9 seconds of speech can start transcription after a 350 ms pause (two at a time), overlapping decoding with turn detection. Trailing silence is trimmed, chunks without pitched (voiced) frames are never sent to the model, and a turn is force-closed after 45 s of continuous speech.
- **Transcription:** chunks go to `/api/transcribe` (Vercel AI Gateway, `openai/gpt-4o-mini-transcribe`) as 16 kHz WAV, downsampled with an anti-aliasing low-pass and peak-normalised. The optional **Conversation language** (stored per account) and a short vocabulary hint (situation plus proper nouns from "About you") are passed as provider options; if the provider rejects the hints the route retries once without them. If the route reports a terminal failure (no credits, not configured, unreachable), the session switches to a multilingual on-device Whisper model in transcription mode. Short Thai and CJK utterances are accepted without relying on whitespace word counts.
- **Who is speaking:** in microphone mode Claude labels every completed turn as the other party, the user, or unclear, using the conversation, turn-taking, and an optional six-second voice sample (median pitch and brightness, stored only in this browser). When a voice sample exists and consecutive chunks of one turn flip between the user and someone else, the turn is split at that point. Lines attributed to the user never become suggestions. The **"I'm speaking · pause"** toggle flushes the open turn immediately (so the question is answered while the user talks) and then drops audio until **Resume listening**.
- **Answers:** the `meeting` structured output returns exactly three distinct first-person options (direct, example-led, and one ending in a clarifying question) grounded only in the "About you" context, with `[placeholders]` where a detail is unknown. Every turn from the other party gets options, even a remark; if the model labels a line as the other party but returns none, it is asked once more. A failed answer request is retried once after 2.5 s. New completed turns immediately supersede older answer requests, and stale results cannot overwrite a newer response. The floating answer panel (Document Picture-in-Picture) mirrors the options and the pause toggle.

## Slide Generator rendering

Every slide surface (studio preview, fullscreen, PDF, PNG/JPEG, PPTX and Word previews) renders the same block layout produced by `src/slideLayout.js` on a fixed 1600×900 stage; the preview scales that stage to fit, so exports match the screen. Layouts follow an editorial deck: cover with a curved image panel, evidence cards, process circles, icon columns, an equation card, a takeaway grid, and an editable Sources card. Copy that would overflow is fitted automatically. Illustrations are generated progressively for every image-led slide via `/api/slide-image` (Gateway: Gemini image models first, then Flux and GPT Image), and the deck is shown as soon as the text is ready; failed illustrations can be retried per deck or replaced per slide.

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
