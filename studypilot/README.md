# Study Mission Assistant

Study Mission Assistant is a study dashboard with two working modes:

- local mode for Google Classroom sync, local file workflows, and stronger automation
- Cloudflare mode for internet access, floating chat uploads, and hosted D1 persistence

## Folder structure

```text
studypilot/
  index.html
  mistakes.html
  review.html
  updates.html
  upload-guide.html
  WORKFLOW.md
  resources/
  pages/
  styles/
  scripts/
  data/
  uploads/
```

## Current architecture

- The UI uses plain HTML, CSS, and vanilla JavaScript only.
- Shared helper functions live in `scripts/utils.js`.
- Shared page helpers live in `scripts/app.js`.
- Each page has its own script file so the code stays simple and easy to extend.
- The floating chat panel sends uploads and messages to `/api/studypilot-chat`.
- The app now uses a small API layer for the main pages instead of having every page read raw JSON directly.
- Local mode still keeps `data/*.json` as an editable source of truth for local workflows.
- Cloudflare mode reads and writes hosted StudyPilot data through D1.

## Current modes

### Local mode

- Start with:
  `npm run studypilot:start`
- Open:
  `http://localhost:3000`
- Best for:
  - Google Classroom sync
  - local scheduled tasks
  - local file uploads
  - JSON editing and debugging
  - local D1 sync and verification

### Cloudflare mode

- Live URL:
  `https://studypilot.kevin-apps.com`
- Best for:
  - opening the app from anywhere
  - using the floating chat on the internet
  - uploading slides, PDFs, and mistakes to the hosted app
  - saving hosted study updates into D1

## Local JSON files

- Update `data/today.json` for dashboard tasks due today.
- Update `data/week.json` for weekly study tasks.
- Update `data/next-week.json` for dashboard tasks that are coming up next week.
- Update `data/mistakes.json` to add new mistake notebook entries.
- `data/upload-analysis.json` can be refreshed automatically from the uploads folder.
- `data/mistake-drafts.json` stores first-pass draft cards for photographed mistakes.
- `data/classroom-updates.json` can be refreshed automatically from Google Classroom when local credentials are available.
- Update `data/science.json`, `data/math.json`, and `data/english.json` to add more topic support.
- `data/science.json` also includes an SNC1W schedule section that can be updated from the course calendar.
- Keep the existing field names so the local JSON fallback continues rendering correctly.

## How to open the app locally

### Full local mode

1. Copy `studypilot/.env.example` to `.env` in the repo root.
2. Add your `OPENAI_API_KEY`.
3. Run `npm install` if dependencies are not installed yet.
4. Run `npm run studypilot:start`.
5. Open `http://localhost:3000`.

This mode serves the StudyPilot pages and the floating Codex chat API from the same local Node server.

### Static preview only

1. Open the `studypilot` folder in VS Code.
2. Start a simple local static server such as the VS Code Live Server extension.
3. Open `index.html` through that local server.

This is fine for front-end layout checks, but not for real chat or write-back behavior.

## Upload help inside the app

- Open `upload-guide.html` from the navigation bar for instructions on what file types work best and how to ask Codex to analyze them.
- Open `updates.html` from the navigation bar to see the latest upload analysis, Classroom summaries, and auto-synced tasks.
- Local upload analysis output is saved to `data/upload-analysis.json`.
- Collaboration defaults and standing rules are stored in `WORKFLOW.md`.
- Stable local study-resource pages can be stored in `resources/` and linked from task JSON entries.

## Scheduled upload analysis

- `scripts/analyze_uploads.py` scans `uploads/` and writes a summary report to `data/upload-analysis.json`.
- `scripts/run-upload-analysis.ps1` runs that analysis manually.
- `scripts/register-upload-analysis-task.ps1` registers a Windows scheduled task called `StudyPilot Upload Analysis`.
- `scripts/run-studypilot-update.ps1` is the general local update script.
- `scripts/register-studypilot-update-task.ps1` registers a Windows scheduled task called `StudyPilot Update`.
- The default schedule refreshes the upload analysis every hour.
- The update task can also refresh `data/classroom-updates.json`.

## Where future Codex prompts can extend the app

- Add more subjects or more topic entries in the JSON files.
- Add a new intake workflow for photographed mistakes from `uploads/mistakes/`.
- Add manual import helpers for Google Classroom task data later.
- Expand review scheduling logic in `scripts/review.js`.
- Add upload parsing for timetable images or study documents in `uploads/timetable/` and `uploads/docs/`.
- Connect the dashboard chat panel to a real Codex or OpenAI-backed endpoint.

