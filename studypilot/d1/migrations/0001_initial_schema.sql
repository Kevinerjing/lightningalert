PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('local', 'cloudflare')),
  category TEXT NOT NULL CHECK (category IN ('docs', 'mistakes', 'timetable', 'other')),
  original_name TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS subject_topic_cards (
  id TEXT PRIMARY KEY,
  subject_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual', 'classroom', 'chat_upload', 'sync')),
  source_upload_id TEXT,
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_slug) REFERENCES subjects(slug) ON DELETE CASCADE,
  FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subject_topic_cards_subject ON subject_topic_cards(subject_slug, updated_at DESC);

CREATE TABLE IF NOT EXISTS subject_topic_sections (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'resource')),
  text_value TEXT,
  label TEXT,
  url TEXT,
  FOREIGN KEY (card_id) REFERENCES subject_topic_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subject_topic_sections_card ON subject_topic_sections(card_id, section_key, item_order);

CREATE TABLE IF NOT EXISTS upcoming_support_items (
  id TEXT PRIMARY KEY,
  subject_slug TEXT NOT NULL,
  when_label TEXT,
  topic TEXT NOT NULL,
  support_type TEXT,
  summary TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'chat_upload' CHECK (source_kind IN ('manual', 'classroom', 'chat_upload', 'sync')),
  source_upload_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_slug) REFERENCES subjects(slug) ON DELETE CASCADE,
  FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_upcoming_support_subject ON upcoming_support_items(subject_slug, updated_at DESC);

CREATE TABLE IF NOT EXISTS upcoming_support_sections (
  id TEXT PRIMARY KEY,
  support_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'resource')),
  text_value TEXT,
  label TEXT,
  url TEXT,
  FOREIGN KEY (support_id) REFERENCES upcoming_support_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upcoming_support_sections_support ON upcoming_support_sections(support_id, section_key, item_order);

CREATE TABLE IF NOT EXISTS science_schedule (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  current_exam_subject TEXT,
  current_exam_range_start TEXT,
  current_exam_note TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS science_schedule_units (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  unit_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  window_label TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  FOREIGN KEY (schedule_id) REFERENCES science_schedule(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_science_schedule_units_schedule ON science_schedule_units(schedule_id, unit_order);

CREATE TABLE IF NOT EXISTS science_schedule_key_dates (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  date_order INTEGER NOT NULL DEFAULT 0,
  date_label TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (schedule_id) REFERENCES science_schedule(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_science_schedule_key_dates_schedule ON science_schedule_key_dates(schedule_id, date_order);

CREATE TABLE IF NOT EXISTS study_tasks (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL CHECK (bucket IN ('today', 'week', 'nextWeek')),
  subject_slug TEXT NOT NULL,
  topic TEXT NOT NULL,
  task_type TEXT NOT NULL,
  note TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  resource_label TEXT,
  resource_url TEXT,
  classroom_topic TEXT,
  classroom_type TEXT,
  source_kind TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual', 'classroom_sync', 'chat_upload', 'sync')),
  source_key TEXT,
  source_upload_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_slug) REFERENCES subjects(slug) ON DELETE CASCADE,
  FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_bucket ON study_tasks(bucket, due_date, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_tasks_subject ON study_tasks(subject_slug, due_date);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  subject_slug TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  mistake_date TEXT,
  error_type TEXT NOT NULL,
  question TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  correction TEXT NOT NULL,
  retry_status TEXT NOT NULL,
  mastery_level INTEGER NOT NULL DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
  source_kind TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual', 'chat_upload', 'sync')),
  source_upload_id TEXT,
  image_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_slug) REFERENCES subjects(slug) ON DELETE CASCADE,
  FOREIGN KEY (source_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject_slug, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistakes_retry_status ON mistakes(retry_status, mastery_level);

CREATE TABLE IF NOT EXISTS classroom_sync_runs (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  account TEXT,
  login_status TEXT,
  profile_dir TEXT,
  notes_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classroom_courses (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  course_key TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  page_title TEXT,
  authenticated INTEGER NOT NULL DEFAULT 0 CHECK (authenticated IN (0, 1)),
  FOREIGN KEY (run_id) REFERENCES classroom_sync_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_classroom_courses_run ON classroom_courses(run_id, course_key);

CREATE TABLE IF NOT EXISTS classroom_topics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES classroom_courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_classroom_topics_course ON classroom_topics(course_id, topic_order);

CREATE TABLE IF NOT EXISTS classroom_items (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  title TEXT NOT NULL,
  meta TEXT,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_recent INTEGER NOT NULL DEFAULT 0 CHECK (is_recent IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES classroom_courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_classroom_items_course ON classroom_items(course_id, topic_name, item_order);
CREATE INDEX IF NOT EXISTS idx_classroom_items_recent ON classroom_items(course_id, is_recent, item_order);
