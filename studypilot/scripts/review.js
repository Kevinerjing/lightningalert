document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, groupBy, sortSubjects, statusClass, toList } = window.StudyUtils;
  const data = await fetchJson("./data/mistakes.json", { mistakes: [] });
  const mistakes = toList(data.mistakes);
  const reviewItems = mistakes.filter(shouldReviewToday);

  document.getElementById("review-total").textContent = `${reviewItems.length} items need review today`;
  document.getElementById("review-suggestion").textContent = getReviewSuggestion(reviewItems.length);

  const container = document.getElementById("review-groups");
  if (!reviewItems.length) {
    container.innerHTML = createEmptyState("No review items are due today.");
    return;
  }

  const grouped = groupBy(reviewItems, "subject");
  const orderedSubjects = sortSubjects(Object.keys(grouped));

  container.innerHTML = orderedSubjects.map((subject) => `
    <article class="review-card">
      <p class="section-label">${escapeHtml(subject)}</p>
      <div class="task-list">
        ${grouped[subject].map((mistake) => `
          <div class="task-item">
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
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
});

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
