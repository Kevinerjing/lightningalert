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

  window.StudyUtils = {
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
