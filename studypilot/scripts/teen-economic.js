(function () {
  const { fetchJson, escapeHtml, createEmptyState } = window.StudyUtils;

  function renderPackMeta(pack) {
    const meta = document.getElementById("teen-pack-meta");
    if (!meta) {
      return;
    }

    meta.innerHTML = `
      <span class="badge">${escapeHtml(pack.weekLabel || "Current week")}</span>
      <span class="badge">1 weekly pack</span>
    `;
  }

  function renderSourceFiles(files) {
    const container = document.getElementById("teen-source-files");
    if (!container) {
      return;
    }

    if (!Array.isArray(files) || !files.length) {
      container.innerHTML = createEmptyState("No Teen Economic PDFs yet.");
      return;
    }

    container.innerHTML = files.map((file) => `
      <article class="group-card teen-file-card">
        <p class="section-label">Source PDF</p>
        <h3>${escapeHtml(file.englishTitle || file.label)}</h3>
        <p class="muted"><strong>File:</strong> ${escapeHtml(file.label || "Unknown file")}</p>
        <p class="muted">${escapeHtml(file.note || "")}</p>
        ${file.url ? `<p><a class="inline-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">Open PDF</a></p>` : ""}
      </article>
    `).join("");
  }

  function renderKeyEnglish(items) {
    const container = document.getElementById("teen-key-english");
    if (!container) {
      return;
    }

    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = createEmptyState("No English support added yet.");
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="group-card teen-english-card">
        <h3>${escapeHtml(item.term || "Key term")}</h3>
        <p><strong>Simple meaning:</strong> ${escapeHtml(item.meaning || "")}</p>
        <p class="muted">${escapeHtml(item.support || "")}</p>
      </article>
    `).join("");
  }

  function renderQuestionBrief(brief) {
    const container = document.getElementById("teen-question-brief");
    const title = document.getElementById("teen-question-title");
    const meaning = document.getElementById("teen-question-meaning");

    if (!container || !title || !meaning) {
      return;
    }

    title.textContent = brief?.question || "Main question";
    meaning.textContent = brief?.whatItMeans || "Read the lesson question, then explain it in simple English.";

    const steps = Array.isArray(brief?.whatToDo) ? brief.whatToDo : [];
    container.innerHTML = `
      <p><strong>Question:</strong> ${escapeHtml(brief?.question || "")}</p>
      <p><strong>What it means:</strong> ${escapeHtml(brief?.whatItMeans || "")}</p>
      ${steps.length ? `
        <p><strong>What you need to do:</strong></p>
        <ul>
          ${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ul>
      ` : ""}
    `;
  }

  function renderAnswerStarter(starter) {
    const container = document.getElementById("teen-answer-starter");
    if (!container) {
      return;
    }

    const starters = Array.isArray(starter?.sentenceStarters) ? starter.sentenceStarters : [];
    container.innerHTML = `
      <p class="teen-answer-paragraph">${escapeHtml(starter?.paragraph || "")}</p>
      ${starters.length ? `
        <p><strong>Useful sentence starters:</strong></p>
        <ul>
          ${starters.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      ` : ""}
    `;
  }

  function renderWeeklyTasks(tasks) {
    const container = document.getElementById("teen-weekly-tasks");
    if (!container) {
      return;
    }

    if (!Array.isArray(tasks) || !tasks.length) {
      container.innerHTML = createEmptyState("No Teen Economic checklist yet.");
      return;
    }

    container.innerHTML = `
      <ul>
        ${tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}
      </ul>
    `;
  }

  async function initTeenEconomicPage() {
    const data = await fetchJson("data/teen-economic.json", {});
    const pack = data.currentPack || {};

    const title = document.getElementById("teen-pack-title");
    const summary = document.getElementById("teen-pack-summary");

    if (title) {
      title.textContent = pack.title || "Teen Economic weekly pack";
    }

    if (summary) {
      summary.textContent = pack.summary || "Use this page to keep the week's Teen Economic reading, question help, and writing support together.";
    }

    renderPackMeta(pack);
    renderSourceFiles(pack.sourceFiles);
    renderKeyEnglish(pack.keyEnglish);
    renderQuestionBrief(pack.questionBrief || pack.questionFocus || {});
    renderAnswerStarter(pack.answerStarter || {});
    renderWeeklyTasks(pack.weeklyTasks);
  }

  document.addEventListener("DOMContentLoaded", initTeenEconomicPage);
})();
