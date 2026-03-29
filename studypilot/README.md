# Study Mission Assistant

Study Mission Assistant is a simple local web app for a student to organize daily and weekly study tasks, review subject support pages, and track mistakes that need correction and retry.

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

## How the project works

- The app uses plain HTML, CSS, and vanilla JavaScript only.
- Local JSON files inside `data/` are the source for tasks, mistake entries, and subject support content.
- The app prefers real data only. If a section has no data yet, it stays empty and shows a simple empty state.
- Shared helper functions live in `scripts/utils.js`.
- Shared page helpers live in `scripts/app.js`.
- Each page has its own script file so the code stays simple and easy to extend.

## How to update JSON data

- Update `data/today.json` for dashboard tasks due today.
- Update `data/week.json` for weekly study tasks.
- Update `data/next-week.json` for dashboard tasks that are coming up next week.
- Update `data/mistakes.json` to add new mistake notebook entries.
- `data/upload-analysis.json` can be refreshed automatically from the uploads folder.
- `data/mistake-drafts.json` stores first-pass draft cards for photographed mistakes.
- `data/classroom-updates.json` can be refreshed automatically from Google Classroom when local credentials are available.
- Update `data/science.json`, `data/math.json`, and `data/english.json` to add more topic support.
- `data/science.json` also includes an SNC1W schedule section that can be updated from the course calendar.
- Keep the existing field names so the pages continue rendering correctly.

## How to open the app locally

1. Open the `studypilot` folder in VS Code.
2. Start a simple local static server such as the VS Code Live Server extension.
3. Open `index.html` through that local server.

This is recommended because the app reads local JSON files with `fetch()`, which works best when served from a local static server instead of opening the HTML directly with `file://`.

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

## Notes for future extensions

- The placeholder intake function lives in `scripts/mistakes.js`.
- The first version of photographed mistake intake now creates draft cards from files in `uploads/mistakes/`.
- For Google Drive materials, the recommended workflow is to download the file into `uploads/docs/` or share a public link instead of relying on automated Drive login.
- The current structure keeps content and layout separate so Codex can extend it gradually.
- V1 is intentionally beginner-friendly so students and parents can edit the files without a framework or backend.
