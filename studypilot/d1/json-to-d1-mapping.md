# JSON To D1 Mapping

This note translates the current StudyPilot JSON shape into the new D1 tables.

## `today.json`, `week.json`, `next-week.json`

Current shape:

```json
{
  "tasks": [
    {
      "subject": "Science",
      "topic": "Preview: Gas Test Lab",
      "type": "preview",
      "note": "Before Monday's class...",
      "dueDate": "2026-03-30",
      "priority": "High"
    }
  ]
}
```

D1 target:

- `study_tasks.bucket`
  - `today`, `week`, or `nextWeek`
- `study_tasks.subject_slug`
  - `science`, `math`, `english`
- `study_tasks.topic`
- `study_tasks.task_type`
- `study_tasks.note`
- `study_tasks.due_date`
- `study_tasks.priority`
- optional classroom/source columns when available

## `science.json`, `math.json`, `english.json`

Current topic cards contain:

- one card title
- one summary
- several named sections

D1 target:

- `subject_topic_cards`
  - one row per visible study card
- `subject_topic_sections`
  - one row per section item

Example:

- card:
  - title = `Current Chemistry Test Range`
  - summary = `The current Chemistry test range starts...`
- sections:
  - `keyConcepts`
  - `teacherNotes`
  - `resources`
  - `quizEasy`
  - `quizMedium`
  - `quizHard`
  - `feynmanChecklist`
  - `applications`

## `science.json -> upcomingSupport`

Current shape is already card-based with multiple named sections.

D1 target:

- `upcoming_support_items`
  - one row per upcoming lesson card
- `upcoming_support_sections`
  - one row per bullet or resource

This lets Science show multiple upcoming topics cleanly, which matches your recent requirement.

## `mistakes.json`

D1 target:

- one mistake row -> `mistakes`

This supports:

- Mistakes Notebook
- Review queue
- future retry scheduling

## `classroom-updates.json`

D1 target:

- one file generation -> `classroom_sync_runs`
- one course -> `classroom_courses`
- one topic header -> `classroom_topics`
- one classroom post -> `classroom_items`

This preserves local sync history without forcing the UI to parse the raw JSON every time.
