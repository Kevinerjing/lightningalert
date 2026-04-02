(function () {
  const SUBJECT_ORDER = ["Science", "Math", "English"];
  const STUDY_TIME_ZONE = "America/Toronto";

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
    const today = buildStudyDate(referenceDate);

    const sundayReminderDate = getNextWeekday(today, 0, true);
    const wednesdayEventDate = getNextWeekday(today, 3, true);
    const teenEconomicDays = [
      { weekday: 1, label: "Monday" },
      { weekday: 2, label: "Tuesday" },
      { weekday: 3, label: "Wednesday" },
      { weekday: 4, label: "Thursday" }
    ];

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
      },
      ...teenEconomicDays.map(({ weekday, label }) => {
        const targetDate = getNextWeekday(today, weekday, true);
        return {
          bucket: getRecurringBucketForDate(targetDate, today),
          subject: "General",
          topic: "Teen Economic routine",
          type: "routine",
          note: `${label} routine: complete Teen Economic work and check the next step before finishing.`,
          dueDate: toIsoDate(targetDate),
          priority: "Medium",
          source: "recurring-teen-economic"
        };
      })
    ];
  }

  function buildRecurringGrade10MathTasks(referenceDate = new Date()) {
    const today = buildStudyDate(referenceDate);
    const grade10MathDays = [
      { weekday: 1, label: "Monday" },
      { weekday: 2, label: "Tuesday" },
      { weekday: 3, label: "Wednesday" },
      { weekday: 4, label: "Thursday" },
      { weekday: 5, label: "Friday" }
    ];

    return grade10MathDays.map(({ weekday, label }) => {
      const targetDate = getNextWeekday(today, weekday, true);
      return {
        bucket: getRecurringBucketForDate(targetDate, today),
        subject: "Math",
        topic: "Grade 10 math daily practice",
        type: "routine",
        note: `${label} routine: do a short Grade 10 math practice set, show your steps, and check one mistake before finishing.`,
        dueDate: toIsoDate(targetDate),
        priority: "Medium",
        resourceLabel: "Open Grade 10 geometry skill map",
        resourceLink: "resources/math/grade-10-geometry-skill-map.html",
        source: "recurring-grade10-math"
      };
    });
  }

  function buildRecurringBohrRutherfordTasks(referenceDate = new Date()) {
    const today = buildStudyDate(referenceDate);
    const weekdays = [
      { weekday: 1, label: "Monday" },
      { weekday: 2, label: "Tuesday" },
      { weekday: 3, label: "Wednesday" },
      { weekday: 4, label: "Thursday" },
      { weekday: 5, label: "Friday" }
    ];

    return weekdays.map(({ weekday, label }) => {
      const targetDate = getNextWeekday(today, weekday, true);
      return {
        bucket: getRecurringBucketForDate(targetDate, today),
        subject: "Science",
        topic: "Bohr-Rutherford diagram practice",
        type: "routine",
        note: `${label} routine: draw a Bohr-Rutherford diagram in Atom Explorer. Rule: first shell = 12 and 6 o'clock. Other shells = 12 -> 6 -> 3 -> 9, then add pairs next to those positions.`,
        dueDate: toIsoDate(targetDate),
        priority: "Medium",
        resourceLabel: "Open Atom Explorer",
        resourceLink: "https://www.kevin-apps.com/atom",
        source: "recurring-bohr-rutherford"
      };
    });
  }

  function buildRecurringSlideQuizTasks(referenceDate = new Date()) {
    const today = buildStudyDate(referenceDate);
    const slideQuizDays = [
      { weekday: 0, label: "Sunday" },
      { weekday: 1, label: "Monday" },
      { weekday: 2, label: "Tuesday" },
      { weekday: 3, label: "Wednesday" },
      { weekday: 4, label: "Thursday" },
      { weekday: 5, label: "Friday" },
      { weekday: 6, label: "Saturday" }
    ];

    return slideQuizDays.map(({ weekday, label }) => {
      const targetDate = getNextWeekday(today, weekday, true);
      return {
        bucket: getRecurringBucketForDate(targetDate, today),
        subject: "Science",
        topic: "Slide quiz routine",
        type: "quiz",
        note: `${label} routine: open one teacher slide quiz, answer a few detail questions, and check the answer key only after trying on your own.`,
        dueDate: toIsoDate(targetDate),
        priority: "Medium",
        resourceLabel: "Open slide quizzes",
        resourceLink: "quizzes.html",
        source: "recurring-slide-quiz"
      };
    });
  }

  function getNextWeekday(fromDate, targetWeekday, includeToday = false) {
    const start = new Date(fromDate);
    const current = start.getUTCDay();
    let diff = (targetWeekday - current + 7) % 7;
    if (diff === 0 && !includeToday) {
      diff = 7;
    }
    start.setUTCDate(start.getUTCDate() + diff);
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
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildStudyDate(referenceDate = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: STUDY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(referenceDate);

    const year = Number(parts.find((part) => part.type === "year")?.value || 0);
    const month = Number(parts.find((part) => part.type === "month")?.value || 1);
    const day = Number(parts.find((part) => part.type === "day")?.value || 1);

    return new Date(Date.UTC(year, month - 1, day));
  }

  window.StudyUtils = {
    buildRecurringClubTasks,
    buildRecurringBohrRutherfordTasks,
    buildRecurringGrade10MathTasks,
    buildRecurringSlideQuizTasks,
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
