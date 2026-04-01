document.addEventListener("DOMContentLoaded", async () => {
  const { fetchJson, toList } = window.StudyUtils;
  const { renderTaskGroups } = window.StudyApp;
  const dashboardData = await loadDashboardData(fetchJson);
  const todayTasks = toList(dashboardData?.tasks?.today);
  const weekTasks = toList(dashboardData?.tasks?.week);
  const nextWeekTasks = toList(dashboardData?.tasks?.nextWeek);
  const reviewCount = Number(dashboardData?.totals?.mistakesForReview || 0);

  renderTaskGroups("today-tasks", todayTasks);
  renderTaskGroups("week-tasks", weekTasks);
  renderTaskGroups("next-week-tasks", nextWeekTasks);

  refreshTaskTotals();
  document.getElementById("mistakes-total").textContent = String(reviewCount);

  setupTaskSwitcher();
  document.addEventListener("studypilot:tasks-changed", refreshTaskTotals);
});

function setupTaskSwitcher() {
  const buttons = Array.from(document.querySelectorAll(".task-switch"));
  const panels = Array.from(document.querySelectorAll(".task-panel"));

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;

      buttons.forEach((item) => item.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
}

function refreshTaskTotals() {
  setTaskTotal("today-total", "today-tasks");
  setTaskTotal("week-total", "week-tasks");
  setTaskTotal("next-week-total", "next-week-tasks");
}

function setTaskTotal(totalId, panelId) {
  const totalNode = document.getElementById(totalId);
  const panel = document.getElementById(panelId);
  if (!totalNode || !panel) {
    return;
  }

  const remaining = panel.querySelectorAll(".task-item .task-complete-toggle:not(:checked)").length;
  totalNode.textContent = String(remaining);
}

async function loadDashboardData(fetchJson) {
  const { buildRecurringClubTasks, buildRecurringGrade10MathTasks, buildRecurringSlideQuizTasks } = window.StudyUtils;
  const apiPayload = await fetchJson("./api/studypilot-dashboard", null);
  if (apiPayload && apiPayload.tasks && apiPayload.totals) {
    return apiPayload;
  }

  const [todayData, weekData, nextWeekData, mistakesData] = await Promise.all([
    fetchJson("./data/today.json", { tasks: [] }),
    fetchJson("./data/week.json", { tasks: [] }),
    fetchJson("./data/next-week.json", { tasks: [] }),
    fetchJson("./data/mistakes.json", { mistakes: [] })
  ]);

  const todayTasks = Array.isArray(todayData.tasks) ? todayData.tasks : [];
  const weekTasks = Array.isArray(weekData.tasks) ? weekData.tasks : [];
  const nextWeekTasks = Array.isArray(nextWeekData.tasks) ? nextWeekData.tasks : [];
  const recurringTasks = [
    ...buildRecurringClubTasks(),
    ...buildRecurringGrade10MathTasks(),
    ...buildRecurringSlideQuizTasks()
  ];
  const mistakes = Array.isArray(mistakesData.mistakes) ? mistakesData.mistakes : [];
  const normalizedBuckets = normalizeDashboardBuckets({
    today: [...todayTasks, ...recurringTasks.filter((task) => task.bucket === "today").map(stripTaskBucket)],
    week: [...weekTasks, ...recurringTasks.filter((task) => task.bucket === "week").map(stripTaskBucket)],
    nextWeek: [...nextWeekTasks, ...recurringTasks.filter((task) => task.bucket === "nextWeek").map(stripTaskBucket)]
  });
  const dedupedTodayTasks = dedupeDashboardTasks(normalizedBuckets.today);
  const dedupedWeekTasks = dedupeDashboardTasks(normalizedBuckets.week);
  const dedupedNextWeekTasks = dedupeDashboardTasks(normalizedBuckets.nextWeek);
  const reviewCount = mistakes.filter((mistake) => {
    const status = String(mistake.retryStatus || "").toLowerCase();
    return status.includes("review") || status.includes("retry");
  }).length;

  return {
    source: "json-fallback",
    tasks: {
      today: dedupedTodayTasks,
      week: dedupedWeekTasks,
      nextWeek: dedupedNextWeekTasks
    },
    totals: {
      today: dedupedTodayTasks.length,
      week: dedupedWeekTasks.length,
      nextWeek: dedupedNextWeekTasks.length,
      mistakesForReview: reviewCount
    }
  };
}

function stripTaskBucket(task) {
  const { bucket, ...rest } = task;
  return rest;
}

function dedupeDashboardTasks(tasks) {
  const uniqueTasks = [];
  const indexByKey = new Map();

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const key = buildTaskFamilyKey(task);
    if (!key) {
      uniqueTasks.push(task);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, uniqueTasks.length);
      uniqueTasks.push(task);
      continue;
    }

    if (scoreTask(task) > scoreTask(uniqueTasks[existingIndex])) {
      uniqueTasks[existingIndex] = task;
    }
  }

  return uniqueTasks;
}

