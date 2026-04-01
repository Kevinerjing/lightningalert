document.addEventListener("DOMContentLoaded", () => {
  const { createEmptyState, escapeHtml, formatLongDate } = window.StudyUtils;
  const archiveApi = window.StudyArchive;

  const dateNode = document.getElementById("today-date");
  if (dateNode) {
    dateNode.textContent = formatLongDate(new Date());
  }

  renderArchivedTopics();
  renderArchivedClassroomItems();

  function renderArchivedTopics() {
    const container = document.getElementById("archived-topic-cards");
    if (!container) {
      return;
    }

    const items = archiveApi.listArchivedTopicCards();
    if (!items.length) {
      container.innerHTML = createEmptyState("No support cards are archived right now.");
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="group-card">
        <div class="task-topline">
          <div>
            <p class="section-label">${escapeHtml(item.subject || "Support")}</p>
            <h3>${escapeHtml(item.title || "Archived topic")}</h3>
            <p class="muted">Archived ${escapeHtml(formatArchiveTime(item.archivedAt))}</p>
          </div>
          <button type="button" class="ghost-button archive-restore-topic" data-subject="${escapeHtml(item.subject || "")}" data-title="${escapeHtml(item.title || "")}">
            Restore
          </button>
        </div>
      </article>
    `).join("");

    container.querySelectorAll(".archive-restore-topic").forEach((button) => {
      button.addEventListener("click", async () => {
        const subject = button.getAttribute("data-subject") || "";
        const title = button.getAttribute("data-title") || "";
        const record = archiveApi.listArchivedTopicCards().find((entry) => entry.subject === subject && entry.title === title);
        if (!record?.topic) {
          window.alert("This archived topic record is missing its saved content.");
          return;
        }

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Restoring...";

        try {
          const response = await fetch("/api/studypilot-topic-card/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              subject,
              topic: record.topic
            })
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.error || "Could not restore this topic card.");
          }

          archiveApi.removeArchivedTopicCard(subject, title);
          renderArchivedTopics();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Could not restore this topic card.");
          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });
  }

  function renderArchivedClassroomItems() {
    const container = document.getElementById("archived-classroom-items");
    if (!container) {
      return;
    }

    const items = archiveApi.listArchivedClassroomItems();
    if (!items.length) {
      container.innerHTML = createEmptyState("No classroom items are archived right now.");
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="group-card">
        <div class="task-topline">
          <div>
            <p class="section-label">${escapeHtml(item.subject || "Classroom")}</p>
            <h3>${escapeHtml(item.title || "Archived classroom item")}</h3>
            <p class="muted">${escapeHtml(item.meta || "")}</p>
            <p class="muted">Archived ${escapeHtml(formatArchiveTime(item.archivedAt))}</p>
          </div>
          <button type="button" class="ghost-button archive-restore-classroom" data-subject="${escapeHtml(item.subject || "")}" data-title="${escapeHtml(item.title || "")}" data-meta="${escapeHtml(item.meta || "")}">
            Restore
          </button>
        </div>
      </article>
    `).join("");

    container.querySelectorAll(".archive-restore-classroom").forEach((button) => {
      button.addEventListener("click", () => {
        archiveApi.removeArchivedClassroomItem(
          button.getAttribute("data-subject") || "",
          button.getAttribute("data-title") || "",
          button.getAttribute("data-meta") || ""
        );
        renderArchivedClassroomItems();
      });
    });
  }

  function formatArchiveTime(value) {
    const parsed = new Date(value || "");
    if (Number.isNaN(parsed.getTime())) {
      return "recently";
    }
    return parsed.toLocaleString("en-CA", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }
});
