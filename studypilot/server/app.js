const path = require("path");
const fs = require("fs/promises");
const { execFile } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (error) {
  console.warn("node:sqlite is not available; StudyPilot will use command-based local D1 sync.");
}

require("dotenv").config();

const PORT = Number(process.env.STUDYPILOT_PORT || 3000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5";
const MAX_UPLOAD_MB = Number(process.env.STUDYPILOT_MAX_UPLOAD_MB || 30);
const SHOULD_SYNC_LOCAL_D1 = process.env.STUDYPILOT_SYNC_LOCAL_D1 !== "0";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
    files: 5
  }
});

const app = express();
const studyPilotRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(studyPilotRoot, "..");
const dataRoot = path.join(studyPilotRoot, "data");
const uploadsRoot = path.join(studyPilotRoot, "uploads");
const execFileAsync = promisify(execFile);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(studyPilotRoot));

app.get("/api/studypilot-chat/health", (_request, response) => {
  response.json({
    ok: true,
    model: OPENAI_MODEL,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.get("/api/studypilot-dashboard", async (_request, response) => {
  try {
    response.json(await buildDashboardPayloadFromJson());
  } catch (error) {
    console.error("StudyPilot dashboard request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build dashboard payload."
    });
  }
});

app.get("/api/studypilot-science", async (_request, response) => {
  try {
    response.json(await buildSciencePayloadFromJson());
  } catch (error) {
    console.error("StudyPilot science request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build science payload."
    });
  }
});

app.get("/api/studypilot-math", async (_request, response) => {
  try {
    response.json(await buildMathPayloadFromJson());
  } catch (error) {
    console.error("StudyPilot math request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build math payload."
    });
  }
});

app.get("/api/studypilot-english", async (_request, response) => {
  try {
    response.json(await buildEnglishPayloadFromJson());
  } catch (error) {
    console.error("StudyPilot english request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build english payload."
    });
  }
});

app.get("/api/studypilot-mistakes", async (_request, response) => {
  try {
    response.json(await buildMistakesPayloadFromJson());
  } catch (error) {
    console.error("StudyPilot mistakes request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build mistakes payload."
    });
  }
});

app.get("/api/studypilot-review", async (_request, response) => {
  try {
    response.json(await buildReviewPayloadFromJson());
  } catch (error) {
    console.error("StudyPilot review request failed:", error);
    response.status(500).json({
      error: error?.message || "Could not build review payload."
    });
  }
});

app.post("/api/studypilot-chat", upload.array("files", 5), async (request, response) => {
  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({
      error: "Missing OPENAI_API_KEY. Add it to your environment or .env file before starting the StudyPilot server."
    });
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const history = parseJsonArray(request.body.history);
  const page = String(request.body.page || "/");
  const userMessage = String(request.body.message || "").trim();
  const uploadedFiles = Array.isArray(request.files) ? request.files : [];
  const fileIdsToDelete = [];

  if (!userMessage && !uploadedFiles.length) {
    response.status(400).json({ error: "Message or file upload is required." });
    return;
  }

  try {
    const requestHints = inferRequestHints(userMessage, page, uploadedFiles);
    const input = buildConversationInput(history, userMessage, page, uploadedFiles, requestHints);
    const uploadedInputItems = await uploadFilesToOpenAI(client, uploadedFiles, fileIdsToDelete);

    if (uploadedInputItems.length) {
      input.push({
        role: "user",
        content: uploadedInputItems
      });
    }

    const aiResponse = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: buildInstructions(page, requestHints),
      input,
      text: {
        format: {
          type: "json_schema",
          name: "studypilot_chat_result",
          strict: true,
          schema: getStudyPilotResponseSchema()
        }
      }
    });

    const parsedResult = parseModelResult(aiResponse.output_text);
    const { appliedUpdates, d1Sync } = await applyStudyPilotUpdates(parsedResult, uploadedFiles);

    response.json({
      reply: parsedResult.reply || "No text reply returned from OpenAI.",
      responseId: aiResponse.id,
      model: OPENAI_MODEL,
      appliedUpdates,
      d1Sync,
      reloadRecommended: appliedUpdates.length > 0
    });
  } catch (error) {
    console.error("StudyPilot chat request failed:", error);
    response.status(500).json({
      error: error?.message || "OpenAI request failed."
    });
  } finally {
    await Promise.allSettled(fileIdsToDelete.map((fileId) => client.files.delete(fileId)));
  }
});

