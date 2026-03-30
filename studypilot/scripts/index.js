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
  const { buildRecurringClubTasks } = window.StudyUtils;
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
  const recurringTasks = buildRecurringClubTasks();
  const mistakes = Array.isArray(mistakesData.mistakes) ? mistakesData.mistakes : [];
  const dedupedTodayTasks = dedupeDashboardTasks([...todayTasks, ...recurringTasks.filter((task) => task.bucket === "today").map(stripTaskBucket)]);
  const dedupedWeekTasks = dedupeDashboardTasks([...weekTasks, ...recurringTasks.filter((task) => task.bucket === "week").map(stripTaskBucket)]);
  const dedupedNextWeekTasks = dedupeDashboardTasks([...nextWeekTasks, ...recurringTasks.filter((task) => task.bucket === "nextWeek").map(stripTaskBucket)]);
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
