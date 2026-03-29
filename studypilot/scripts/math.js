document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, toList } = window.StudyUtils;
  const { renderTopicSections } = window.StudyApp;
  const data = await loadMathData(fetchJson);

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

  renderMathClassroomItems(data.classroomItems);
});

function renderMathClassroomItems(items) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("math-classroom-items");
  if (!container) {
    return;
  }

  const classroomItems = toList(items);
  if (!classroomItems.length) {
    container.innerHTML = createEmptyState("No recent Math classroom items were found.");
    return;
  }

  container.innerHTML = `
    <article class="group-card">
      <p class="section-label">Cycle 3</p>
      <div class="task-list">
        ${classroomItems.slice(0, 5).map((item) => `
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

async function loadMathData(fetchJson) {
  const { toList } = window.StudyUtils;
  const apiPayload = await fetchJson("../api/studypilot-math", null);
  if (apiPayload && apiPayload.topics) {
    return apiPayload;
  }

  const [mathData, classroomData] = await Promise.all([
    fetchJson("../data/math.json", { topics: [] }),
    fetchJson("../data/classroom-updates.json", { classrooms: [] })
  ]);

  const mathClassroom = toList(classroomData.classrooms).find((item) => item.key === "math");
  const cycle3 = toList(mathClassroom?.topicSections).find((section) => section.topic === "Cycle 3");

  return {
    source: "json-fallback",
    topics: toList(mathData.topics),
    classroomItems: toList(cycle3?.items)
  };
}
