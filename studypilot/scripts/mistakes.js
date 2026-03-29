document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, statusClass, toList } = window.StudyUtils;
  const [data, draftsData] = await Promise.all([
    fetchJson("./data/mistakes.json", { mistakes: [] }),
    fetchJson("./data/mistake-drafts.json", { drafts: [] })
  ]);
  const mistakes = toList(data.mistakes);
  const drafts = toList(draftsData.drafts);

  const subjectFilter = document.getElementById("subject-filter");
  const topicFilter = document.getElementById("topic-filter");
  const statusFilter = document.getElementById("status-filter");
  const list = document.getElementById("mistakes-list");
  const count = document.getElementById("mistake-count");
  const draftList = document.getElementById("mistake-drafts");
  const draftCount = document.getElementById("draft-count");

  populateFilters(mistakes);
  renderMistakes(mistakes);
  renderDrafts(drafts);

  [subjectFilter, topicFilter, statusFilter].forEach((filterNode) => {
    filterNode.addEventListener("change", () => renderMistakes(mistakes));
  });

  function populateFilters(items) {
    fillSelect(subjectFilter, uniqueValues(items, "subject"), "All subjects");
    fillSelect(topicFilter, uniqueValues(items, "topic"), "All topics");
    fillSelect(statusFilter, uniqueValues(items, "retryStatus"), "All statuses");
  }

  function fillSelect(selectNode, values, allLabel) {
    const options = [`<option value="all">${escapeHtml(allLabel)}</option>`]
      .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
    selectNode.innerHTML = options.join("");
  }

  function uniqueValues(items, key) {
    return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();
  }

  function renderMistakes(allMistakes) {
    const filtered = allMistakes.filter((mistake) => {
      const bySubject = subjectFilter.value === "all" || mistake.subject === subjectFilter.value;
      const byTopic = topicFilter.value === "all" || mistake.topic === topicFilter.value;
      const byStatus = statusFilter.value === "all" || mistake.retryStatus === statusFilter.value;
      return bySubject && byTopic && byStatus;
    });

    count.textContent = `${filtered.length} entries shown`;

    if (!filtered.length) {
      list.innerHTML = createEmptyState("No mistakes match the current filters.");
      return;
    }

    list.innerHTML = filtered.map((mistake) => `
      <article class="mistake-card">
        <div class="mistake-topline">
          <div>
            <p class="section-label">${escapeHtml(mistake.subject)}</p>
            <h3>${escapeHtml(mistake.topic)}${mistake.subtopic ? `: ${escapeHtml(mistake.subtopic)}` : ""}</h3>
          </div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(mistake.date)}</span>
            <span class="chip ${statusClass(mistake.retryStatus)}">${escapeHtml(mistake.retryStatus)}</span>
          </div>
        </div>
        <p class="mistake-detail"><strong>Error type:</strong> ${escapeHtml(mistake.errorType)}</p>
        <p class="mistake-detail"><strong>Question:</strong> ${escapeHtml(mistake.question)}</p>
        <p class="mistake-detail"><strong>Student answer:</strong> ${escapeHtml(mistake.studentAnswer)}</p>
        <p class="mistake-detail"><strong>Correct answer:</strong> ${escapeHtml(mistake.correctAnswer)}</p>
        <p class="mistake-detail"><strong>Explanation:</strong> ${escapeHtml(mistake.explanation)}</p>
        <p class="mistake-detail"><strong>Correction:</strong> ${escapeHtml(mistake.correction)}</p>
        <p class="mistake-detail"><strong>Retry status:</strong> ${escapeHtml(mistake.retryStatus)}</p>
        <p class="mistake-detail muted"><strong>Source:</strong> ${escapeHtml(mistake.source)} | <strong>Image:</strong> ${escapeHtml(mistake.imagePath || "Not linked yet")}</p>
      </article>
    `).join("");
  }

  function renderDrafts(items) {
    draftCount.textContent = `${items.length} draft image(s) found`;

    if (!items.length) {
      draftList.innerHTML = createEmptyState("No photographed mistake drafts yet.");
      return;
    }

    draftList.innerHTML = items.map((draft) => `
      <article class="mistake-card">
        <div class="mistake-topline">
          <div>
            <p class="section-label">${escapeHtml(draft.subjectGuess || "Unknown")}</p>
            <h3>${escapeHtml(draft.topicGuess || "New mistake draft")}</h3>
          </div>
          <div class="chip-row">
            <span class="chip chip-sync">Draft</span>
            <span class="chip">${escapeHtml(draft.status || "needs details")}</span>
          </div>
        </div>
        <p class="mistake-detail"><strong>Image:</strong> ${escapeHtml(draft.imagePath)}</p>
        <p class="mistake-detail"><strong>Detected:</strong> ${escapeHtml(draft.detectedAt || "Unknown time")}</p>
        <p class="mistake-detail"><strong>Next step:</strong> ${escapeHtml(draft.note || "Review the image and complete the missing fields.")}</p>
        <p class="mistake-detail muted"><strong>Fields to fill:</strong> ${escapeHtml(toList(draft.fieldsToFill).join(", "))}</p>
      </article>
    `).join("");
  }
});

// Placeholder for a future OCR-assisted intake workflow.
// This function is intentionally not called in V1.
function intakeLatestMistakeImagePlaceholder() {
  /*
    TODO: Future Codex extension idea
    1. Look inside ../uploads/mistakes/ and detect the newest image file.
    2. Send the image through a future OCR or vision parsing step.
    3. Extract fields such as subject, topic, question, studentAnswer, and correctAnswer.
    4. Validate the parsed result against the mistakes.json schema.
    5. Append a new entry into ../data/mistakes.json.
    6. Refresh the mistakes notebook and review queue.

    Notes:
    - Keep this workflow local-first when possible.
    - Add manual review before saving parsed entries.
    - Consider storing confidence scores for each extracted field later.
  */
  console.info("Mistake image intake placeholder: future logic will be added here.");
}
