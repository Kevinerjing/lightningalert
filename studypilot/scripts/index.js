document.addEventListener("DOMContentLoaded", async () => {
  const { fetchJson, toList } = window.StudyUtils;
  const { renderTaskGroups } = window.StudyApp;

  const [todayData, weekData, nextWeekData, mistakesData] = await Promise.all([
    fetchJson("./data/today.json", { tasks: [] }),
    fetchJson("./data/week.json", { tasks: [] }),
    fetchJson("./data/next-week.json", { tasks: [] }),
    fetchJson("./data/mistakes.json", { mistakes: [] })
  ]);

  const todayTasks = toList(todayData.tasks);
  const weekTasks = toList(weekData.tasks);
  const nextWeekTasks = toList(nextWeekData.tasks);
  const mistakes = toList(mistakesData.mistakes);
  const reviewCount = mistakes.filter((mistake) => {
    const status = String(mistake.retryStatus || "").toLowerCase();
    return status.includes("review") || status.includes("retry");
  }).length;

  renderTaskGroups("today-tasks", todayTasks);
  renderTaskGroups("week-tasks", weekTasks);
  renderTaskGroups("next-week-tasks", nextWeekTasks);

  document.getElementById("today-total").textContent = String(todayTasks.length);
  document.getElementById("week-total").textContent = String(weekTasks.length);
  document.getElementById("next-week-total").textContent = String(nextWeekTasks.length);
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
