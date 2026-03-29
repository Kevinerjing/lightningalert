# StudyPilot Workflow

## Goal

Keep future collaboration short and simple.

The default rule is:
- Kevin does only the minimum needed.
- Codex handles the analysis, organization, and file updates.

## Kevin usually does

- Put new files into `uploads/`
- Run the upload analysis task when needed, or ask Codex to run it
- Log in to Google Classroom when Codex opens it
- Send very short instructions such as:
  - `run scheduled task`
  - `check math classroom`
  - `add this homework`
  - `update science`

## Codex usually does

- Run the scheduled upload analysis task
- Read `data/upload-analysis.json`
- Read `data/classroom-updates.json`
- Extract useful details from uploaded files
- Update `today.json`, `week.json`, and `next-week.json`
- Update subject JSON files when real subject data exists
- Keep the app using real data only
- Avoid inventing sample data

## Real-data rule

- Do not create fake tasks, fake mistakes, or fake lesson content.
- If data does not exist yet, leave the section empty.
- Empty sections are acceptable.
- If something is a guess, label it clearly as review or preparation, not as a confirmed test or official assignment.

## Task rule

- `today.json` should only contain tasks that are truly for today.
- Future due items should go into `week.json` or `next-week.json`.
- Routine tasks are allowed when Kevin explicitly requests them.
- If Google Classroom shows recent work but not a confirmed test, Codex may add review tasks, but must not present them as official test dates.

## Preview and exam-prep rule

- StudyPilot should support two different study needs:
  - `Preview`: help Kevin get ready for what the teacher is about to teach.
  - `Review / exam prep`: help Kevin get ready for quizzes, tests, and unit reviews.
- Preview support should usually live near the top of the relevant subject page.
- Preview support may include:
  - upcoming lesson topic
  - short summary
  - before-class reminders
  - keywords
  - quick questions
  - helpful resources
  - likely teacher-style reasoning questions
- Review or exam-prep support should be based on confirmed class content or Kevin's clearly stated test-range rule.
- If Kevin tells Codex that a set of recent lessons is the next test range, Codex may organize that into review tasks and subject support.
- Preview helps Kevin walk into class ready.
- Review helps Kevin walk into tests ready.

## Google Classroom rule

- Codex cannot log in by itself.
- Kevin logs in manually when needed.
- After login, Codex may inspect recent classwork and summarize it.
- If useful, Codex may convert recent classwork into study tasks.
- The usual Google Classroom student login account is `kjing2@ocdsb.ca`.
- Local Google Classroom credentials may be kept in `studypilot/local-secrets.json`, which must stay local and must not be committed.
- The preferred login entry point is `https://classroom.google.com/`, then Codex can navigate into the saved classrooms.
- Saved classroom URLs:
  - Math: `https://classroom.google.com/w/ODI1MDk4ODUxNTc1/t/all`
  - Science: `https://classroom.google.com/w/ODI0MzQ2MzAwMjMw/t/all`

## Google Drive rule

- Codex cannot directly own Kevin's Google Drive login.
- Google Drive may block automated login flows more strictly than Google Classroom.
- The recommended Google Drive workflow is:
  - Kevin opens Google Drive in a normal browser
  - Kevin downloads the needed file into `studypilot/uploads/docs/`
  - or Kevin shares a public view link
  - then Codex analyzes the local file or public link
- If Kevin wants Codex to inspect Drive content, the safest short instruction is still to download the file first.

## Upload analysis rule

- The scheduled task name is `StudyPilot Upload Analysis`.
- It refreshes `data/upload-analysis.json`.
- The preferred general update task name is `StudyPilot Update`.
- `StudyPilot Update` is the default scheduled task for project updates.
- `StudyPilot Update` may also refresh Google Classroom summaries when local credentials are present.
- `StudyPilot Update` may add a small number of auto-synced Classroom tasks into `week.json` or `next-week.json`.
- Auto-synced Classroom tasks must only replace older `classroom-sync` tasks and must not remove Kevin's manual tasks.
- Supported previews currently include:
  - `pdf`
  - `docx`
- Upload folders:
  - `uploads/docs/`
  - `uploads/timetable/`
  - `uploads/mistakes/`

## Stable local resource rule

- If a useful study page lives outside `studypilot`, copy it into `studypilot/resources/` when we want a stable app link.
- Task links inside StudyPilot should prefer local paths inside `studypilot/` when possible.

## Preferred short commands

- `run scheduled task`
- `run update task`
- `check math classroom`
- `check science classroom`
- `analyze uploads`
- `add to this week`
- `move out of today`
- `update from lesson file`

## Current standing agreements

- Science key dates should hide past dates.
- If Science has no topic data, hide the empty science topics section.
- Science Chemistry content from `2026-03-23` onward is currently treated as part of the next test range.
- Grade 9 Math Cycle 3 from `3.01` to the current lesson is currently treated as the next test range.
- Nick English Lesson 5 currently focuses on literary devices, especially imagery, using `There Will Come Soft Rains`.
- The app should stay simple and local-first.
- Important repeated rules should be stored here instead of repeated in chat.
