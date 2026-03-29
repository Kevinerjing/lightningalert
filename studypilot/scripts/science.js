document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, toList } = window.StudyUtils;
  const { renderTopicSections } = window.StudyApp;
  const data = await loadScienceData(fetchJson);
  const topics = toList(data.topics);
  renderScienceSchedule(data.schedule);
  renderUpcomingScienceSupport(data.upcomingSupport);

  renderTopicSections("science-topics", topics, {
    subjectName: "Science",
    sections: [
      { title: "Key concepts", key: "keyConcepts" },
      { title: "Teacher notes summary", key: "teacherNotes" },
      { title: "Useful learning resources", key: "resources" },
      { title: "Easy quiz questions", key: "quizEasy" },
      { title: "Medium quiz questions", key: "quizMedium" },
      { title: "Hard quiz questions", key: "quizHard" },
      { title: "Feynman mastery checklist", key: "feynmanChecklist" },
      { title: "Real-world applications", key: "applications" }
    ]
  });

  if (!topics.length) {
    const topicsSection = document.getElementById("science-topics-section");
    if (topicsSection) {
      topicsSection.style.display = "none";
    }
  }

  renderScienceClassroomItems(data.classroomItems);
});

function renderScienceSchedule(schedule) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("science-schedule");
  if (!container) {
    return;
  }

  if (!schedule) {
    container.innerHTML = createEmptyState("No SNC1W schedule details have been added yet.");
    return;
  }

  const units = toList(schedule.units);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keyDates = toList(schedule.keyDates).filter((item) => isUpcomingDate(item.date, today));
  const keyDatesContent = keyDates.length
    ? `
      <div class="task-list">
        ${keyDates.map((item) => `
          <div class="task-item ${getKeyDateHighlightClass(item, today)}">
            <div class="task-topline">
              <h3>${escapeHtml(item.label)}</h3>
              <span class="chip ${getKeyDateChipClass(item, today)}">${escapeHtml(item.date)}</span>
            </div>
            <p class="muted">${escapeHtml(item.note)}</p>
          </div>
        `).join("")}
      </div>
    `
    : createEmptyState("No upcoming key dates right now.");

  const expanded = isScienceScheduleExpanded();

  container.innerHTML = `
    <article class="group-card upcoming-support-card${expanded ? "" : " upcoming-support-collapsed"}" data-science-schedule-card="true">
      <div class="section-heading">
        <div>
          <p class="section-label">Schedule summary</p>
          <h3>${escapeHtml(schedule.title || "SNC1W schedule")}</h3>
        </div>
        <button type="button" class="ghost-button science-schedule-toggle" aria-expanded="${expanded ? "true" : "false"}">
          ${expanded ? "Hide details" : "Show details"}
        </button>
      </div>
      <p class="muted">${escapeHtml(schedule.overview || "")}</p>
      <div class="support-details">
        <div class="topic-section-grid">
          <section class="topic-section topic-section-full">
            <h3>Units</h3>
            <div class="task-list">
              ${units.map((unit) => `
                <div class="task-item">
                  <div class="task-topline">
                    <div>
                      <h3>${escapeHtml(unit.name)}</h3>
                      <p class="muted">${escapeHtml(unit.window)}</p>
                    </div>
                    <span class="chip">${escapeHtml(unit.focus)}</span>
                  </div>
                  <p class="mistake-detail">${escapeHtml(unit.notes)}</p>
                </div>
              `).join("")}
            </div>
          </section>
          <section class="topic-section topic-section-full">
            <h3>Key dates</h3>
            ${keyDatesContent}
          </section>
        </div>
      </div>
    </article>
  `;

  attachScienceScheduleHandler(container);
}

