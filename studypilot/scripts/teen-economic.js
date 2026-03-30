(function () {
  const { fetchJson, escapeHtml, createEmptyState } = window.StudyUtils;

  function renderPackMeta(pack) {
    const meta = document.getElementById("teen-pack-meta");
    if (!meta) {
      return;
    }

    const count = Array.isArray(pack.articles) ? pack.articles.length : 0;
    meta.innerHTML = `
      <span class="badge">${escapeHtml(pack.weekLabel || "Current week")}</span>
      <span class="badge">${count || 0} articles</span>
    `;
  }

  function renderOverview(items) {
    const container = document.getElementById("teen-pack-overview");
    if (!container) {
      return;
    }

    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  function renderArticleTabs(articles, activeId) {
    const container = document.getElementById("teen-article-tabs");
    if (!container) {
      return;
    }

    if (!Array.isArray(articles) || !articles.length) {
      container.innerHTML = createEmptyState("No Teen Economic articles yet.");
      return;
    }

    container.innerHTML = articles.map((article) => `
      <button class="task-switch teen-article-tab ${article.id === activeId ? "active" : ""}" data-teen-article="${escapeHtml(article.id)}">
        ${escapeHtml(article.tabLabel || article.title || "Article")}
      </button>
    `).join("");
  }

  function renderSourceFile(file) {
    const container = document.getElementById("teen-source-file");
    if (!container) {
      return;
    }

    if (!file) {
      container.innerHTML = createEmptyState("No source PDF yet.");
      return;
    }

    container.innerHTML = `
      <article class="group-card teen-file-card">
        <p class="section-label">Source PDF</p>
        <h3>${escapeHtml(file.englishTitle || file.label || "Source PDF")}</h3>
        <p class="muted"><strong>File:</strong> ${escapeHtml(file.label || "Unknown file")}</p>
        <p class="muted">${escapeHtml(file.note || "")}</p>
        ${file.url ? `<p><a class="inline-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">Open PDF</a></p>` : ""}
      </article>
    `;
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

  function renderActiveArticle(article) {
    const articleTitle = document.getElementById("teen-active-article-title");
    const articleSummary = document.getElementById("teen-active-article-summary");

    if (articleTitle) {
      articleTitle.textContent = article?.title || "Teen Economic article";
    }

    if (articleSummary) {
      articleSummary.textContent = article?.summary || "";
    }

    renderSourceFile(article?.sourceFile || null);
    renderKeyEnglish(article?.keyEnglish || []);
    renderQuestionBrief(article?.questionBrief || {});
    renderAnswerStarter(article?.answerStarter || {});
  }

  async function initTeenEconomicPage() {
    const data = await fetchJson("data/teen-economic.json", {});
    const pack = data.currentPack || {};
    const articles = Array.isArray(pack.articles) ? pack.articles : [];
    let activeId = articles[0]?.id || "";

    const title = document.getElementById("teen-pack-title");
    const summary = document.getElementById("teen-pack-summary");

    if (title) {
      title.textContent = pack.title || "Teen Economic weekly pack";
    }

    if (summary) {
      summary.textContent = pack.summary || "Use this page to keep the week's Teen Economic reading, question help, and writing support together.";
    }

    renderPackMeta(pack);
    renderOverview(pack.overview || []);
    renderArticleTabs(articles, activeId);
    renderWeeklyTasks(pack.weeklyTasks);
    renderActiveArticle(articles.find((article) => article.id === activeId) || articles[0] || null);

    const tabContainer = document.getElementById("teen-article-tabs");
    if (!tabContainer) {
      return;
    }

    tabContainer.addEventListener("click", (event) => {
      const button = event.target.closest("[data-teen-article]");
      if (!button) {
        return;
      }

      activeId = button.getAttribute("data-teen-article") || activeId;
      renderArticleTabs(articles, activeId);
      renderActiveArticle(articles.find((article) => article.id === activeId) || articles[0] || null);
    });
  }

  document.addEventListener("DOMContentLoaded", initTeenEconomicPage);
})();