function buildTaskFamilyKey(task) {
  const subject = String(task?.subject || "").trim().toLowerCase();
  const titleTokens = tokenizeTaskFamily(task?.topic || "");
  const resourceTokens = tokenizeTaskFamily(task?.resourceLabel || "");
  const tokens = mergeTaskFamilyTokens(titleTokens, resourceTokens);
  if (!subject || tokens.length < 2) {
    return "";
  }
  return `${subject}::${tokens.join("|")}`;
}

function tokenizeTaskFamily(text) {
  const stopWords = new Set([
    "a", "an", "and", "class", "classroom", "current", "for", "from", "in", "lesson",
    "open", "overview", "pdf", "prep", "question", "questions", "review", "study",
    "summary", "table", "task", "the", "to", "worksheet"
  ]);

  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.map((token) => token.endsWith("s") ? token.slice(0, -1) : token)
        .filter((token) => token && !stopWords.has(token)) || []
    )
  );
}

function mergeTaskFamilyTokens(titleTokens, resourceTokens) {
  const merged = [...titleTokens];
  const titleSet = new Set(titleTokens);
  for (const token of resourceTokens) {
    if (titleSet.has(token)) {
      continue;
    }
    if (/^\d+$/.test(token)) {
      continue;
    }
    merged.push(token);
  }
  return merged;
}

function scoreTask(task) {
  const priorityScore = {
    high: 3,
    medium: 2,
    low: 1
  }[String(task?.priority || "").toLowerCase()] || 0;

  const dueDateScore = task?.dueDate ? 1 : 0;
  const resourceScore = task?.resourceLink || task?.resourceLabel ? 1 : 0;

  return priorityScore * 10 + dueDateScore * 2 + resourceScore;
}

function normalizeDashboardBuckets(taskBuckets, referenceDate = new Date()) {
  const today = buildStudyDate(referenceDate);
  return {
    today: (Array.isArray(taskBuckets.today) ? taskBuckets.today : []).filter((task) => taskMatchesBucket(task, "today", today)),
    week: (Array.isArray(taskBuckets.week) ? taskBuckets.week : []).filter((task) => taskMatchesBucket(task, "week", today)),
    nextWeek: (Array.isArray(taskBuckets.nextWeek) ? taskBuckets.nextWeek : []).filter((task) => taskMatchesBucket(task, "nextWeek", today))
  };
}

function taskMatchesBucket(task, bucket, today) {
  const parsed = parseDashboardDueDate(task?.dueDate, today);
  if (!parsed) {
    return true;
  }

  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (bucket === "today") {
    return diffDays === 0;
  }
  if (bucket === "week") {
    return diffDays >= 1 && diffDays <= 7;
  }
  if (bucket === "nextWeek") {
    return diffDays >= 8;
  }
  return true;
}

function parseDashboardDueDate(value, today = buildStudyDate()) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  if (/^today$/i.test(text)) {
    return today;
  }

  if (/^tomorrow$/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  const relativeMatch = text.match(/^in\s+(\d+)\s+days?$/i);
  if (relativeMatch) {
    const future = new Date(today);
    future.setUTCDate(future.getUTCDate() + Number(relativeMatch[1] || 0));
    return future;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  return null;
}

function buildStudyDate(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 1);
  const day = Number(parts.find((part) => part.type === "day")?.value || 1);

  return new Date(Date.UTC(year, month - 1, day));
}
