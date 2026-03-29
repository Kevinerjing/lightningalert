import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const uploadsDir = path.join(projectRoot, "uploads", "mistakes");
const outputPath = path.join(projectRoot, "data", "mistake-drafts.json");

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugToWords(value) {
  return normalizeText(
    String(value || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
  );
}

function guessSubject(fileName) {
  const text = fileName.toLowerCase();
  if (text.includes("math")) {
    return "Math";
  }
  if (text.includes("science") || text.includes("chem") || text.includes("snc")) {
    return "Science";
  }
  if (text.includes("english") || text.includes("writing") || text.includes("nick")) {
    return "English";
  }
  return "Unknown";
}

function guessTopic(fileName) {
  const cleaned = slugToWords(fileName);
  if (!cleaned) {
    return "New mistake draft";
  }

  return cleaned;
}

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function readExistingDrafts() {
  try {
    const raw = await fs.readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.drafts) ? parsed.drafts : [];
  } catch {
    return [];
  }
}

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  let imageFiles = [];
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    imageFiles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpe?g|webp)$/i.test(name));
  } catch {
    imageFiles = [];
  }

  const existingDrafts = await readExistingDrafts();
  const existingByPath = new Map(existingDrafts.map((draft) => [draft.imagePath, draft]));

  const drafts = [];

  for (const fileName of imageFiles.sort()) {
    const absolutePath = path.join(uploadsDir, fileName);
    const stats = await fs.stat(absolutePath);
    const imagePath = `uploads/mistakes/${fileName}`.replace(/\\/g, "/");
    const previousDraft = existingByPath.get(imagePath);

    drafts.push({
      id: previousDraft?.id || `draft-${path.parse(fileName).name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      imagePath,
      fileName,
      detectedAt: new Date(stats.mtimeMs).toISOString(),
      subjectGuess: previousDraft?.subjectGuess || guessSubject(fileName),
      topicGuess: previousDraft?.topicGuess || guessTopic(fileName),
      status: previousDraft?.status || "needs details",
      source: "mistake-image-draft",
      note: previousDraft?.note || "Add subject, topic, question, answers, and explanation after reviewing the image.",
      fieldsToFill: [
        "subject",
        "topic",
        "subtopic",
        "question",
        "studentAnswer",
        "correctAnswer",
        "errorType",
        "explanation",
        "correction",
        "retryStatus",
        "masteryLevel"
      ]
    });
  }

  drafts.sort((left, right) => right.detectedAt.localeCompare(left.detectedAt));

  const latestDraft = drafts[0]
    ? {
        imagePath: drafts[0].imagePath,
        subjectGuess: drafts[0].subjectGuess,
        topicGuess: drafts[0].topicGuess
      }
    : null;

  const output = {
    generatedAt: new Date().toISOString(),
    draftCount: drafts.length,
    latestDraft,
    notes: [
      "This is a first-pass local draft list for photographed mistakes.",
      "No OCR is performed in V1. Review the image and fill in the missing fields manually.",
      "Filename-based guesses are only hints and may need correction."
    ],
    drafts
  };

  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Drafted ${drafts.length} mistake image(s).`);
}

main().catch((error) => {
  console.error(normalizeText(error?.message || error));
  process.exitCode = 1;
});
