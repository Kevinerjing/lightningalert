document.addEventListener("DOMContentLoaded", async () => {
  const { fetchJson, toList } = window.StudyUtils;
  const { renderTopicSections } = window.StudyApp;
  const data = await fetchJson("../data/english.json", { topics: [] });

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
