import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const classroomPath = path.join(projectRoot, "data", "classroom-updates.json");
const weekPath = path.join(projectRoot, "data", "week.json");
const nextWeekPath = path.join(projectRoot, "data", "next-week.json");

const TODAY = "2026-03-28";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toList(value) {
  return Array.isArray(value) ? value : [];
}

function parseMonthDay(text) {
  const match = normalizeText(text).match(/\b([A-Z][a-z]{2,8}) (\d{1,2})(?:, (\d{4}))?\b/);
  if (!match) {
    return null;
  }

  const [, monthName, dayText, yearText] = match;
  const year = Number(yearText || "2026");
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  if (Number.isNaN(monthIndex)) {
    return null;
  }

  const date = new Date(Date.UTC(year, monthIndex, Number(dayText)));
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromText, toText) {
  const from = new Date(`${fromText}T00:00:00`);
  const to = new Date(`${toText}T00:00:00`);
  return Math.round((to - from) / 86400000);
}

function parseDueDate(meta) {
  const text = normalizeText(meta);
  if (!text) {
    return null;
  }

  if (/due yesterday/i.test(text)) {
    return null;
  }

  if (/no due date/i.test(text)) {
    return null;
  }

  const parsed = parseMonthDay(text.replace("Due ", ""));
  if (!parsed) {
    return null;
  }

  return daysBetween(TODAY, parsed) >= 0 ? parsed : null;
}

function includesAssignment(meta) {
  return /assignment/i.test(normalizeText(meta));
}

function includesMaterial(meta) {
  return /material/i.test(normalizeText(meta));
}

function notPastDue(item) {
  return Boolean(parseDueDate(item.meta));
}

function buildMathTask(classroom) {
  const cycle3 = toList(classroom.topicSections).find((section) => normalizeText(section.topic) === "Cycle 3");
  if (!cycle3) {
    return null;
  }

  const upcoming = toList(cycle3.items).find((item) => includesAssignment(item.meta) && notPastDue(item));

  if (!upcoming) {
    return null;
  }

  return {
    subject: "Math",
    topic: `Math classroom: ${normalizeText(upcoming.title)}`,
    type: "homework",
    note: `Auto-synced from Google Classroom Cycle 3. ${normalizeText(upcoming.meta)}. Keep this as a real posted class item.`,
    dueDate: parseDueDate(upcoming.meta),
    priority: "High",
    resourceLabel: "Open box plots review",
    resourceLink: "resources/math/box-plots-review.html",
    classroomTopic: "Cycle 3",
    classroomType: "assignment",
    source: "classroom-sync",
    sourceKey: "math-latest-due"
  };
}

function buildMathReviewTask(classroom) {
  const cycle3 = toList(classroom.topicSections).find((section) => normalizeText(section.topic) === "Cycle 3");
  if (!cycle3) {
    return null;
  }

  const latestPractice = toList(cycle3.items)
    .filter((item) => includesAssignment(item.meta))
    .filter((item) => /3\.0(8|6|5|4)|pixel art/i.test(normalizeText(item.title)))
    .slice(0, 3)
    .map((item) => normalizeText(item.title));

  if (!latestPractice.length) {
    return null;
  }

  return {
    subject: "Math",
    topic: "Math classroom: latest Cycle 3 practice",
    type: "review",
    note: `Auto-synced from Google Classroom. Focus on: ${latestPractice.join("; ")}.`,
    dueDate: "2026-03-31",
    priority: "Medium",
    resourceLabel: "Open box plots review",
    resourceLink: "resources/math/box-plots-review.html",
    classroomTopic: "Cycle 3",
    classroomType: "review",
    source: "classroom-sync",
    sourceKey: "math-cycle3-review"
  };
}

function buildScienceTask(classroom) {
  const chemistry = toList(classroom.topicSections).find((section) => normalizeText(section.topic) === "Chemistry");
  if (!chemistry) {
    return null;
  }

  const latest = toList(chemistry.items)
    .filter((item) => includesMaterial(item.meta) || includesAssignment(item.meta))
    .slice(0, 3)
    .map((item) => normalizeText(item.title))
    .filter(Boolean);
  if (!latest.length) {
    return null;
  }

  return {
    subject: "Science",
    topic: "Science classroom: Chemistry review from latest posts",
    type: "review",
    note: `Auto-synced from Google Classroom Chemistry posts. Review: ${latest.join("; ")}. This is review support, not a confirmed test notice.`,
    dueDate: "2026-03-31",
    priority: "High",
    classroomTopic: "Chemistry",
    classroomType: "review",
    source: "classroom-sync",
    sourceKey: "science-latest-review"
  };
}

function buildScienceLabTask(classroom) {
  const chemistry = toList(classroom.topicSections).find((section) => normalizeText(section.topic) === "Chemistry");
  if (!chemistry) {
    return null;
  }

  const latestTopic = toList(chemistry.items)
    .map((item) => normalizeText(item.title))
    .find((title) => /atomic theory|periodic table/i.test(title));

  if (!latestTopic) {
    return null;
  }

  return {
    subject: "Science",
    topic: `Science classroom: ${latestTopic}`,
    type: "learn",
    note: "Auto-synced from Google Classroom Chemistry materials. Use this as current study focus support.",
    dueDate: "2026-04-01",
    priority: "Medium",
    classroomTopic: "Chemistry",
    classroomType: "material",
    source: "classroom-sync",
    sourceKey: "science-current-focus"
  };
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function removeSyncedTasks(tasks) {
  return toList(tasks).filter((task) => normalizeText(task.source) !== "classroom-sync");
}

async function main() {
  const classroomData = await readJson(classroomPath, { classrooms: [] });
  const weekData = await readJson(weekPath, { tasks: [] });
  const nextWeekData = await readJson(nextWeekPath, { tasks: [] });

  const math = toList(classroomData.classrooms).find((item) => item.key === "math");
  const science = toList(classroomData.classrooms).find((item) => item.key === "science");

  const generatedTasks = [
    buildMathTask(math || {}),
    buildMathReviewTask(math || {}),
    buildScienceTask(science || {}),
    buildScienceLabTask(science || {})
  ].filter(Boolean);

  const freshWeekTasks = removeSyncedTasks(weekData.tasks);
  const freshNextWeekTasks = removeSyncedTasks(nextWeekData.tasks);

  for (const task of generatedTasks) {
    const delta = daysBetween(TODAY, task.dueDate);
    if (delta >= 0 && delta <= 7) {
      freshWeekTasks.push(task);
    } else if (delta > 7) {
      freshNextWeekTasks.push(task);
    }
  }

  freshWeekTasks.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  freshNextWeekTasks.sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));

  await writeJson(weekPath, { tasks: freshWeekTasks });
  await writeJson(nextWeekPath, { tasks: freshNextWeekTasks });

  console.log(`Synced ${generatedTasks.length} classroom task(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
