document.addEventListener("DOMContentLoaded", async () => {
  window.StudyApp.setTodayDate();

  const { fetchJson, createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const payload = await fetchJson("data/slide-quizzes.json", { quizzes: [] });
  const quizzes = toList(payload.quizzes);
  const subjects = [...new Set(quizzes.map((quiz) => quiz.subject || "General"))];
  const activeSubject = getSavedQuizSubject(subjects[0] || "Science");

  renderSubjectTabs(subjects, activeSubject);
  renderQuizCards(quizzes, activeSubject);
});

function renderSubjectTabs(subjects, activeSubject) {
  const container = document.getElementById("quiz-subject-tabs");
  if (!container) {
    return;
  }

  if (!subjects.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = subjects.map((subject) => `
    <button
      class="task-switch${subject === activeSubject ? " active" : ""}"
      type="button"
      data-quiz-subject="${escapeHtml(subject)}"
    >
      ${escapeHtml(subject)}
    </button>
  `).join("");

  container.querySelectorAll("[data-quiz-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSubject = button.getAttribute("data-quiz-subject") || "Science";
      localStorage.setItem("studypilot.quizSubject", nextSubject);
      renderSubjectTabs(subjects, nextSubject);
      renderQuizCards(window.__studypilotSlideQuizzes || [], nextSubject);
    });
  });
}

function renderQuizCards(quizzes, activeSubject) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("slide-quiz-list");
  if (!container) {
    return;
  }

  window.__studypilotSlideQuizzes = quizzes;
  const filtered = toList(quizzes).filter((quiz) => (quiz.subject || "General") === activeSubject);
  if (!filtered.length) {
    container.innerHTML = createEmptyState("No slide quizzes are ready for this subject yet.");
    return;
  }

  container.innerHTML = filtered.map((quiz) => {
    const quizKey = buildQuizKey(quiz);
    const answersOpen = localStorage.getItem(`${quizKey}::answers`) === "open";
    const sourceButton = quiz.sourceUrl && /^https?:/i.test(quiz.sourceUrl)
      ? `<a class="ghost-button quiz-source-button" href="${escapeHtml(quiz.sourceUrl)}" target="_blank" rel="noreferrer">Open slide</a>`
      : "";

    return `
      <article class="topic-card slide-quiz-card" data-slide-quiz-key="${escapeHtml(quizKey)}">
        <div class="topic-card-header">
          <div>
            <p class="section-label">${escapeHtml(quiz.subject || "General")} slide quiz</p>
            <h2>${escapeHtml(quiz.title || "Untitled quiz")}</h2>
            <p class="muted">${escapeHtml(quiz.summary || "")}</p>
          </div>
          <div class="topic-card-actions">
            <span class="chip">${escapeHtml(String(toList(quiz.questions).length))} questions</span>
            <button type="button" class="ghost-button slide-answer-toggle" aria-expanded="${answersOpen ? "true" : "false"}">
              ${answersOpen ? "Hide answer key" : "Show answer key"}
            </button>
          </div>
        </div>

        <div class="slide-quiz-meta">
          <div class="slide-quiz-reference">
            <p class="section-label">Reference slide</p>
            <p><strong>${escapeHtml(quiz.referenceSlide || quiz.title || "Teacher slide")}</strong></p>
          </div>
          ${sourceButton}
        </div>

        <div class="topic-section-grid">
          <section class="topic-section">
            <h3>Quick recall</h3>
            <ol class="quiz-question-list">
              ${toList(quiz.questions).slice(0, quiz.splitIndex || 4).map((item) => `<li>${escapeHtml(item.prompt)}</li>`).join("")}
            </ol>
          </section>
          <section class="topic-section">
            <h3>Teacher-style detail questions</h3>
            <ol class="quiz-question-list" start="${(quiz.splitIndex || 4) + 1}">
              ${toList(quiz.questions).slice(quiz.splitIndex || 4).map((item) => `<li>${escapeHtml(item.prompt)}</li>`).join("")}
            </ol>
          </section>
        </div>

        <div class="slide-answer-key${answersOpen ? "" : " collapsed"}">
          <div class="section-heading">
            <div>
              <p class="section-label">Answer key</p>
              <h3>Check the slide details after you try first</h3>
            </div>
          </div>
          <ol class="quiz-answer-list">
            ${toList(quiz.questions).map((item) => `
              <li>
                <p><strong>Q:</strong> ${escapeHtml(item.prompt)}</p>
                <p><strong>A:</strong> ${escapeHtml(item.answer)}</p>
              </li>
            `).join("")}
          </ol>
        </div>
      </article>
    `;
  }).join("");

  attachAnswerToggleHandlers(container);
}

function attachAnswerToggleHandlers(container) {
  container.querySelectorAll("[data-slide-quiz-key]").forEach((card) => {
    const key = card.getAttribute("data-slide-quiz-key");
    const button = card.querySelector(".slide-answer-toggle");
    const answerKey = card.querySelector(".slide-answer-key");
    if (!key || !button || !answerKey) {
      return;
    }

    button.addEventListener("click", () => {
      const nextOpen = answerKey.classList.contains("collapsed");
      answerKey.classList.toggle("collapsed", !nextOpen);
      button.textContent = nextOpen ? "Hide answer key" : "Show answer key";
      button.setAttribute("aria-expanded", String(nextOpen));
      localStorage.setItem(`${key}::answers`, nextOpen ? "open" : "closed");
    });
  });
}

function buildQuizKey(quiz) {
  return `studypilot.slideQuiz.${String(quiz.subject || "General").toLowerCase()}::${String(quiz.referenceSlide || quiz.title || "quiz").toLowerCase()}`;
}

function getSavedQuizSubject(fallback) {
  return localStorage.getItem("studypilot.quizSubject") || fallback;
}

function escapeHtml(value) {
  return window.StudyUtils.escapeHtml(value);
}