app.get(/.*/, (request, response) => {
  const requestedPath = request.path === "/" ? "index.html" : request.path.replace(/^\//, "");
  response.sendFile(path.join(studyPilotRoot, requestedPath), (error) => {
    if (error) {
      response.status(404).sendFile(path.join(studyPilotRoot, "index.html"));
    }
  });
});

app.listen(PORT, () => {
  console.log(`StudyPilot server running at http://localhost:${PORT}`);
});

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Could not parse chat history:", error);
    return [];
  }
}

function buildInstructions(page, requestHints) {
  return [
    "You are Codex inside the StudyPilot app, a warm and practical coding and study assistant.",
    "Keep answers concise, specific, and helpful for a student or parent using this local dashboard.",
    "When files are attached, use them directly and mention concrete next steps only when useful.",
    "Return structured JSON only using the required schema.",
    "Most users want website updates, not just chat-only summaries.",
    "If the user uploads a new teacher slide, handout, worksheet, lesson note, or class material, treat it as slide_material unless the user clearly asks for something else.",
    "If the user uploads a mistake photo, marked work, corrected quiz, or error example, treat it as mistake unless the user clearly asks for something else.",
    "If the user asks for simple English, write the reply and the website-facing summary in easy student-friendly English with short sentences.",
    "If the intent is slide_material, subjectUpdate should usually be filled and mistakeUpdate should usually be null.",
    "If the intent is mistake, mistakeUpdate should usually be filled and subjectUpdate should be used only if extra study support is clearly helpful.",
    "If the content belongs to Science, Math, or English, choose that exact subject instead of General.",
    "If the user is asking a specific worksheet question, fill-in-the-blank, or 'what do I write here' question, begin the reply with 'Direct answer: ' followed by one short sentence that answers immediately.",
    "After the direct answer, you may add a very short explanation if useful.",
    "If the user both asks a specific question and asks to update support or the page, keep this order: Direct answer first, then Short explanation, then any website update summary.",
    "A Science page update should feel like a study card: key ideas, simple support notes, easy-medium-hard practice, and short mastery checks.",
    "A Math page update should feel like a study card: formulas or rules, solving steps, common mistakes, and practice items.",
    "An English page update should feel like a study card: reading focus, writing tips, vocabulary, and short practice prompts.",
    "For mistake entries, keep the explanation and correction clear enough for a student to review later on the webpage.",
    "Only create tasks when they are genuinely helpful, and keep them short and realistic.",
    "Use subjects Science, Math, English, or General.",
    `Detected request hints: ${JSON.stringify(requestHints)}.`,
    `The user is currently on the StudyPilot page: ${page}.`
  ].join(" ");
}

function buildConversationInput(history, message, page, uploadedFiles, requestHints) {
  const sanitizedHistory = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: [
        item.role === "assistant"
          ? { type: "output_text", text: String(item.text || "") }
          : { type: "input_text", text: String(item.text || "") }
      ]
    }));

  sanitizedHistory.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: [
          `Current page: ${page}`,
          `Detected subject hint: ${requestHints.subjectHint}`,
          `Detected intent hint: ${requestHints.intentHint}`,
          `Simple English requested: ${requestHints.simpleEnglishRequested ? "yes" : "no"}`,
          uploadedFiles.length
            ? `Uploaded files: ${uploadedFiles.map((file) => file.originalname).join(", ")}`
            : "Uploaded files: none",
          message ? `User message: ${message}` : "User message: (file-only upload)"
        ].join("\n")
      }
    ]
  });

  return sanitizedHistory;
}

async function uploadFilesToOpenAI(client, files, fileIdsToDelete) {
  const uploadedItems = [];

  for (const file of files) {
    if (isInlineImageMime(file.mimetype, file.originalname)) {
      uploadedItems.push({
        type: "input_image",
        image_url: `data:${file.mimetype || "image/jpeg"};base64,${file.buffer.toString("base64")}`
      });
      continue;
    }

    const uploadedFile = await client.files.create({
      file: await toFile(file.buffer, file.originalname, {
        type: file.mimetype || "application/octet-stream"
      }),
      purpose: "user_data"
    });

    fileIdsToDelete.push(uploadedFile.id);
    uploadedItems.push({
      type: "input_file",
      file_id: uploadedFile.id
    });
  }

  return uploadedItems;
}