## Dashboard chat panel

- The floating chat now defaults to real API mode and sends requests to `/api/studypilot-chat`.
- The local server lives at `studypilot/server/app.js`.
- In Cloudflare mode, the Worker lives at `studypilot/cloudflare/worker.mjs`.
- File attachments are uploaded through the local server or Worker, then forwarded to OpenAI using the Files API with purpose `user_data`.
- Model replies are generated through the OpenAI Responses API.
- The default model is `gpt-5`, and you can override it with `OPENAI_MODEL` in `.env`.
- For security, keep API keys on the server side instead of inside the browser.
- In local Node mode, the chat writes structured updates into `data/*.json` and also syncs local D1.
- In Cloudflare mode, the chat writes hosted updates directly into D1.
- Typical flow:
  - teacher slide or handout -> adds a new support card to the relevant subject page
  - mistake upload -> adds a new Mistakes Notebook entry
  - helpful follow-up tasks -> can be added into dashboard task buckets
- After a successful update, the current page reloads automatically so the new content appears.

## Cloudflare deployment

- StudyPilot can also be deployed as a single Cloudflare Worker with static assets plus the `/api/studypilot-chat` endpoint.
- Cloudflare deployment files live in `studypilot/wrangler.toml`, `studypilot/cloudflare/worker.mjs`, and `studypilot/.assetsignore`.
- `studypilot/.assetsignore` is now deny-by-default and only publishes front-end assets that the website actually needs.

### Deploy steps

1. Log in to Cloudflare:
   `npx wrangler login`
2. Add your OpenAI key as a Worker secret:
   `npx wrangler secret put OPENAI_API_KEY --config studypilot/wrangler.toml`
3. Optional: change the default model in `studypilot/wrangler.toml`.
4. Deploy:
   `npm run studypilot:cf:deploy`

### Current live domain

- Production-style personal URL:
  `https://studypilot.kevin-apps.com`

### Local Cloudflare preview

- Run:
  `npm run studypilot:cf:dev`
- This previews the Worker and static assets locally using Wrangler.

### Live Cloudflare check

- Run:
  `npm run studypilot:cf:check`
- This checks the live internet version, including health, dashboard data, and remote D1 counts.

### Personal-use protection

- After deployment, you can add Cloudflare Access in the dashboard if you want the app URL limited to only yourself or a small allowlist.

### Important persistence note

- The Cloudflare Worker deployment does not write changes back into the local `data/*.json` files on your computer.
- The Cloudflare Worker now writes chat-driven updates into hosted D1 so the live internet version can persist new study cards, tasks, and mistake entries.
- The local Node/Express version still remains the stronger automation mode for Google Classroom sync and local file workflows.

## D1 groundwork

- A first-pass D1 schema now lives in `studypilot/d1/`.
- Start with:
  - `studypilot/d1/migrations/0001_initial_schema.sql`
  - `studypilot/d1/migrations/0002_seed_subjects.sql`
  - `studypilot/d1/README.md`
  - `studypilot/d1/json-to-d1-mapping.md`
- This schema is designed so local sync and cloud chat can eventually write to the same database instead of diverging between local JSON and cloud-only state.
- `studypilot/wrangler.toml` now also includes a commented D1 binding example for later activation.

## Practical usage

- Local mode is still the best place to run Google Classroom sync and scheduled automation.
- Cloudflare mode is the best place to use the app from outside your local machine.
- If a teacher uploads a new slide, PDF, or handout:
  - upload it in the floating chat
  - send a simple instruction such as:
    `This is my teacher's new science slide. Please process it, turn it into simple English, and update the website.`
- If you upload a new mistake:
  - use a prompt such as:
    `This is my new science mistake. Please explain it in simple English and update the website with study help.`
- For class prep:
  - use:
    `This is my teacher's new lesson PDF. Please explain the key ideas in simple English, tell me what I should prepare for class, and update the website.`

## Notes for future extensions

- The placeholder intake function lives in `scripts/mistakes.js`.
- The first version of photographed mistake intake now creates draft cards from files in `uploads/mistakes/`.
- For Google Drive materials, the recommended workflow is to download the file into `uploads/docs/` or share a public link instead of relying on automated Drive login.
- The current structure keeps content and layout separate so Codex can extend it gradually.
- V1 is intentionally beginner-friendly so students and parents can edit the files without a framework or backend.
