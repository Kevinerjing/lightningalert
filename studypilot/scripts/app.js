(function () {
  const { fetchJson, formatLongDate } = window.StudyUtils;

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

  document.addEventListener("DOMContentLoaded", async () => {
    setTodayDate();
    await initFloatingTimeline();
  });

  function renderTopicItem(item) {
    if (item && typeof item === "object" && item.label) {
      if (item.url) {
        return `<li><a class="task-link" href="${window.StudyUtils.escapeHtml(item.url)}" target="_blank" rel="noreferrer">${window.StudyUtils.escapeHtml(item.label)}</a></li>`;
      }

      return `<li>${window.StudyUtils.escapeHtml(item.label)}</li>`;
    }

    return `<li>${window.StudyUtils.escapeHtml(item)}</li>`;
  }

  async function initFloatingTimeline() {
    if (document.querySelector("[data-study-timeline]")) {
      return;
    }

    const timelineData = await loadTimelineData();
    const events = buildTimelineEvents(timelineData).slice(0, 8);
    const isOpen = localStorage.getItem("studypilot.timelineOpen") === "true";
    const wrapper = document.createElement("aside");
    wrapper.className = `floating-timeline${isOpen ? " is-open" : ""}`;
    wrapper.setAttribute("data-study-timeline", "true");
    wrapper.innerHTML = `
      <button class="floating-timeline-toggle" type="button" aria-expanded="${isOpen ? "true" : "false"}">
        <span class="floating-timeline-toggle-title">Coming Up</span>
        <span class="floating-timeline-toggle-mode">${events.length ? `${events.length} upcoming items` : "No upcoming items"}</span>
      </button>
      <section class="floating-timeline-panel" aria-label="Upcoming study events">
        <div class="floating-timeline-header">
          <div>
            <p class="section-label">Near future</p>
            <h2>Dates and events</h2>
          </div>
          <span class="chip chip-sync">Preview</span>
        </div>
        <p class="floating-timeline-note muted">A quick look at what is coming soon so your child can see the next few important moments.</p>
        <div class="timeline-list">
          ${renderTimelineEvents(events)}
        </div>
      </section>
    `;

    document.body.appendChild(wrapper);

    const toggle = wrapper.querySelector(".floating-timeline-toggle");
    toggle?.addEventListener("click", () => {
      const nextOpen = !wrapper.classList.contains("is-open");
      wrapper.classList.toggle("is-open", nextOpen);
      toggle.setAttribute("aria-expanded", String(nextOpen));
      localStorage.setItem("studypilot.timelineOpen", String(nextOpen));
    });
  }

  async function loadTimelineData() {
    const { buildRecurringClubTasks } = window.StudyUtils;
    const [dashboardApi, scienceApi, classroomData] = await Promise.all([
      fetchJson("/api/studypilot-dashboard", null),
      fetchJson("/api/studypilot-science", null),
      fetchJson("/data/classroom-updates.json", { classrooms: [] })
    ]);

    let dashboardData = dashboardApi;
    if (!dashboardData || !dashboardData.tasks) {
      const [todayData, weekData, nextWeekData] = await Promise.all([
        fetchJson("/data/today.json", { tasks: [] }),
        fetchJson("/data/week.json", { tasks: [] }),
        fetchJson("/data/next-week.json", { tasks: [] })
      ]);
      const recurringTasks = buildRecurringClubTasks();
      dashboardData = {
        tasks: {
          today: [...(todayData.tasks || []), ...recurringTasks.filter((task) => task.bucket === "today").map(stripTaskBucket)],
          week: [...(weekData.tasks || []), ...recurringTasks.filter((task) => task.bucket === "week").map(stripTaskBucket)],
          nextWeek: [...(nextWeekData.tasks || []), ...recurringTasks.filter((task) => task.bucket === "nextWeek").map(stripTaskBucket)]
        }
      };
    }

    let scienceData = scienceApi;
    if (!scienceData || (!scienceData.schedule && !scienceData.upcomingSupport)) {
      scienceData = await fetchJson("/data/science.json", { schedule: null, upcomingSupport: [] });
    }

    return {
      dashboard: dashboardData,
      science: scienceData,
      classroom: classroomData
    };
  }

  function buildTimelineEvents(data) {
    const { toList } = window.StudyUtils;
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pushEvent = (event) => {
      if (!event || !event.date) {
        return;
      }
      events.push(event);
    };

    toList(data?.science?.schedule?.keyDates).forEach((item) => {
      const parsed = parseTimelineDate(item.date);
      if (!parsed || parsed < today) {
        return;
      }
      pushEvent({
        date: parsed,
        dateLabel: item.date,
        title: item.label || "Science key date",
        detail: item.note || "Science course event",
        type: "Science"
      });
    });

    toList(data?.science?.upcomingSupport).forEach((item) => {
      const parsed = parseTimelineDate(item.when);
      if (!parsed || parsed < today) {
        return;
      }
      pushEvent({
        date: parsed,
        dateLabel: item.when,
        title: item.topic || "Upcoming lesson",
        detail: item.summary || "Lesson preview",
        type: "Class prep"
      });
    });

    const taskBuckets = [
      ...toList(data?.dashboard?.tasks?.today),
      ...toList(data?.dashboard?.tasks?.week),
      ...toList(data?.dashboard?.tasks?.nextWeek)
    ];

    taskBuckets.forEach((task) => {
      const parsed = parseTimelineDate(task.dueDate);
      if (!parsed || parsed < today) {
        return;
      }
      pushEvent({
        date: parsed,
        dateLabel: task.dueDate,
        title: task.topic || "Study task",
        detail: task.note || `${task.subject || "Study"} task`,
        type: task.subject || task.type || "Task"
      });
    });

    toList(data?.classroom?.classrooms).forEach((classroom) => {
      toList(classroom?.topicSections).forEach((section) => {
        toList(section?.items).forEach((item) => {
          const parsed = parseTimelineDate(item?.meta);
          if (!parsed || parsed < today) {
            return;
          }
          pushEvent({
            date: parsed,
            dateLabel: extractDateLabel(item.meta),
            title: item.title || "Classroom item",
            detail: `${classroom.name}${section.topic ? ` - ${section.topic}` : ""}`,
            type: "Classroom"
          });
        });
      });
    });

    return dedupeTimelineEvents(events)
      .sort((left, right) => left.date.getTime() - right.date.getTime())
      .slice(0, 12);
  }

  function renderTimelineEvents(events) {
    const { createEmptyState, escapeHtml } = window.StudyUtils;
    if (!events.length) {
      return createEmptyState("No upcoming events were found yet.");
    }

    return events.map((event) => `
      <article class="timeline-item">
        <div class="timeline-date">
          <span class="timeline-date-label">${escapeHtml(event.dateLabel)}</span>
          <span class="timeline-date-chip">${escapeHtml(event.type)}</span>
        </div>
        <div class="timeline-body">
          <h3>${escapeHtml(event.title)}</h3>
          <p class="muted">${escapeHtml(event.detail)}</p>
        </div>
      </article>
    `).join("");
  }

  function parseTimelineDate(value) {
    if (!value) {
      return null;
    }

    const text = String(value).trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (/^today$/i.test(text)) {
      return today;
    }

    if (/^tomorrow$/i.test(text)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }

    const direct = new Date(text);
    if (!Number.isNaN(direct.getTime())) {
      direct.setHours(0, 0, 0, 0);
      return direct;
    }

    const dueMatch = text.match(/Due\s+([A-Za-z]{3}\s+\d{1,2})/i);
    if (dueMatch) {
      const withYear = `${dueMatch[1]}, ${today.getFullYear()}`;
      const parsed = new Date(withYear);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }
    }

    const rangeMatch = text.match(/^([A-Za-z]+)\s+(\d{1,2})\s+to\s+[A-Za-z]+\s+\d{1,2},\s+(\d{4})$/);
    if (rangeMatch) {
      const [, month, day, year] = rangeMatch;
      const firstDate = new Date(`${month} ${day}, ${year}`);
      if (!Number.isNaN(firstDate.getTime())) {
        firstDate.setHours(0, 0, 0, 0);
        return firstDate;
      }
    }

    return null;
  }

  function extractDateLabel(text) {
    const value = String(text || "");
    const dueTomorrow = value.match(/Due Tomorrow/i);
    if (dueTomorrow) {
      return "Tomorrow";
    }

    const dueMatch = value.match(/Due\s+([A-Za-z]{3}\s+\d{1,2}(?:,\s*\d{1,2}:\d{2}\s*[AP]M)?)/i);
    if (dueMatch) {
      return dueMatch[1];
    }

    return value;
  }

  function dedupeTimelineEvents(events) {
    const seen = new Set();
    return events.filter((event) => {
      const key = `${event.dateLabel}|${event.title}|${event.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function stripTaskBucket(task) {
    const { bucket, ...rest } = task;
    return rest;
  }
})();
