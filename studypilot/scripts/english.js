document.addEventListener("DOMContentLoaded", async () => {
  const { fetchJson, toList } = window.StudyUtils;
  const { renderTopicSections } = window.StudyApp;
  const data = await loadEnglishData(fetchJson);

  renderTopicSections("english-topics", toList(data.topics), {
    subjectName: "English",
    sections: [
      { title: "Reading focus", key: "readingFocus" },
      { title: "Writing structure support", key: "writingTips" },
      { title: "Structure templates", key: "structureTemplates" },
      { title: "Vocabulary support", key: "vocabulary" },
      { title: "Useful resources", key: "resources" },
      { title: "Short practice prompts", key: "practicePrompts" }
    ]
  });
});

async function loadEnglishData(fetchJson) {
  const apiPayload = await fetchJson("../api/studypilot-english", null);
  if (apiPayload && apiPayload.topics) {
    return apiPayload;
  }

  const data = await fetchJson("../data/english.json", { topics: [] });
  return {
    source: "json-fallback",
    topics: Array.isArray(data.topics) ? data.topics : []
  };
}