function isInlineImageMime(mimeType, fileName) {
  const normalizedMime = String(mimeType || "").toLowerCase();
  const normalizedName = String(fileName || "").toLowerCase();
  return normalizedMime.startsWith("image/")
    || [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((suffix) => normalizedName.endsWith(suffix));
}

function getStudyPilotResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["reply", "intent", "subject", "subjectUpdate", "mistakeUpdate", "tasks"],
    properties: {
      reply: { type: "string" },
      intent: {
        type: "string",
        enum: ["slide_material", "mistake", "task_only", "other"]
      },
      subject: {
        type: "string",
        enum: ["Science", "Math", "English", "General"]
      },
      subjectUpdate: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["topic", "summary", "directAnswer", "coreItems", "supportItems", "exampleItems", "practiceEasy", "practiceMedium", "practiceHard", "resourceNotes", "vocabulary", "mistakePatterns", "feynmanChecklist", "applications"],
            properties: {
              topic: { type: "string" },
              summary: { type: "string" },
              directAnswer: { type: "string" },
              coreItems: stringArraySchema(),
              supportItems: stringArraySchema(),
              exampleItems: stringArraySchema(),
              practiceEasy: stringArraySchema(),
              practiceMedium: stringArraySchema(),
              practiceHard: stringArraySchema(),
              resourceNotes: stringArraySchema(),
              vocabulary: stringArraySchema(),
              mistakePatterns: stringArraySchema(),
              feynmanChecklist: stringArraySchema(),
              applications: stringArraySchema()
            }
          }
        ]
      },
      mistakeUpdate: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["topic", "subtopic", "errorType", "question", "studentAnswer", "correctAnswer", "explanation", "correction", "retryStatus", "masteryLevel"],
            properties: {
              topic: { type: "string" },
              subtopic: { type: "string" },
              errorType: { type: "string" },
              question: { type: "string" },
              studentAnswer: { type: "string" },
              correctAnswer: { type: "string" },
              explanation: { type: "string" },
              correction: { type: "string" },
              retryStatus: { type: "string" },
              masteryLevel: { type: "integer", minimum: 1, maximum: 5 }
            }
          }
        ]
      },
      tasks: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["bucket", "subject", "topic", "type", "note", "dueDate", "priority"],
          properties: {
            bucket: {
              type: "string",
              enum: ["today", "week", "nextWeek"]
            },
            subject: {
              type: "string",
              enum: ["Science", "Math", "English", "General"]
            },
            topic: { type: "string" },
            type: { type: "string" },
            note: { type: "string" },
            dueDate: { type: "string" },
            priority: {
              type: "string",
              enum: ["High", "Medium", "Low"]
            }
          }
        }
      }
    }
  };
}

function stringArraySchema() {
  return {
    type: "array",
    items: { type: "string" }
  };
}

function parseModelResult(outputText) {
  try {
    return JSON.parse(outputText || "{}");
  } catch (error) {
    throw new Error(`Could not parse structured model output: ${error.message}`);
  }
}

async function applyStudyPilotUpdates(result, uploadedFiles) {
  const updates = [];
  const intent = String(result.intent || "other");
  const subject = normalizeSubject(result.subject);
  const savedFiles = await saveUploadedFiles(intent, uploadedFiles);
  const localD1 = await openLocalD1Writer();
  const d1Sync = {
    attempted: false,
    status: "skipped"
  };

  try {
    if (localD1 && savedFiles.length) {
      try {
        mirrorUploadsToLocalD1(localD1, savedFiles);
        d1Sync.attempted = true;
        d1Sync.status = "direct";
      } catch (error) {
        console.error("StudyPilot direct upload mirror failed:", error);
        d1Sync.attempted = true;
        d1Sync.status = "failed";
        d1Sync.error = error?.message || "Could not mirror uploads to local D1.";
      }
    }

    if (result.subjectUpdate && subject !== "General") {
      const summary = await applySubjectUpdate(subject, result.subjectUpdate, savedFiles, localD1, d1Sync);
      updates.push(summary);
    }

    if (result.mistakeUpdate && subject !== "General") {
      const summary = await applyMistakeUpdate(subject, result.mistakeUpdate, savedFiles, localD1, d1Sync);
      updates.push(summary);
    }

    for (const task of Array.isArray(result.tasks) ? result.tasks : []) {
      const summary = await applyTaskUpdate(task, savedFiles, localD1, d1Sync);
      if (summary) {
        updates.push(summary);
      }
    }
  } finally {
    localD1?.close?.();
  }

  if (updates.length && (!localD1 || d1Sync.status === "failed")) {
    return {
      appliedUpdates: updates,
      d1Sync: await syncLocalD1IfNeeded(updates)
    };
  }

  if (updates.length && localD1 && d1Sync.status === "skipped") {
    d1Sync.attempted = true;
    d1Sync.status = "direct";
  }

  return {
    appliedUpdates: updates,
    d1Sync
  };
}