function isUpcomingDate(dateText, today) {
  if (!dateText) {
    return false;
  }

  const parsed = parseScheduleDate(dateText);
  if (!parsed) {
    return true;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed >= today;
}

function parseScheduleDate(dateText) {
  const directDate = new Date(dateText);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  // Handle ranges like "June 18 to June 24, 2026" by using the first date.
  const rangeMatch = String(dateText).match(/^([A-Za-z]+)\s+(\d{1,2})\s+to\s+[A-Za-z]+\s+\d{1,2},\s+(\d{4})$/);
  if (rangeMatch) {
    const [, month, day, year] = rangeMatch;
    const firstDate = new Date(`${month} ${day}, ${year}`);
    if (!Number.isNaN(firstDate.getTime())) {
      return firstDate;
    }
  }

  return null;
}

function getKeyDateHighlightClass(item, today) {
  return isSoonAssessment(item, today) ? "keydate-highlight" : "";
}

function getKeyDateChipClass(item, today) {
  return isSoonAssessment(item, today) ? "keydate-chip-highlight" : "";
}

function isSoonAssessment(item, today) {
  if (!item || !item.date || !item.label) {
    return false;
  }

  const parsed = parseScheduleDate(item.date);
  if (!parsed) {
    return false;
  }

  parsed.setHours(0, 0, 0, 0);
  const diffMs = parsed.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const label = String(item.label).toLowerCase();
  const isAssessment = ["quiz", "test", "exam"].some((word) => label.includes(word));

  return isAssessment && diffDays >= 0 && diffDays <= 14;
}

function renderScienceClassroomItems(items) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("science-classroom-items");
  if (!container) {
    return;
  }

  const classroomItems = toList(items);
  if (!classroomItems.length) {
    container.innerHTML = createEmptyState("No recent Science classroom items were found.");
    return;
  }

  container.innerHTML = `
    <article class="group-card">
      <p class="section-label">Chemistry</p>
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

function renderUpcomingScienceSupport(items) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const container = document.getElementById("science-upcoming-support");
  if (!container) {
    return;
  }

  const supportItems = toList(items);
  if (!supportItems.length) {
    container.innerHTML = createEmptyState("No upcoming science lesson support has been added yet.");
    return;
  }

  container.innerHTML = supportItems.map((item) => `
    <article class="group-card upcoming-support-card${isUpcomingSupportExpanded(item) ? "" : " upcoming-support-collapsed"}" data-upcoming-support-key="${escapeHtml(buildUpcomingSupportKey(item))}">
      <div class="section-heading">
        <div>
          <p class="section-label">${escapeHtml(item.when || "Upcoming lesson")}</p>
          <h3>${escapeHtml(item.topic || "Lesson support")}</h3>
        </div>
        <div class="chip-row">
          ${item.type ? `<span class="chip chip-sync">${escapeHtml(item.type)}</span>` : ""}
          <button type="button" class="ghost-button upcoming-support-toggle" aria-expanded="${isUpcomingSupportExpanded(item) ? "true" : "false"}">
            ${isUpcomingSupportExpanded(item) ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>
      <p class="mistake-detail">${escapeHtml(item.summary || "")}</p>
      <div class="topic-section-grid support-details">
        <section class="topic-section">
          <h3>Before class</h3>
          ${renderSupportList(item.beforeClass)}
        </section>
        <section class="topic-section">
          <h3>Keywords</h3>
          ${renderSupportList(item.keywords)}
        </section>
        <section class="topic-section">
          <h3>Quick questions</h3>
          ${renderSupportList(item.quickQuestions)}
        </section>
        <section class="topic-section">
          <h3>Helpful resources</h3>
          ${renderSupportResources(item.resources)}
        </section>
        <section class="topic-section">
          <h3>Lab steps</h3>
          ${renderSupportList(item.labSteps)}
        </section>
        <section class="topic-section">
          <h3>Property to use ideas</h3>
          ${renderSupportList(item.propertyUseLinks)}
        </section>
        <section class="topic-section">
          <h3>Teacher questions</h3>
          ${renderSupportList(item.teacherQuestions)}
        </section>
        <section class="topic-section">
          <h3>Flexible thinking</h3>
          ${renderSupportList(item.flexibleThinkingExamples)}
        </section>
      </div>
    </article>
  `).join("");

  attachUpcomingSupportHandlers(container);
}

function renderSupportList(items) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const safeItems = toList(items);
  if (!safeItems.length) {
    return createEmptyState("No details added yet.");
  }

  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSupportResources(items) {
  const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
  const safeItems = toList(items);
  if (!safeItems.length) {
    return createEmptyState("No resource links added yet.");
  }

  return `
    <ul>
      ${safeItems.map((item) => {
        if (item && typeof item === "object" && item.url) {
          return `<li><a class="task-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label || item.url)}</a></li>`;
        }

        return `<li>${escapeHtml(item)}</li>`;
      }).join("")}
    </ul>
  `;
}

async function loadScienceData(fetchJson) {
  const { toList } = window.StudyUtils;
  const apiPayload = await fetchJson("../api/studypilot-science", null);
  if (apiPayload && apiPayload.topics && apiPayload.upcomingSupport) {
    return apiPayload;
  }

  const [scienceData, classroomData] = await Promise.all([
    fetchJson("../data/science.json", { topics: [], upcomingSupport: [], schedule: null }),
    fetchJson("../data/classroom-updates.json", { classrooms: [] })
  ]);

  const scienceClassroom = toList(classroomData.classrooms).find((item) => item.key === "science");
  const chemistry = toList(scienceClassroom?.topicSections).find((section) => section.topic === "Chemistry");

  return {
    source: "json-fallback",
    schedule: scienceData.schedule || null,
    upcomingSupport: toList(scienceData.upcomingSupport),
    topics: toList(scienceData.topics),
    classroomItems: toList(chemistry?.items)
  };
}

function buildUpcomingSupportKey(item) {
  return `studypilot.upcomingSupport.${String(item?.topic || "").toLowerCase()}::${String(item?.when || "").toLowerCase()}`;
}

function isUpcomingSupportExpanded(item) {
  return localStorage.getItem(buildUpcomingSupportKey(item)) === "open";
}

function attachUpcomingSupportHandlers(container) {
  container.querySelectorAll("[data-upcoming-support-key]").forEach((card) => {
    const button = card.querySelector(".upcoming-support-toggle");
    const cardKey = card.getAttribute("data-upcoming-support-key");
    if (!button || !cardKey) {
      return;
    }

    button.addEventListener("click", () => {
      const nextExpanded = card.classList.contains("upcoming-support-collapsed");
      card.classList.toggle("upcoming-support-collapsed", !nextExpanded);
      button.setAttribute("aria-expanded", String(nextExpanded));
      button.textContent = nextExpanded ? "Hide details" : "Show details";
      localStorage.setItem(cardKey, nextExpanded ? "open" : "closed");
    });
  });
}

function isScienceScheduleExpanded() {
  return localStorage.getItem("studypilot.scienceSchedule") === "open";
}

function attachScienceScheduleHandler(container) {
  const card = container.querySelector("[data-science-schedule-card]");
  const button = container.querySelector(".science-schedule-toggle");
  if (!card || !button) {
    return;
  }

  button.addEventListener("click", () => {
    const nextExpanded = card.classList.contains("upcoming-support-collapsed");
    card.classList.toggle("upcoming-support-collapsed", !nextExpanded);
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "Hide details" : "Show details";
    localStorage.setItem("studypilot.scienceSchedule", nextExpanded ? "open" : "closed");
  });
}
