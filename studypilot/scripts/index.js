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

  document.getElementById("today-total").textContent = String(Number(dashboardData?.totals?.today ?? todayTasks.length));
  document.getElementById("week-total").textContent = String(Number(dashboardData?.totals?.week ?? weekTasks.length));
  document.getElementById("next-week-total").textContent = String(Number(dashboardData?.totals?.nextWeek ?? nextWeekTasks.length));
  document.getElementById("mistakes-total").textContent = String(reviewCount);

  setupTaskSwitcher();
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
  const reviewCount = mistakes.filter((mistake) => {
    const status = String(mistake.retryStatus || "").toLowerCase();
    return status.includes("review") || status.includes("retry");
  }).length;

  return {
    source: "json-fallback",
    tasks: {
      today: [...todayTasks, ...recurringTasks.filter((task) => task.bucket === "today").map(stripTaskBucket)],
      week: [...weekTasks, ...recurringTasks.filter((task) => task.bucket === "week").map(stripTaskBucket)],
      nextWeek: [...nextWeekTasks, ...recurringTasks.filter((task) => task.bucket === "nextWeek").map(stripTaskBucket)]
    },
    totals: {
      today: todayTasks.length + recurringTasks.filter((task) => task.bucket === "today").length,
      week: weekTasks.length + recurringTasks.filter((task) => task.bucket === "week").length,
      nextWeek: nextWeekTasks.length + recurringTasks.filter((task) => task.bucket === "nextWeek").length,
      mistakesForReview: reviewCount
    }
  };
}

function stripTaskBucket(task) {
  const { bucket, ...rest } = task;
  return rest;
}