async function saveUploadedFiles(intent, uploadedFiles) {
  const savedFiles = [];
  const targetFolder =
    intent === "mistake"
      ? path.join(uploadsRoot, "mistakes")
      : path.join(uploadsRoot, "docs");

  await fs.mkdir(targetFolder, { recursive: true });

  for (const file of uploadedFiles) {
    const safeName = buildSafeUploadName(file.originalname || "upload.bin");
    const fullPath = path.join(targetFolder, safeName);
    await fs.writeFile(fullPath, file.buffer);
    const relativePath = path.relative(studyPilotRoot, fullPath).replaceAll("\\", "/");
    savedFiles.push({
      id: stableId("upload", relativePath),
      name: file.originalname,
      relativePath,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size || file.buffer?.length || null,
      uploadedAt: new Date().toISOString(),
      category: intent === "mistake" ? "mistakes" : "docs"
    });
  }

  return savedFiles;
}

function buildSafeUploadName(fileName) {
  const extension = path.extname(fileName || "");
  const baseName = path.basename(fileName || "upload", extension)
    .replaceAll(/[^a-zA-Z0-9-_]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 60) || "upload";
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  return `${baseName}-${stamp}${extension}`;
}

function normalizeSubject(subject) {
  const normalized = String(subject || "").toLowerCase();
  if (normalized === "science") {
    return "Science";
  }
  if (normalized === "math") {
    return "Math";
  }
  if (normalized === "english") {
    return "English";
  }
  return "General";
}

function inferRequestHints(message, page, uploadedFiles) {
  const normalizedMessage = String(message || "").toLowerCase();
  const normalizedPage = String(page || "").toLowerCase();
  const fileNames = uploadedFiles.map((file) => String(file.originalname || "").toLowerCase()).join(" ");
  const combined = `${normalizedMessage} ${normalizedPage} ${fileNames}`;

  let subjectHint = "General";
  if (combined.includes("science") || normalizedPage.includes("science")) {
    subjectHint = "Science";
  } else if (combined.includes("math") || normalizedPage.includes("math")) {
    subjectHint = "Math";
  } else if (combined.includes("english") || normalizedPage.includes("english")) {
    subjectHint = "English";
  }

  let intentHint = "other";
  if (/(mistake|wrong|error|quiz|test correction|marked)/.test(combined)) {
    intentHint = "mistake";
  } else if (/(slide|slides|handout|lesson|worksheet|teacher|material|notes|ppt|pdf)/.test(combined)) {
    intentHint = "slide_material";
  } else if (/(task|homework|due|schedule|plan)/.test(combined)) {
    intentHint = "task_only";
  }

  const simpleEnglishRequested = /(simple english|easy english|easy words|simple words|grade 9|student friendly)/.test(combined);
  const directQuestionRequested = /(\bwhat is\b|\bwhat do i write\b|\bwhat goes in\b|\bfill in\b|\bblank\b|\bwhich answer\b|\bwhat should i put\b|\?)/.test(normalizedMessage);

  return {
    subjectHint,
    intentHint,
    simpleEnglishRequested,
    directQuestionRequested
  };
}

async function applySubjectUpdate(subject, subjectUpdate, savedFiles, localD1, d1Sync) {
  const fileName = `${subject.toLowerCase()}.json`;
  const filePath = path.join(dataRoot, fileName);
  const data = await readJson(filePath, { topics: [] });
  const resourceObjects = buildResourceObjects(subjectUpdate.resourceNotes, savedFiles);
  const mappedTopic = mapSubjectTopic(subject, subjectUpdate, resourceObjects);

  data.topics = Array.isArray(data.topics) ? data.topics : [];
  data.topics.unshift(mappedTopic);
  await writeJson(filePath, data);

  if (localD1) {
    try {
      mirrorSubjectTopicToLocalD1(localD1, subject, mappedTopic, savedFiles);
      d1Sync.attempted = true;
      if (d1Sync.status !== "failed") {
        d1Sync.status = "direct";
      }
    } catch (error) {
      console.error("StudyPilot direct subject mirror failed:", error);
      d1Sync.attempted = true;
      d1Sync.status = "failed";
      d1Sync.error = error?.message || "Could not mirror subject topic to local D1.";
    }
  }

  return {
    type: "subject-page",
    target: `${subject} page`,
    detail: `Added a new ${subject} support card: ${mappedTopic.topic}`
  };
}

function buildResourceObjects(resourceNotes, savedFiles) {
  const notes = Array.isArray(resourceNotes) ? resourceNotes.filter(Boolean) : [];
  const fileResources = savedFiles.map((file) => ({
    label: file.name,
    url: `../${file.relativePath}`
  }));

  const noteResources = notes.map((note) => ({ label: note }));
  return [...fileResources, ...noteResources];
}

