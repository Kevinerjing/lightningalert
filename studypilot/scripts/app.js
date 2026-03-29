(function () {
  const { formatLongDate } = window.StudyUtils;

  function setTodayDate() {
    const dateNode = document.getElementById("today-date");
    if (dateNode) {
      dateNode.textContent = formatLongDate(new Date());
    }
  }

  function renderTaskGroups(containerId, tasks) {
    const { createEmptyState, escapeHtml, groupBy, priorityClass, sortSubjects, toList } = window.StudyUtils;
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const safeTasks = toList(tasks);
    if (!safeTasks.length) {
      container.innerHTML = createEmptyState("No tasks added yet.");
      return;
    }

    const groups = groupBy(safeTasks, "subject");
    const orderedSubjects = sortSubjects(Object.keys(groups));

    container.innerHTML = orderedSubjects.map((subject) => {
      const items = groups[subject].map((task) => `
        <li class="task-item">
          <div class="task-topline">
            <div>
              <h3>${escapeHtml(task.topic)}</h3>
              <p class="muted">${escapeHtml(task.note)}</p>
              ${task.resourceLink ? `<p><a class="task-link" href="${escapeHtml(task.resourceLink)}">${escapeHtml(task.resourceLabel || "Open study link")}</a></p>` : ""}
            </div>
            <div class="task-meta">
              ${task.source === "classroom-sync" ? `<span class="chip chip-sync">Classroom sync</span>` : ""}
              <span class="chip">${escapeHtml(task.type)}</span>
              <span class="chip ${priorityClass(task.priority)}">${escapeHtml(task.priority)} priority</span>
            </div>
          </div>
          <p class="muted">Due: ${escapeHtml(task.dueDate || "No due date set")}</p>
        </li>
      `).join("");

      return `
        <article class="group-card">
          <p class="section-label">${escapeHtml(subject)}</p>
          <ul class="task-list">${items}</ul>
        </article>
      `;
    }).join("");
  }

  function renderTopicSections(containerId, topics, config) {
    const { createEmptyState, escapeHtml, toList } = window.StudyUtils;
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const safeTopics = toList(topics);
    if (!safeTopics.length) {
      container.innerHTML = createEmptyState("No topics have been added yet.");
      return;
    }

    container.innerHTML = safeTopics.map((topic) => {
      const sections = config.sections.map((section) => {
        const items = toList(topic[section.key]);
        const content = items.length
          ? `<ul>${items.map((item) => renderTopicItem(item)).join("")}</ul>`
          : `<p class="muted">No details added yet.</p>`;

        return `
          <section class="topic-section">
            <h3>${escapeHtml(section.title)}</h3>
            ${content}
          </section>
        `;
      }).join("");

      return `
        <article class="topic-card">
          <div>
            <p class="section-label">${escapeHtml(config.subjectName)}</p>
            <h2>${escapeHtml(topic.topic)}</h2>
            <p class="muted">${escapeHtml(topic.summary)}</p>
          </div>
          <div class="topic-section-grid">${sections}</div>
        </article>
      `;
    }).join("");
  }

  window.StudyApp = {
    renderTaskGroups,
    renderTopicSections,
    setTodayDate
  };

  document.addEventListener("DOMContentLoaded", setTodayDate);

  function renderTopicItem(item) {
    if (item && typeof item === "object" && item.label) {
      if (item.url) {
        return `<li><a class="task-link" href="${window.StudyUtils.escapeHtml(item.url)}" target="_blank" rel="noreferrer">${window.StudyUtils.escapeHtml(item.label)}</a></li>`;
      }

      return `<li>${window.StudyUtils.escapeHtml(item.label)}</li>`;
    }

    return `<li>${window.StudyUtils.escapeHtml(item)}</li>`;
  }
})();
