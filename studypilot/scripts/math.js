document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, toList } = window.StudyUtils;
  const { renderTopicSections } = window.StudyApp;
  const [data, classroomData] = await Promise.all([
    fetchJson("../data/math.json", { topics: [] }),
    fetchJson("../data/classroom-updates.json", { classrooms: [] })
  ]);

  renderTopicSections("math-topics", toList(data.topics), {
    subjectName: "Math",
    sections: [
      { title: "Formulas", key: "formulas" },
      { title: "Step-by-step solving process", key: "solvingSteps" },
      { title: "Worked examples", key: "examples" },
      { title: "Common mistakes", key: "commonMistakes" },
      { title: "Easy practice questions", key: "practiceEasy" },
      { title: "Medium practice questions", key: "practiceMedium" },
      { title: "Hard practice questions", key: "practiceHard" }
    ]
  });

  renderMathClassroomItems(classroomData);
});

function renderMathClassroomItems(classroomData) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("math-classroom-items");
  if (!container) {
    return;
  }

  const mathClassroom = toList(classroomData.classrooms).find((item) => item.key === "math");
  const cycle3 = toList(mathClassroom?.topicSections).find((section) => section.topic === "Cycle 3");

  if (!cycle3 || !toList(cycle3.items).length) {
    container.innerHTML = createEmptyState("No recent Math classroom items were found.");
    return;
  }

  container.innerHTML = `
    <article class="group-card">
      <p class="section-label">Cycle 3</p>
      <div class="task-list">
        ${toList(cycle3.items).slice(0, 5).map((item) => `
          <div class="task-item">
            <div class="task-topline">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p class="muted">${escapeHtml(item.meta)}</p>
              </div>
              <span class="chip chip-sync">Classroom sync</span>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}