function mapSubjectTopic(subject, subjectUpdate, resourceObjects) {
  const base = {
    topic: subjectUpdate.topic,
    summary: subjectUpdate.summary,
    directAnswer: subjectUpdate.directAnswer || ""
  };

  if (subject === "Science") {
    return {
      ...base,
      keyConcepts: toArray(subjectUpdate.coreItems),
      teacherNotes: toArray(subjectUpdate.supportItems),
      resources: resourceObjects.length ? resourceObjects : toArray(subjectUpdate.exampleItems),
      quizEasy: toArray(subjectUpdate.practiceEasy),
      quizMedium: toArray(subjectUpdate.practiceMedium),
      quizHard: toArray(subjectUpdate.practiceHard),
      feynmanChecklist: toArray(subjectUpdate.feynmanChecklist),
      applications: toArray(subjectUpdate.applications)
    };
  }

  if (subject === "Math") {
    return {
      ...base,
      formulas: toArray(subjectUpdate.coreItems),
      solvingSteps: toArray(subjectUpdate.supportItems),
      examples: toArray(subjectUpdate.exampleItems),
      commonMistakes: toArray(subjectUpdate.mistakePatterns),
      practiceEasy: toArray(subjectUpdate.practiceEasy),
      practiceMedium: toArray(subjectUpdate.practiceMedium),
      practiceHard: toArray(subjectUpdate.practiceHard)
    };
  }

  return {
    ...base,
    readingFocus: toArray(subjectUpdate.coreItems),
    writingTips: toArray(subjectUpdate.supportItems),
    structureTemplates: toArray(subjectUpdate.exampleItems),
    vocabulary: toArray(subjectUpdate.vocabulary),
    resources: resourceObjects,
    practicePrompts: [
      ...toArray(subjectUpdate.practiceEasy),
      ...toArray(subjectUpdate.practiceMedium),
      ...toArray(subjectUpdate.practiceHard)
    ].slice(0, 8)
  };
}

async function applyMistakeUpdate(subject, mistakeUpdate, savedFiles, localD1, d1Sync) {
  const filePath = path.join(dataRoot, "mistakes.json");
  const data = await readJson(filePath, { mistakes: [] });
  const linkedImage = savedFiles[0]?.relativePath || "";
  const mistakeEntry = {
    subject,
    topic: mistakeUpdate.topic,
    subtopic: mistakeUpdate.subtopic,
    date: new Date().toISOString().slice(0, 10),
    errorType: mistakeUpdate.errorType,
    question: mistakeUpdate.question,
    studentAnswer: mistakeUpdate.studentAnswer,
    correctAnswer: mistakeUpdate.correctAnswer,
    explanation: mistakeUpdate.explanation,
    correction: mistakeUpdate.correction,
    retryStatus: mistakeUpdate.retryStatus,
    masteryLevel: Number(mistakeUpdate.masteryLevel || 1),
    source: "codex-chat-upload",
    imagePath: linkedImage || "Not linked yet"
  };

  data.mistakes = Array.isArray(data.mistakes) ? data.mistakes : [];
  data.mistakes.unshift(mistakeEntry);
  await writeJson(filePath, data);

  if (localD1) {
    try {
      mirrorMistakeToLocalD1(localD1, mistakeEntry, savedFiles);
      d1Sync.attempted = true;
      if (d1Sync.status !== "failed") {
        d1Sync.status = "direct";
      }
    } catch (error) {
      console.error("StudyPilot direct mistake mirror failed:", error);
      d1Sync.attempted = true;
      d1Sync.status = "failed";
      d1Sync.error = error?.message || "Could not mirror mistake to local D1.";
    }
  }

  return {
    type: "mistake-notebook",
    target: "Mistakes Notebook",
    detail: `Added a new ${subject} mistake entry: ${mistakeEntry.topic}`
  };
}

