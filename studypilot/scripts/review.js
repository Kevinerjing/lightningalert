document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, groupBy, sortSubjects, statusClass, toList } = window.StudyUtils;
  const data = await loadReviewData(fetchJson);
  const reviewItems = toList(data.reviewItems);
  const reviewedItems = reviewItems.filter(isReviewMarkedDone);
  const activeItems = reviewItems.filter((item) => !isReviewMarkedDone(item));
  const totalActive = activeItems.length;

  document.getElementById("review-total").textContent = `${totalActive} items need review today`;
  document.getElementById("review-suggestion").textContent = data.suggestion || getReviewSuggestion(totalActive);
  renderPriorityList(activeItems);

  const container = document.getElementById("review-groups");
  if (!reviewItems.length) {
    container.innerHTML = createEmptyState("No review items are due today.");
    return;
  }

  const grouped = groupBy(activeItems, "subject");
  const orderedSubjects = sortSubjects(Object.keys(grouped));
  const completedMarkup = reviewedItems.length
    ? `
      <article class="review-card">
        <p class="section-label">Done today</p>
        <div class="task-list">
          ${reviewedItems.map((mistake) => renderReviewItem(mistake, { completed: true, statusClass, escapeHtml })).join("")}
        </div>
      </article>
    `
    : "";

  container.innerHTML = [
    ...orderedSubjects.map((subject) => `
    <article class="review-card">
      <p class="section-label">${escapeHtml(subject)}</p>
      <div class="task-list">
        ${grouped[subject].map((mistake) => renderReviewItem(mistake, { completed: false, statusClass, escapeHtml })).join("")}
      </div>
    </article>
  `),
    completedMarkup
  ].filter(Boolean).join("");

  attachReviewToggleHandlers(container);
});

async function loadReviewData(fetchJson) {
  const apiPayload = await fetchJson("./api/studypilot-review", null);
  if (apiPayload && Array.isArray(apiPayload.reviewItems)) {
    return apiPayload;
  }

  const data = await fetchJson("./data/mistakes.json", { mistakes: [] });
  const mistakes = Array.isArray(data.mistakes) ? data.mistakes : [];
  const reviewItems = mistakes.filter(shouldReviewToday);

  return {
    source: "json-fallback",
    reviewItems,
    total: reviewItems.length,
    suggestion: getReviewSuggestion(reviewItems.length)
  };
}

function shouldReviewToday(mistake) {
  const status = String(mistake.retryStatus || "").toLowerCase();
  const mastery = Number(mistake.masteryLevel || 0);

  if (status.includes("review now") || status.includes("retry today")) {
    return true;
  }

  if (status.includes("retry soon") && mastery < 4) {
    return true;
  }

  if (status.includes("partial") && mastery <= 2) {
    return true;
  }

  return false;
}

function buildReviewNote(mistake) {
  const status = String(mistake.retryStatus || "").toLowerCase();
  if (status.includes("review now")) {
    return "Explain the idea out loud, then redo a similar question without notes.";
  }
  if (status.includes("retry today")) {
    return "Retry this today and compare each step with the correction.";
  }
  if (status.includes("retry soon")) {
    return "Schedule a short review block and make one fresh practice attempt.";
  }
  return "Do a quick explanation check and decide if this can move to a lighter review cycle.";
}

function getReviewSuggestion(total) {
  if (total >= 5) {
    return "Start with the hardest subject first, then finish with one confidence-building question.";
  }
  if (total >= 2) {
    return "Spend 10 to 15 minutes reviewing errors, then retest yourself on the same idea.";
  }
  if (total === 1) {
    return "Complete the one review item carefully and write one sentence about what changed in your thinking.";
  }
  return "No urgent review items today. Use the time for preview or extra practice.";
}

function renderPriorityList(items) {
  const { createEmptyState, escapeHtml, statusClass } = window.StudyUtils;
  const container = document.getElementById("review-priority-list");
  if (!container) {
    return;
  }

  const topItems = [...items]
    .sort(compareReviewPriority)
    .slice(0, 3);

  if (!topItems.length) {
    container.innerHTML = createEmptyState("No priority review items right now.");
    return;
  }

  container.innerHTML = topItems.map((mistake, index) => `
    <article class="review-card review-priority-card">
      <p class="section-label">Priority ${index + 1}</p>
      <h3>${escapeHtml(mistake.topic)}</h3>
      <p class="muted">${escapeHtml(mistake.question)}</p>
      <div class="chip-row">
        <span class="chip ${statusClass(mistake.retryStatus)}">${escapeHtml(mistake.retryStatus)}</span>
        <span class="chip">Mastery: ${escapeHtml(mistake.masteryLevel)}</span>
      </div>
      <p class="mistake-detail"><strong>Next step:</strong> ${escapeHtml(buildReviewNote(mistake))}</p>
    </article>
  `).join("");
}

function renderReviewItem(mistake, options) {
  const { completed, statusClass, escapeHtml } = options;
  return `
    <div class="task-item${completed ? " task-item-complete review-item-complete" : ""}" data-review-key="${escapeHtml(buildReviewKey(mistake))}">
      <div class="review-topline">
        <div>
          <h3>${escapeHtml(mistake.topic)}</h3>
          <p class="muted">${escapeHtml(mistake.question)}</p>
        </div>
        <div class="chip-row">
          <span class="chip ${statusClass(mistake.retryStatus)}">${escapeHtml(mistake.retryStatus)}</span>
          <span class="chip">Mastery: ${escapeHtml(mistake.masteryLevel)}</span>
        </div>
      </div>
      <p class="mistake-detail"><strong>Next step:</strong> ${escapeHtml(buildReviewNote(mistake))}</p>
      <div class="review-actions">
        <button type="button" class="ghost-button review-toggle-button">
          ${completed ? "Mark not reviewed" : "Mark reviewed"}
        </button>
      </div>
    </div>
  `;
}

function attachReviewToggleHandlers(container) {
  container.querySelectorAll("[data-review-key]").forEach((item) => {
    const button = item.querySelector(".review-toggle-button");
    const reviewKey = item.getAttribute("data-review-key");
    if (!button || !reviewKey) {
      return;
    }

    button.addEventListener("click", () => {
      const nextDone = !item.classList.contains("review-item-complete");
      localStorage.setItem(reviewKey, String(nextDone));
      window.location.reload();
    });
  });
}

function buildReviewKey(mistake) {
  return `studypilot.reviewDone.${[
    mistake.subject || "",
    mistake.topic || "",
    mistake.question || "",
    mistake.date || ""
  ].join("::").toLowerCase()}`;
}

function isReviewMarkedDone(mistake) {
  return localStorage.getItem(buildReviewKey(mistake)) === "true";
}

function compareReviewPriority(left, right) {
  return scoreReviewPriority(right) - scoreReviewPriority(left);
}

function scoreReviewPriority(mistake) {
  const status = String(mistake.retryStatus || "").toLowerCase();
  let score = 0;
  if (status.includes("review now")) {
    score += 40;
  } else if (status.includes("retry today")) {
    score += 35;
  } else if (status.includes("retry soon")) {
    score += 25;
  } else if (status.includes("partial")) {
    score += 20;
  }

  score += Math.max(0, 6 - Number(mistake.masteryLevel || 1)) * 5;
  return score;
}
