# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Voice playback

Listen buttons and spoken interview questions use the speech engine built into the user's browser or device. No third-party text-to-speech key is required.

## Presentation PDFs and AI-content estimates

Present → Create Script accepts one PDF (up to 4 MB / 100 pages) in place of a topic. It extracts a slide-text preview locally with PDF.js, then sends the complete PDF through the existing `/api/openai` studio route, which uses Anthropic, so visual and scanned slides can be read too. Speaker, section, timing, and delivery settings still apply. Password-protected and damaged PDFs display actionable errors. Attachments and extracted previews stay in memory and are not saved in history or session storage; generated scripts keep the existing save behavior.

Humanize → Analyze AI content assesses either the pasted text or the humanized result on demand. It uses the same studio route and existing `ANTHROPIC_API_KEY`; no new provider credentials are required. The 1–100% score is a model-based style estimate, not a calibrated probability or a measurement of actual AI authorship. Analysis requires 200–20,000 characters, shows supporting observations, and clears stale results when the analyzed text changes. Rewriting remains a separate action.

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
