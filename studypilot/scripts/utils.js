(function () {
  const SUBJECT_ORDER = ["Science", "Math", "English"];

  async function fetchJson(path, fallback) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Could not load ${path}`);
      }

      return await response.json();
    } catch (error) {
      console.error(error);
      return fallback;
    }
  }

  function formatLongDate(dateInput = new Date()) {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function groupBy(items, keyName) {
    return items.reduce((groups, item) => {
      const key = item[keyName] || "Other";
      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
      return groups;
    }, {});
  }

  function sortSubjects(subjects) {
    return [...subjects].sort((left, right) => {
      const leftIndex = SUBJECT_ORDER.indexOf(left);
      const rightIndex = SUBJECT_ORDER.indexOf(right);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    });
  }

  function toList(items) {
    return Array.isArray(items) ? items : [];
  }

  function createEmptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function priorityClass(priority) {
    const normalized = String(priority || "").toLowerCase();
    if (normalized === "high") {
      return "priority-high";
    }
    if (normalized === "medium") {
      return "priority-medium";
    }
    return "priority-low";
  }

  function statusClass(status) {
    return `status-${String(status || "unknown").toLowerCase().replaceAll(/\s+/g, "-")}`;
  }

  function buildRecurringClubTasks(referenceDate = new Date()) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const sundayReminderDate = getNextWeekday(today, 0, true);
    const wednesdayEventDate = getNextWeekday(today, 3, true);

    return [
      {
        bucket: getRecurringBucketForDate(sundayReminderDate, today),
        subject: "Club",
        topic: "Weather & Climate Club notice",
        type: "leadership",
        note: "Sunday routine: schedule and send the club notice so everyone knows there is a Weather & Climate Club activity on Wednesday at lunch.",
        dueDate: toIsoDate(sundayReminderDate),
        priority: "High",
        source: "recurring-club"
      },
      {
        bucket: getRecurringBucketForDate(wednesdayEventDate, today),
        subject: "Club",
        topic: "Weather & Climate Club activity",
        type: "event",
        note: "Wednesday lunch: run the Weather & Climate Club activity and make sure the group has already received the notice.",
        dueDate: toIsoDate(wednesdayEventDate),
        priority: "Medium",
        source: "recurring-club"
      }
    ];
  }

  function getNextWeekday(fromDate, targetWeekday, includeToday = false) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const current = start.getDay();
    let diff = (targetWeekday - current + 7) % 7;
    if (diff === 0 && !includeToday) {
      diff = 7;
    }
    start.setDate(start.getDate() + diff);
    return start;
  }

  function getRecurringBucketForDate(targetDate, today) {
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return "today";
    }
    if (diffDays <= 7) {
      return "week";
    }
    return "nextWeek";
  }

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  window.StudyUtils = {
    buildRecurringClubTasks,
    createEmptyState,
    escapeHtml,
    fetchJson,
    formatLongDate,
    groupBy,
    priorityClass,
    sortSubjects,
    statusClass,
    toList
  };
})();