async function applyTaskUpdate(task, savedFiles, localD1, d1Sync) {
  const bucketMap = {
    today: "today.json",
    week: "week.json",
    nextWeek: "next-week.json"
  };
  const bucket = bucketMap[task.bucket];
  if (!bucket || normalizeSubject(task.subject) === "General") {
    return null;
  }

  const filePath = path.join(dataRoot, bucket);
  const data = await readJson(filePath, { tasks: [] });
  const firstResource = savedFiles[0];
  const taskEntry = {
    subject: normalizeSubject(task.subject),
    topic: task.topic,
    type: task.type,
    note: task.note,
    dueDate: task.dueDate,
    priority: task.priority,
    ...(firstResource
      ? {
          resourceLabel: `Open ${firstResource.name}`,
          resourceLink: firstResource.relativePath
        }
      : {})
  };

  data.tasks = Array.isArray(data.tasks) ? data.tasks : [];
  data.tasks.unshift(taskEntry);
  await writeJson(filePath, data);

  if (localD1) {
    try {
      mirrorTaskToLocalD1(localD1, task.bucket, taskEntry, savedFiles);
      d1Sync.attempted = true;
      if (d1Sync.status !== "failed") {
        d1Sync.status = "direct";
      }
    } catch (error) {
      console.error("StudyPilot direct task mirror failed:", error);
      d1Sync.attempted = true;
      d1Sync.status = "failed";
      d1Sync.error = error?.message || "Could not mirror task to local D1.";
    }
  }

  return {
    type: "task-list",
    target: task.bucket,
    detail: `Added a new ${task.bucket} task: ${taskEntry.topic}`
  };
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

async function openLocalD1Writer() {
  if (!SHOULD_SYNC_LOCAL_D1 || !DatabaseSync) {
    return null;
  }

  try {
    const databasePath = await findLocalD1DatabasePath();
    if (!databasePath) {
      return null;
    }

    const database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys = ON;");
    return database;
  } catch (error) {
    console.error("StudyPilot could not open local D1 database:", error);
    return null;
  }
}

async function findLocalD1DatabasePath() {
  const d1Root = path.join(studyPilotRoot, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

  try {
    const entries = await fs.readdir(d1Root, { withFileTypes: true });
    const sqliteEntry = entries.find((entry) => entry.isFile() && entry.name.endsWith(".sqlite"));
    return sqliteEntry ? path.join(d1Root, sqliteEntry.name) : null;
  } catch {
    return null;
  }
}

function mirrorUploadsToLocalD1(db, savedFiles) {
  const statement = db.prepare(`
    INSERT INTO uploads (
      id, source_mode, category, original_name, storage_path, mime_type, size_bytes, uploaded_at, notes
    ) VALUES (?, 'local', ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      original_name = excluded.original_name,
      storage_path = excluded.storage_path,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      uploaded_at = excluded.uploaded_at
  `);

  for (const file of savedFiles) {
    statement.run(
      file.id,
      file.category || "other",
      file.name || file.relativePath,
      file.relativePath,
      file.mimeType || null,
      file.sizeBytes ?? null,
      file.uploadedAt || new Date().toISOString()
    );
  }
}

function mirrorSubjectTopicToLocalD1(db, subject, mappedTopic, savedFiles) {
  const subjectSlug = subject.toLowerCase();
  const cardId = stableId("subject-card", `${subjectSlug}:${mappedTopic.topic}:${Date.now()}`);
  const sourceUploadId = savedFiles[0]?.id || null;

  db.prepare(`
    INSERT INTO subject_topic_cards (
      id, subject_slug, title, summary, source_kind, source_upload_id, source_ref, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'chat_upload', ?, NULL, ?, ?)
  `).run(cardId, subjectSlug, mappedTopic.topic, mappedTopic.summary || "", sourceUploadId, new Date().toISOString(), new Date().toISOString());

  const sectionKeys = getSubjectSectionKeys(subject);
  for (const sectionKey of sectionKeys) {
    insertSectionItemsToLocalD1(db, "subject_topic_sections", "card_id", cardId, sectionKey, mappedTopic[sectionKey] || []);
  }
}

function mirrorMistakeToLocalD1(db, mistakeEntry, savedFiles) {
  db.prepare(`
    INSERT INTO mistakes (
      id, subject_slug, topic, subtopic, mistake_date, error_type, question, student_answer, correct_answer,
      explanation, correction, retry_status, mastery_level, source_kind, source_upload_id, image_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'chat_upload', ?, ?, ?, ?)
  `).run(
    stableId("mistake", `${mistakeEntry.subject}:${mistakeEntry.topic}:${Date.now()}`),
    String(mistakeEntry.subject || "").toLowerCase(),
    mistakeEntry.topic || "",
    mistakeEntry.subtopic || null,
    mistakeEntry.date || null,
    mistakeEntry.errorType || "",
    mistakeEntry.question || "",
    mistakeEntry.studentAnswer || "",
    mistakeEntry.correctAnswer || "",
    mistakeEntry.explanation || "",
    mistakeEntry.correction || "",
    mistakeEntry.retryStatus || "",
    Number(mistakeEntry.masteryLevel || 1),
    savedFiles[0]?.id || null,
    mistakeEntry.imagePath || null,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

function mirrorTaskToLocalD1(db, bucket, taskEntry, savedFiles) {
  db.prepare(`
    INSERT INTO study_tasks (
      id, bucket, subject_slug, topic, task_type, note, due_date, priority,
      resource_label, resource_url, classroom_topic, classroom_type, source_kind, source_key, source_upload_id,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'chat_upload', NULL, ?, 1, ?, ?)
  `).run(
    stableId("task", `${bucket}:${taskEntry.subject}:${taskEntry.topic}:${Date.now()}`),
    bucket,
    String(taskEntry.subject || "").toLowerCase(),
    taskEntry.topic || "",
    taskEntry.type || "task",
    taskEntry.note || "",
    taskEntry.dueDate || null,
    taskEntry.priority || "Medium",
    taskEntry.resourceLabel || null,
    taskEntry.resourceLink || null,
    savedFiles[0]?.id || null,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

function insertSectionItemsToLocalD1(db, tableName, parentColumn, parentId, sectionKey, items) {
  const rows = Array.isArray(items) ? items : [];
  const sectionTitle = getSectionTitle(sectionKey);
  const statement = db.prepare(`
    INSERT INTO ${tableName} (
      id, ${parentColumn}, section_key, section_title, item_order, item_type, text_value, label, url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((item, index) => {
    if (item && typeof item === "object" && item.label) {
      statement.run(
        stableId(`${tableName}-item`, `${parentId}:${sectionKey}:${index}:${JSON.stringify(item)}`),
        parentId,
        sectionKey,
        sectionTitle,
        index,
        "resource",
        null,
        item.label,
        item.url || null
      );
      return;
    }

    statement.run(
      stableId(`${tableName}-item`, `${parentId}:${sectionKey}:${index}:${String(item)}`),
      parentId,
      sectionKey,
      sectionTitle,
      index,
      "text",
      String(item),
      null,
      null
    );
  });
}

function getSubjectSectionKeys(subject) {
  if (subject === "Science") {
    return ["directAnswer", "keyConcepts", "teacherNotes", "resources", "quizEasy", "quizMedium", "quizHard", "feynmanChecklist", "applications"];
  }
  if (subject === "Math") {
    return ["directAnswer", "formulas", "solvingSteps", "examples", "commonMistakes", "practiceEasy", "practiceMedium", "practiceHard"];
  }
  return ["directAnswer", "readingFocus", "writingTips", "structureTemplates", "vocabulary", "resources", "practicePrompts"];
}

function getSectionTitle(sectionKey) {
  return {
    directAnswer: "Direct answer",
    keyConcepts: "Key concepts",
    teacherNotes: "Teacher notes summary",
    resources: "Useful learning resources",
    quizEasy: "Easy quiz questions",
    quizMedium: "Medium quiz questions",
    quizHard: "Hard quiz questions",
    feynmanChecklist: "Feynman mastery checklist",
    applications: "Real-world applications",
    formulas: "Formulas",
    solvingSteps: "Step-by-step solving process",
    examples: "Worked examples",
    commonMistakes: "Common mistakes",
    practiceEasy: "Easy practice questions",
    practiceMedium: "Medium practice questions",
    practiceHard: "Hard practice questions",
    readingFocus: "Reading focus",
    writingTips: "Writing structure support",
    structureTemplates: "Structure templates",
    vocabulary: "Vocabulary support",
    practicePrompts: "Short practice prompts"
  }[sectionKey] || sectionKey;
}

function stableId(prefix, input) {
  return `${prefix}-${crypto.createHash("sha1").update(`${prefix}:${input}`).digest("hex").slice(0, 16)}`;
}

async function syncLocalD1IfNeeded(appliedUpdates) {
  if (!SHOULD_SYNC_LOCAL_D1 || !Array.isArray(appliedUpdates) || !appliedUpdates.length) {
    return {
      attempted: false,
      status: "skipped"
    };
  }

  try {
    await runRepoCommand(process.platform === "win32" ? "npm.cmd run studypilot:d1:sync-local" : "npm run studypilot:d1:sync-local");

    return {
      attempted: true,
      status: "success"
    };
  } catch (error) {
    console.error("StudyPilot local D1 sync failed:", error);
    return {
      attempted: true,
      status: "failed",
      error: error?.message || "Could not sync local D1."
    };
  }
}

async function runRepoCommand(commandLine) {
  if (process.platform === "win32") {
    return execFileAsync("cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: repoRoot,
      windowsHide: true
    });
  }

  return execFileAsync("sh", ["-lc", commandLine], {
    cwd: repoRoot
  });
}

async function buildDashboardPayloadFromJson() {
  const [todayData, weekData, nextWeekData, mistakesData] = await Promise.all([
    readJson(path.join(dataRoot, "today.json"), { tasks: [] }),
    readJson(path.join(dataRoot, "week.json"), { tasks: [] }),
    readJson(path.join(dataRoot, "next-week.json"), { tasks: [] }),
    readJson(path.join(dataRoot, "mistakes.json"), { mistakes: [] })
  ]);

  const recurringTasks = buildRecurringClubTasks();
  const todayTasks = [...toArray(todayData.tasks), ...recurringTasks.filter((task) => task.bucket === "today").map(stripTaskBucket)];
  const weekTasks = [...toArray(weekData.tasks), ...recurringTasks.filter((task) => task.bucket === "week").map(stripTaskBucket)];
  const nextWeekTasks = [...toArray(nextWeekData.tasks), ...recurringTasks.filter((task) => task.bucket === "nextWeek").map(stripTaskBucket)];
  const mistakes = toArray(mistakesData.mistakes);

  return {
    source: "json",
    tasks: {
      today: todayTasks,
      week: weekTasks,
      nextWeek: nextWeekTasks
    },
    totals: {
      today: todayTasks.length,
      week: weekTasks.length,
      nextWeek: nextWeekTasks.length,
      mistakesForReview: countMistakesForReview(mistakes)
    }
  };
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

function stripTaskBucket(task) {
  const { bucket, ...rest } = task;
  return rest;
}

function countMistakesForReview(mistakes) {
  return toArray(mistakes).filter((mistake) => {
    const status = String(mistake.retryStatus || "").toLowerCase();
    return status.includes("review") || status.includes("retry");
  }).length;
}

async function buildSciencePayloadFromJson() {
  const [scienceData, classroomData] = await Promise.all([
    readJson(path.join(dataRoot, "science.json"), { topics: [], upcomingSupport: [], schedule: null }),
    readJson(path.join(dataRoot, "classroom-updates.json"), { classrooms: [] })
  ]);

  const scienceClassroom = toArray(classroomData.classrooms).find((item) => item.key === "science");
  const chemistrySection = toArray(scienceClassroom?.topicSections).find((section) => section.topic === "Chemistry");

  return {
    source: "json",
    schedule: scienceData.schedule || null,
    upcomingSupport: toArray(scienceData.upcomingSupport),
    topics: toArray(scienceData.topics),
    classroomItems: toArray(chemistrySection?.items)
  };
}

async function buildMathPayloadFromJson() {
  const [mathData, classroomData] = await Promise.all([
    readJson(path.join(dataRoot, "math.json"), { topics: [] }),
    readJson(path.join(dataRoot, "classroom-updates.json"), { classrooms: [] })
  ]);

  const mathClassroom = toArray(classroomData.classrooms).find((item) => item.key === "math");
  const cycleSection = toArray(mathClassroom?.topicSections).find((section) => section.topic === "Cycle 3");

  return {
    source: "json",
    topics: toArray(mathData.topics),
    classroomItems: toArray(cycleSection?.items)
  };
}

async function buildEnglishPayloadFromJson() {
  const englishData = await readJson(path.join(dataRoot, "english.json"), { topics: [] });

  return {
    source: "json",
    topics: toArray(englishData.topics)
  };
}

async function buildMistakesPayloadFromJson() {
  const [mistakesData, draftsData] = await Promise.all([
    readJson(path.join(dataRoot, "mistakes.json"), { mistakes: [] }),
    readJson(path.join(dataRoot, "mistake-drafts.json"), { drafts: [] })
  ]);

  return {
    source: "json",
    mistakes: toArray(mistakesData.mistakes),
    drafts: toArray(draftsData.drafts)
  };
}

async function buildReviewPayloadFromJson() {
  const mistakesData = await readJson(path.join(dataRoot, "mistakes.json"), { mistakes: [] });
  const mistakes = toArray(mistakesData.mistakes);
  const reviewItems = mistakes.filter(shouldReviewToday);

  return {
    source: "json",
    reviewItems,
    total: reviewItems.length,
    suggestion: getReviewSuggestion(reviewItems.length)
  };
}

function shouldReviewToday(mistake) {
  const status = String(mistake.retryStatus || "").toLowerCase();
  const mastery = Number(mistake.masteryLevel || 0);

  if (status.includes("review now") || status.includes("retry today")) {
    return true;
  }

  if (status.includes("retry soon") && mastery < 4) {
    return true;
  }

  if (status.includes("partial") && mastery <= 2) {
    return true;
  }

  return false;
}

function getReviewSuggestion(total) {
  if (total >= 5) {
    return "Start with the hardest subject first, then finish with one confidence-building question.";
  }
  if (total >= 2) {
    return "Spend 10 to 15 minutes reviewing errors, then retest yourself on the same idea.";
  }
  if (total === 1) {
    return "Complete the one review item carefully and write one sentence about what changed in your thinking.";
  }
  return "No urgent review items today. Use the time for preview or extra practice.";
}
