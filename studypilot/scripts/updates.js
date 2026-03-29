document.addEventListener("DOMContentLoaded", async () => {
  const { createEmptyState, escapeHtml, fetchJson, formatLongDate, groupBy, sortSubjects, toList } = window.StudyUtils;

  const [uploadData, classroomData, weekData, nextWeekData] = await Promise.all([
    fetchJson("./data/upload-analysis.json", { items: [], totalFiles: 0 }),
    fetchJson("./data/classroom-updates.json", { classrooms: [] }),
    fetchJson("./data/week.json", { tasks: [] }),
    fetchJson("./data/next-week.json", { tasks: [] })
  ]);

  renderSummary(uploadData, classroomData, weekData, nextWeekData);
  renderClassroomUpdates(classroomData);
  renderSyncedTasks(weekData, nextWeekData);
  renderUploads(uploadData);

  function renderSummary(uploadInfo, classroomInfo, weekInfo, nextWeekInfo) {
    const generatedNode = document.getElementById("updates-generated-at");
    const summaryNode = document.getElementById("updates-summary");
    const uploadsTotalNode = document.getElementById("uploads-total");
    const classroomTotalNode = document.getElementById("classroom-items-total");
    const syncedTotalNode = document.getElementById("synced-tasks-total");

    const generatedAt = classroomInfo.generatedAt || uploadInfo.generatedAt;
    generatedNode.textContent = generatedAt ? formatLongDate(generatedAt) : "No update time yet";

    const classroomItems = toList(classroomInfo.classrooms)
      .flatMap((classroom) => toList(classroom.recentItems));
    const syncedTasks = getSyncedTasks(weekInfo, nextWeekInfo);

    summaryNode.textContent = classroomInfo.loginStatus === "ready"
      ? "Local upload analysis and Classroom sync are available."
      : "Uploads are available. Classroom sync may need a fresh saved login session.";
    uploadsTotalNode.textContent = String(uploadInfo.totalFiles || 0);
    classroomTotalNode.textContent = String(classroomItems.length);
    syncedTotalNode.textContent = String(syncedTasks.length);
  }

  function renderClassroomUpdates(classroomInfo) {
    const container = document.getElementById("classroom-updates");
    const classrooms = toList(classroomInfo.classrooms);

    if (!classrooms.length) {
      container.innerHTML = createEmptyState("No Classroom updates have been saved yet.");
      return;
    }

    container.innerHTML = classrooms.map((classroom) => {
      const items = toList(classroom.recentItems);
      const itemList = items.length
        ? `<ul class="updates-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : `<div class="empty-state">No recent items found for this classroom.</div>`;

      return `
        <article class="group-card">
          <div class="section-heading">
            <div>
              <p class="section-label">${escapeHtml(classroom.name)}</p>
              <h3>${escapeHtml(classroom.pageTitle || classroom.name)}</h3>
            </div>
            <div class="chip-row">
              <span class="chip">${classroom.authenticated ? "Connected" : "Login needed"}</span>
              ${classroom.topics?.length ? `<span class="chip">${escapeHtml(classroom.topics.join(", "))}</span>` : ""}
            </div>
          </div>
          ${itemList}
        </article>
      `;
    }).join("");
  }

  function renderSyncedTasks(weekInfo, nextWeekInfo) {
    const container = document.getElementById("synced-task-groups");
    const syncedTasks = getSyncedTasks(weekInfo, nextWeekInfo);

    if (!syncedTasks.length) {
      container.innerHTML = createEmptyState("No auto-synced Classroom tasks are on the dashboard right now.");
      return;
    }

    const groups = groupBy(syncedTasks, "subject");
    const orderedSubjects = sortSubjects(Object.keys(groups));

    container.innerHTML = orderedSubjects.map((subject) => {
      const items = groups[subject].map((task) => `
        <li class="task-item">
          <div class="task-topline">
            <div>
              <h3>${escapeHtml(task.topic)}</h3>
              <p class="muted">${escapeHtml(task.note)}</p>
            </div>
            <div class="chip-row">
              <span class="chip">${escapeHtml(task.type)}</span>
              <span class="chip">${escapeHtml(task.bucket)}</span>
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

  function renderUploads(uploadInfo) {
    const container = document.getElementById("upload-items");
    const items = toList(uploadInfo.items).slice(0, 8);

    if (!items.length) {
      container.innerHTML = createEmptyState("No uploaded files were found.");
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="mistake-card">
        <p class="section-label">${escapeHtml(item.category)}</p>
        <h3>${escapeHtml(item.fileName)}</h3>
        <p class="mistake-detail muted">${escapeHtml(item.relativePath)}</p>
        <p class="mistake-detail">${escapeHtml(item.summary)}</p>
      </article>
    `).join("");
  }

  function getSyncedTasks(weekInfo, nextWeekInfo) {
    const combined = [
      ...toList(weekInfo.tasks).map((task) => ({ ...task, bucket: "This week" })),
      ...toList(nextWeekInfo.tasks).map((task) => ({ ...task, bucket: "Next week" }))
    ];

    return combined.filter((task) => String(task.source || "").toLowerCase() === "classroom-sync");
  }
});
