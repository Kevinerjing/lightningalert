const STUDY_TIME_ZONE = "America/Toronto";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/uploads/")) {
      return handleUploadAssetRequest(request, env);
    }

    if (url.pathname === "/api/studypilot-chat/health") {
      return jsonResponse({
        ok: true,
        model: env.OPENAI_MODEL || "gpt-5",
        hasApiKey: Boolean(env.OPENAI_API_KEY)
      });
    }

    if (url.pathname === "/api/studypilot-dashboard") {
      return handleDashboardRequest(env);
    }

    if (url.pathname === "/api/studypilot-science") {
      return handleScienceRequest(env);
    }

    if (url.pathname === "/api/studypilot-math") {
      return handleMathRequest(env);
    }

    if (url.pathname === "/api/studypilot-english") {
      return handleEnglishRequest(env);
    }

    if (url.pathname === "/api/studypilot-mistakes") {
      return handleMistakesRequest(env);
    }

    if (url.pathname === "/api/studypilot-review") {
      return handleReviewRequest(env);
    }

    if (url.pathname === "/api/studypilot-teen-economic") {
      return handleTeenEconomicRequest(env);
    }

    if (url.pathname === "/api/studypilot-topic-card/archive" && request.method === "POST") {
      return handleArchiveTopicCard(request, env);
    }

    if (url.pathname === "/api/studypilot-topic-card/restore" && request.method === "POST") {
      return handleRestoreTopicCard(request, env);
    }

    if (url.pathname === "/api/studypilot-chat" && request.method === "POST") {
      return handleStudyPilotChat(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleStudyPilotChat(request, env, ctx) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      {
        error: "Missing OPENAI_API_KEY in Cloudflare Worker secrets."
      },
      500
    );
  }

  const formData = await request.formData();
  const history = parseJsonArray(formData.get("history"));
  const page = String(formData.get("page") || "/");
  const message = String(formData.get("message") || "").trim();
  const chatMode = String(formData.get("chatMode") || "").trim();
  const files = formData.getAll("files").filter(isFileLike);
  const uploadedFileIds = [];

  if (!message && !files.length) {
    return jsonResponse({ error: "Message or file upload is required." }, 400);
  }

  try {
    const requestHints = inferRequestHints(message, page, files, chatMode);
    const input = buildConversationInput(history, message, page, files, requestHints);
    const uploadedFileRecords = await uploadFilesToOpenAI(files, env, uploadedFileIds);
    const fileInputItems = uploadedFileRecords
      .map((item) => item.inputItem)
      .filter(Boolean);

    if (fileInputItems.length) {
      input.push({
        role: "user",
        content: fileInputItems
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5",
        instructions: requestHints.teenEconomicMode
          ? buildTeenEconomicInstructions(page, requestHints)
          : buildInstructions(page, requestHints),
        input,
        text: {
          format: {
            type: "json_schema",
            name: requestHints.teenEconomicMode ? "studypilot_teen_economic_result" : "studypilot_chat_result",
            strict: true,
            schema: requestHints.teenEconomicMode
              ? getTeenEconomicResponseSchema()
              : getStudyPilotResponseSchema()
          }
        }
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      return jsonResponse(
        {
          error: payload?.error?.message || "OpenAI response generation failed."
        },
        response.status
      );
    }

    if (uploadedFileIds.length) {
      ctx.waitUntil(deleteUploadedFiles(uploadedFileIds, env.OPENAI_API_KEY));
    }

    const parsedResult = enforceDirectAnswer(parseModelResultFromPayload(payload), requestHints);
    const appliedUpdates = requestHints.teenEconomicMode
      ? await applyTeenEconomicD1Update(env, parsedResult, uploadedFileRecords, requestHints)
      : await applyStudyPilotD1Updates(env, parsedResult, uploadedFileRecords);

    return jsonResponse({
      reply: parsedResult.reply || "No text reply returned from OpenAI.",
      responseId: payload.id,
      model: env.OPENAI_MODEL || "gpt-5",
      appliedUpdates,
      reloadRecommended: appliedUpdates.length > 0,
      d1Sync: {
        attempted: appliedUpdates.length > 0,
        status: appliedUpdates.length > 0 ? "direct" : "skipped"
      }
    });
  } catch (error) {
    if (uploadedFileIds.length) {
      ctx.waitUntil(deleteUploadedFiles(uploadedFileIds, env.OPENAI_API_KEY));
    }

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "StudyPilot chat failed."
      },
      500
    );
  }
}

async function uploadFilesToOpenAI(files, env, uploadedFileIds) {
  const items = [];
  const uploadedAt = new Date().toISOString();

  for (const file of files) {
    const uploadId = stableId("upload", `${file.name || "upload.bin"}:${Date.now()}:${Math.random()}`);
    const category = inferUploadCategory(file.name || "");
    const objectKey = buildUploadObjectKey(category, file.name || "upload.bin", uploadId);
    const storedUpload = await storeUploadInR2(env, file, objectKey);

    if (isInlineImageMime(file.type, file.name)) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      items.push({
        id: uploadId,
        openAiFileId: null,
        inputItem: {
          type: "input_image",
          image_url: `data:${file.type || "image/jpeg"};base64,${base64}`
        },
        name: file.name || "upload.bin",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size || null,
        uploadedAt,
        category,
        objectKey,
        publicUrl: storedUpload.publicUrl
      });
      continue;
    }

    const openAiFormData = new FormData();
    openAiFormData.append("purpose", "user_data");
    openAiFormData.append("file", file, file.name || "upload.bin");

    const response = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: openAiFormData
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || `File upload failed for ${file.name || "upload"}.`);
    }

    uploadedFileIds.push(payload.id);
    items.push({
      id: uploadId,
      openAiFileId: payload.id,
      inputItem: {
        type: "input_file",
        file_id: payload.id
      },
      name: file.name || "upload.bin",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size || null,
      uploadedAt,
      category,
      objectKey,
      publicUrl: storedUpload.publicUrl
    });
  }

  return items;
}

async function storeUploadInR2(env, file, objectKey) {
  if (!env.UPLOADS) {
    return {
      objectKey: null,
      publicUrl: null
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  await env.UPLOADS.put(objectKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || inferMimeFromName(file.name || "")
    }
  });

  return {
    objectKey,
    publicUrl: `/uploads/${encodeURIComponent(objectKey)}`
  };
}

async function handleUploadAssetRequest(request, env) {
  if (!env.UPLOADS) {
    return new Response("Upload storage is not configured.", { status: 404 });
  }

  const url = new URL(request.url);
  const objectKey = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ""));
  if (!objectKey) {
    return new Response("Missing upload key.", { status: 404 });
  }

  const object = await env.UPLOADS.get(objectKey);
  if (!object) {
    return new Response("File not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=3600");
  headers.set("etag", object.httpEtag);
  headers.set("content-disposition", `inline; filename="${extractObjectFileName(objectKey)}"`);

  return new Response(object.body, { headers });
}

function extractObjectFileName(objectKey) {
  return objectKey.split("/").pop() || "upload.bin";
}

function buildUploadObjectKey(category, fileName, uploadId) {
  return `${category}/${uploadId}/${sanitizeFileName(fileName)}`;
}

function sanitizeFileName(fileName) {
  return String(fileName || "upload.bin")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferMimeFromName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function isInlineImageMime(mimeType, fileName) {
  const normalizedMime = String(mimeType || "").toLowerCase();
  const normalizedName = String(fileName || "").toLowerCase();
  return normalizedMime.startsWith("image/")
    || [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((suffix) => normalizedName.endsWith(suffix));
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function deleteUploadedFiles(fileIds, apiKey) {
  await Promise.allSettled(
    fileIds.map((fileId) =>
      fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      })
    )
  );
}

function buildInstructions(page, requestHints) {
  return [
    "You are Codex inside the StudyPilot app, a warm and practical coding and study assistant.",
    "Keep answers concise, specific, and helpful for a student or parent using this dashboard.",
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
    "If chatOnlyMode is true, answer in chat only. In chatOnlyMode, do not create subjectUpdate, mistakeUpdate, or tasks unless the user explicitly asks to update the website or page.",
    "If taskOnlyMode is true, prefer tasks only. In taskOnlyMode, do not create subjectUpdate or mistakeUpdate unless the user explicitly asks for a support card, study card, or page update.",
    "If mathPracticeLikely is true, prefer tasks and short chat help over a new Math support card. Reuse or update a Math support card only when the user clearly asks to update Math support.",
    "Only create tasks when they are genuinely helpful, and keep them short and realistic.",
    `Detected request hints: ${JSON.stringify(requestHints)}.`,
    `The user is currently on the StudyPilot page: ${page}.`
  ].join(" ");
}

function buildTeenEconomicInstructions(page, requestHints) {
  return [
    "You are Codex inside the StudyPilot app, helping build the Teen Economic weekly pack page.",
    "Keep answers concise, student-friendly, and focused on one Teen Economic article slot only.",
    "Return structured JSON only using the required schema.",
    "Do not create Science, Math, English, Mistakes, or general StudyPilot support updates.",
    "Extract an English title, a short summary, key English, the main question brief, an answer starter, and Feynman practice.",
    "Keep the English simple enough for a student to read independently.",
    "The answer starter should help the student begin, but should not be a full essay.",
    "If a target Teen Economic slot is provided, replace that slot only.",
    `Detected request hints: ${JSON.stringify(requestHints)}.`,
    `The user is currently on the StudyPilot page: ${page}.`
  ].join(" ");
}

function buildConversationInput(history, message, page, files, requestHints) {
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
          files.length ? `Uploaded files: ${files.map((file) => file.name || "upload").join(", ")}` : "Uploaded files: none",
          message ? `User message: ${message}` : "User message: (file-only upload)"
        ].join("\n")
      }
    ]
  });

  return sanitizedHistory;
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isFileLike(value) {
  return value && typeof value === "object" && "arrayBuffer" in value;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function extractResponseText(payload) {
  if (payload?.output_text) {
    return String(payload.output_text);
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const collected = [];

  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const content of contentItems) {
      if (typeof content?.text === "string" && content.text.trim()) {
        collected.push(content.text.trim());
      }
    }
  }

  return collected.join("\n\n").trim();
}

function parseModelResultFromPayload(payload) {
  const outputText = extractResponseText(payload);
  try {
    return JSON.parse(outputText || "{}");
  } catch (error) {
    throw new Error(`Could not parse structured model output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function enforceDirectAnswer(result, requestHints) {
  const normalized = result && typeof result === "object" ? { ...result } : {};
  const directQuestionRequested = Boolean(requestHints?.directQuestionRequested);
  const hasSubjectUpdate = normalized.subjectUpdate && typeof normalized.subjectUpdate === "object";

  if (!directQuestionRequested) {
    return normalized;
  }

  const replyText = String(normalized.reply || "").trim();
  const extracted = extractDirectAnswer(replyText);

  if (hasSubjectUpdate) {
    normalized.subjectUpdate = { ...normalized.subjectUpdate };
    if (!String(normalized.subjectUpdate.directAnswer || "").trim()) {
      normalized.subjectUpdate.directAnswer = extracted || firstUsefulSentence(replyText);
    }
  }

  const finalDirectAnswer = hasSubjectUpdate
    ? String(normalized.subjectUpdate.directAnswer || "").trim()
    : (extracted || firstUsefulSentence(replyText));

  if (finalDirectAnswer && !/^direct answer:/i.test(replyText)) {
    const explanation = replyText ? `\n\nShort explanation: ${replyText}` : "";
    normalized.reply = `Direct answer: ${finalDirectAnswer}${explanation}`;
  }

  return enforceCardSuppression(enforceChatOnlyMode(normalized, requestHints), requestHints);
}

function extractDirectAnswer(text) {
  const match = String(text || "").match(/direct answer:\s*(.+)$/im);
  return match ? match[1].trim() : "";
}

function firstUsefulSentence(text) {
  const cleaned = String(text || "")
    .replace(/^short answer:\s*/i, "")
    .replace(/^direct answer:\s*/i, "")
    .trim();
  if (!cleaned) {
    return "";
  }
  const firstLine = cleaned.split(/\n+/)[0].trim();
  const firstSentence = firstLine.match(/.+?[.!?](?:\s|$)/);
  return (firstSentence ? firstSentence[0] : firstLine).trim();
}

function inferRequestHints(message, page, files, chatMode = "") {
  const normalizedMessage = String(message || "").toLowerCase();
  const normalizedPage = String(page || "").toLowerCase();
  const normalizedChatMode = String(chatMode || "").toLowerCase();
  const fileNames = files.map((file) => String(file.name || "").toLowerCase()).join(" ");
  const combined = `${normalizedMessage} ${normalizedPage} ${fileNames}`;
  const teenEconomicSlotMatch = String(message || "").match(/target teen economic slot:\s*([a-z0-9-]+)/i);

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

  return {
    subjectHint,
    intentHint,
    simpleEnglishRequested: /(simple english|easy english|easy words|simple words|grade 9|student friendly)/.test(combined),
    directQuestionRequested: /(\bwhat is\b|\bwhat do i write\b|\bwhat goes in\b|\bfill in\b|\bblank\b|\bwhich answer\b|\bwhat should i put\b|\?)/.test(normalizedMessage),
    chatOnlyMode: normalizedChatMode === "chat-only",
    taskOnlyMode: normalizedChatMode === "task-only",
    teenEconomicMode: normalizedPage.includes("teen-economic")
      || normalizedChatMode === "teen-economic-update"
      || combined.includes("teen economic"),
    teenEconomicSlot: teenEconomicSlotMatch?.[1] || "",
    explicitUpdateRequested: /(update the website|update the page|update the support|add this to the page|save this to the page)/.test(normalizedMessage),
    explicitSupportRequested: /(support card|study card|update math support|update the math support|update science support|turn this into study support)/.test(normalizedMessage),
    mathPracticeLikely:
      subjectHint === "Math" &&
      /(worksheet|word problem|word problems|practice|homework|master|sheet|multiple representations|review questions|exercise)/.test(combined)
  };
}

function enforceChatOnlyMode(result, requestHints) {
  if (!requestHints?.chatOnlyMode || requestHints?.explicitUpdateRequested) {
    return result;
  }

  return {
    ...result,
    subjectUpdate: null,
    mistakeUpdate: null,
    tasks: []
  };
}

function enforceCardSuppression(result, requestHints) {
  if (!requestHints) {
    return result;
  }

  const shouldSuppressSubjectUpdate =
    (requestHints.taskOnlyMode || requestHints.mathPracticeLikely) &&
    !requestHints.explicitSupportRequested;

  if (!shouldSuppressSubjectUpdate) {
    return result;
  }

  return {
    ...result,
    subjectUpdate: null
  };
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
            bucket: { type: "string", enum: ["today", "week", "nextWeek"] },
            subject: { type: "string", enum: ["Science", "Math", "English", "General"] },
            topic: { type: "string" },
            type: { type: "string" },
            note: { type: "string" },
            dueDate: { type: "string" },
            priority: { type: "string", enum: ["High", "Medium", "Low"] }
          }
        }
      }
    }
  };
}

function getTeenEconomicResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["reply", "articleUpdate"],
    properties: {
      reply: { type: "string" },
      articleUpdate: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "summary",
          "sourceFileEnglishTitle",
          "sourceNote",
          "keyEnglish",
          "questionBrief",
          "answerStarter",
          "feynmanPractice"
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          sourceFileEnglishTitle: { type: "string" },
          sourceNote: { type: "string" },
          keyEnglish: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["term", "meaning", "support"],
              properties: {
                term: { type: "string" },
                meaning: { type: "string" },
                support: { type: "string" }
              }
            }
          },
          questionBrief: {
            type: "object",
            additionalProperties: false,
            required: ["question", "whatItMeans", "whatToDo"],
            properties: {
              question: { type: "string" },
              whatItMeans: { type: "string" },
              whatToDo: stringArraySchema()
            }
          },
          answerStarter: {
            type: "object",
            additionalProperties: false,
            required: ["paragraph", "sentenceStarters"],
            properties: {
              paragraph: { type: "string" },
              sentenceStarters: stringArraySchema()
            }
          },
          feynmanPractice: {
            type: "object",
            additionalProperties: false,
            required: ["simpleExplainPrompt", "ownExamplePrompt", "confusionPrompt", "retryPrompt"],
            properties: {
              simpleExplainPrompt: { type: "string" },
              ownExamplePrompt: { type: "string" },
              confusionPrompt: { type: "string" },
              retryPrompt: { type: "string" }
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

async function applyStudyPilotD1Updates(env, result, uploadedFiles) {
  if (!env.studypilot) {
    return [];
  }

  const updates = [];
  const subject = normalizeSubject(result.subject);

  if (uploadedFiles.length) {
    await upsertUploadRecords(env, uploadedFiles);
  }

  if (result.subjectUpdate && subject !== "General") {
    const detail = await insertSubjectUpdate(env, subject, result.subjectUpdate, uploadedFiles);
    updates.push({
      type: "subject-page",
      target: `${subject} page`,
      detail
    });
  }

  if (result.mistakeUpdate && subject !== "General") {
    const detail = await insertMistakeUpdate(env, subject, result.mistakeUpdate, uploadedFiles);
    updates.push({
      type: "mistake-notebook",
      target: "Mistakes Notebook",
      detail
    });
  }

  for (const task of Array.isArray(result.tasks) ? result.tasks : []) {
    const detail = await insertTaskUpdate(env, task, uploadedFiles);
    if (detail) {
      updates.push({
        type: "task-list",
        target: task.bucket,
        detail
      });
    }
  }

  return updates;
}

async function handleTeenEconomicRequest(env) {
  try {
    return jsonResponse(await fetchTeenEconomicDocument(env));
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not load Teen Economic page."
      },
      500
    );
  }
}

async function applyTeenEconomicD1Update(env, result, uploadedFiles, requestHints) {
  if (!env.studypilot) {
    return [];
  }

  if (uploadedFiles.length) {
    await upsertUploadRecords(env, uploadedFiles);
  }

  const payload = await fetchTeenEconomicDocument(env);
  const articles = Array.isArray(payload.currentPack?.articles) ? payload.currentPack.articles : [];
  const targetId = requestHints.teenEconomicSlot || articles[0]?.id || "";
  const targetIndex = Math.max(0, articles.findIndex((article) => article.id === targetId));
  const existingArticle = articles[targetIndex] || {};
  const nextArticle = mapTeenEconomicArticle(existingArticle, result.articleUpdate, uploadedFiles);
  const nextArticles = [...articles];
  nextArticles[targetIndex] = nextArticle;

  payload.currentPack = {
    ...(payload.currentPack || {}),
    articles: nextArticles
  };

  await upsertTeenEconomicDocument(env, payload);

  return [
    {
      type: "teen-economic",
      target: "Teen Economic page",
      detail: `Replaced ${nextArticle.tabLabel || "Teen Economic article"}: ${nextArticle.title}`
    }
  ];
}

async function ensureAppDocumentsTable(env) {
  await env.studypilot.prepare(`
    CREATE TABLE IF NOT EXISTS app_documents (
      doc_key TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

async function fetchTeenEconomicDocument(env) {
  if (!env.studypilot) {
    return fetchTeenEconomicStaticAsset(env);
  }

  await ensureAppDocumentsTable(env);
  const row = await env.studypilot.prepare(`
    SELECT payload_json
    FROM app_documents
    WHERE doc_key = 'teen-economic'
    LIMIT 1
  `).first();

  if (row?.payload_json) {
    return JSON.parse(String(row.payload_json));
  }

  return fetchTeenEconomicStaticAsset(env);
}

async function upsertTeenEconomicDocument(env, payload) {
  await ensureAppDocumentsTable(env);
  const now = new Date().toISOString();
  await env.studypilot.prepare(`
    INSERT INTO app_documents (doc_key, payload_json, updated_at)
    VALUES ('teen-economic', ?, ?)
    ON CONFLICT(doc_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).bind(JSON.stringify(payload), now).run();
}

async function fetchTeenEconomicStaticAsset(env) {
  const request = new Request("https://studypilot.local/data/teen-economic.json");
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) {
    throw new Error("Could not load Teen Economic fallback data.");
  }
  return response.json();
}

function mapTeenEconomicArticle(existingArticle, articleUpdate, uploadedFiles) {
  const firstFile = uploadedFiles[0] || null;
  return {
    ...existingArticle,
    title: articleUpdate.title || existingArticle.title || "Teen Economic article",
    summary: articleUpdate.summary || existingArticle.summary || "",
    sourceFile: {
      ...(existingArticle.sourceFile || {}),
      label: firstFile?.name || existingArticle.sourceFile?.label || "Teen Economic PDF",
      englishTitle: articleUpdate.sourceFileEnglishTitle || existingArticle.sourceFile?.englishTitle || articleUpdate.title || "",
      note: articleUpdate.sourceNote || existingArticle.sourceFile?.note || "",
      url: firstFile?.publicUrl || existingArticle.sourceFile?.url || ""
    },
    keyEnglish: Array.isArray(articleUpdate.keyEnglish) ? articleUpdate.keyEnglish : [],
    questionBrief: articleUpdate.questionBrief || existingArticle.questionBrief || {},
    answerStarter: articleUpdate.answerStarter || existingArticle.answerStarter || {},
    feynmanPractice: articleUpdate.feynmanPractice || existingArticle.feynmanPractice || {}
  };
}

async function upsertUploadRecords(env, uploadedFiles) {
  const statements = uploadedFiles.map((file) =>
    env.studypilot.prepare(`
      INSERT INTO uploads (
        id, source_mode, category, original_name, storage_path, mime_type, size_bytes, uploaded_at, notes
      ) VALUES (?, 'cloudflare', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        original_name = excluded.original_name,
        storage_path = excluded.storage_path,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        uploaded_at = excluded.uploaded_at,
        notes = excluded.notes
    `).bind(
      file.id,
      file.category || "other",
      file.name || "upload.bin",
      file.publicUrl || file.objectKey || null,
      file.mimeType || "application/octet-stream",
      file.sizeBytes ?? null,
      file.uploadedAt || new Date().toISOString(),
      `OpenAI file id: ${file.openAiFileId}`
    )
  );

  if (statements.length) {
    await env.studypilot.batch(statements);
  }
}

async function insertSubjectUpdate(env, subject, subjectUpdate, uploadedFiles) {
  const subjectSlug = subject.toLowerCase();
  const now = new Date().toISOString();
  const sourceUploadId = uploadedFiles[0]?.id || null;
  const sourceRef = buildSourceRef(uploadedFiles, subjectUpdate.topic);
  const existingCard = await env.studypilot.prepare(`
    SELECT id
    FROM subject_topic_cards
    WHERE subject_slug = ? AND (source_ref = ? OR lower(title) = lower(?))
    ORDER BY updated_at DESC, rowid DESC
    LIMIT 1
  `).bind(subjectSlug, sourceRef, subjectUpdate.topic || "New topic").first();
  const cardId = existingCard?.id || stableId("subject-card", `${subjectSlug}:${subjectUpdate.topic}:${Date.now()}`);

  if (existingCard?.id) {
    await env.studypilot.prepare(`
      UPDATE subject_topic_cards
      SET title = ?, summary = ?, source_upload_id = ?, source_ref = ?, updated_at = ?
      WHERE id = ?
    `).bind(subjectUpdate.topic || "New topic", subjectUpdate.summary || "", sourceUploadId, sourceRef, now, cardId).run();
    await env.studypilot.prepare(`DELETE FROM subject_topic_sections WHERE card_id = ?`).bind(cardId).run();
  } else {
    await env.studypilot.prepare(`
      INSERT INTO subject_topic_cards (
        id, subject_slug, title, summary, source_kind, source_upload_id, source_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'chat_upload', ?, ?, ?, ?)
    `).bind(cardId, subjectSlug, subjectUpdate.topic || "New topic", subjectUpdate.summary || "", sourceUploadId, sourceRef, now, now).run();
  }

  const mappedTopic = mapSubjectTopicForD1(subject, subjectUpdate, uploadedFiles);
  await insertSectionItems(env, "subject_topic_sections", "card_id", cardId, getSubjectSectionKeys(subject), mappedTopic);
  return `${existingCard?.id ? "Updated" : "Added"} a ${subject} support card: ${subjectUpdate.topic}`;
}

async function insertMistakeUpdate(env, subject, mistakeUpdate, uploadedFiles) {
  const now = new Date().toISOString();
  const subjectSlug = subject.toLowerCase();
  const mistakeId = stableId("mistake", `${subjectSlug}:${mistakeUpdate.topic}:${Date.now()}`);

  await env.studypilot.prepare(`
    INSERT INTO mistakes (
      id, subject_slug, topic, subtopic, mistake_date, error_type, question, student_answer, correct_answer,
      explanation, correction, retry_status, mastery_level, source_kind, source_upload_id, image_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'chat_upload', ?, ?, ?, ?)
  `).bind(
    mistakeId,
    subjectSlug,
    mistakeUpdate.topic || "",
    mistakeUpdate.subtopic || null,
    now.slice(0, 10),
    mistakeUpdate.errorType || "",
    mistakeUpdate.question || "",
    mistakeUpdate.studentAnswer || "",
    mistakeUpdate.correctAnswer || "",
    mistakeUpdate.explanation || "",
    mistakeUpdate.correction || "",
    mistakeUpdate.retryStatus || "",
    Number(mistakeUpdate.masteryLevel || 1),
    uploadedFiles[0]?.id || null,
    uploadedFiles[0]?.name || null,
    now,
    now
  ).run();

  return `Added a new ${subject} mistake entry: ${mistakeUpdate.topic}`;
}

async function insertTaskUpdate(env, task, uploadedFiles) {
  const subject = normalizeSubject(task.subject);
  const now = new Date().toISOString();
  await ensureSubjectExistsInD1(env, subject);
  await env.studypilot.prepare(`
    INSERT INTO study_tasks (
      id, bucket, subject_slug, topic, task_type, note, due_date, priority,
      resource_label, resource_url, classroom_topic, classroom_type, source_kind, source_key, source_upload_id,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'chat_upload', NULL, ?, 1, ?, ?)
  `).bind(
    stableId("task", `${task.bucket}:${subject}:${task.topic}:${Date.now()}`),
    task.bucket,
    subject.toLowerCase(),
    task.topic || "",
    task.type || "task",
    task.note || "",
    task.dueDate || null,
    task.priority || "Medium",
    uploadedFiles[0] ? `Open ${uploadedFiles[0].name}` : null,
    uploadedFiles[0]?.publicUrl || null,
    uploadedFiles[0]?.id || null,
    now,
    now
  ).run();

  return `Added a new ${task.bucket} task: ${task.topic}`;
}

async function ensureSubjectExistsInD1(env, subject) {
  const normalized = normalizeSubject(subject);
  await env.studypilot.prepare(`
    INSERT INTO subjects (slug, name)
    VALUES (?, ?)
    ON CONFLICT(slug) DO NOTHING
  `).bind(normalized.toLowerCase(), normalized).run();
}

function mapSubjectTopicForD1(subject, subjectUpdate, uploadedFiles) {
  const resourceItems = [
    ...uploadedFiles.map((file) => ({ label: file.name, url: file.publicUrl || undefined })),
    ...(Array.isArray(subjectUpdate.resourceNotes) ? subjectUpdate.resourceNotes.map((note) => ({ label: note })) : [])
  ];

  if (subject === "Science") {
    return {
      directAnswer: subjectUpdate.directAnswer ? [subjectUpdate.directAnswer] : [],
      keyConcepts: subjectUpdate.coreItems || [],
      teacherNotes: subjectUpdate.supportItems || [],
      resources: resourceItems.length ? resourceItems : subjectUpdate.exampleItems || [],
      quizEasy: subjectUpdate.practiceEasy || [],
      quizMedium: subjectUpdate.practiceMedium || [],
      quizHard: subjectUpdate.practiceHard || [],
      feynmanChecklist: subjectUpdate.feynmanChecklist || [],
      applications: subjectUpdate.applications || []
    };
  }

  if (subject === "Math") {
    return {
      directAnswer: subjectUpdate.directAnswer ? [subjectUpdate.directAnswer] : [],
      formulas: subjectUpdate.coreItems || [],
      solvingSteps: subjectUpdate.supportItems || [],
      examples: subjectUpdate.exampleItems || [],
      commonMistakes: subjectUpdate.mistakePatterns || [],
      practiceEasy: subjectUpdate.practiceEasy || [],
      practiceMedium: subjectUpdate.practiceMedium || [],
      practiceHard: subjectUpdate.practiceHard || []
    };
  }

  return {
    directAnswer: subjectUpdate.directAnswer ? [subjectUpdate.directAnswer] : [],
    readingFocus: subjectUpdate.coreItems || [],
    writingTips: subjectUpdate.supportItems || [],
    structureTemplates: subjectUpdate.exampleItems || [],
    vocabulary: subjectUpdate.vocabulary || [],
    resources: resourceItems,
    practicePrompts: [...(subjectUpdate.practiceEasy || []), ...(subjectUpdate.practiceMedium || []), ...(subjectUpdate.practiceHard || [])].slice(0, 8)
  };
}

async function insertSectionItems(env, tableName, parentColumn, parentId, sectionKeys, sourceData) {
  const statements = [];

  for (const sectionKey of sectionKeys) {
    const rows = Array.isArray(sourceData[sectionKey]) ? sourceData[sectionKey] : [];
    rows.forEach((item, index) => {
      const isResource = item && typeof item === "object" && item.label;
      statements.push(
        env.studypilot.prepare(`
          INSERT INTO ${tableName} (
            id, ${parentColumn}, section_key, section_title, item_order, item_type, text_value, label, url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          stableId(`${tableName}-item`, `${parentId}:${sectionKey}:${index}:${JSON.stringify(item)}`),
          parentId,
          sectionKey,
          getSectionTitle(sectionKey),
          index,
          isResource ? "resource" : "text",
          isResource ? null : String(item),
          isResource ? item.label : null,
          isResource ? item.url || null : null
        )
      );
    });
  }

  if (statements.length) {
    await env.studypilot.batch(statements);
  }
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

function inferUploadCategory(fileName) {
  const value = String(fileName || "").toLowerCase();
  if (/(mistake|quiz|test|marked|correction)/.test(value)) {
    return "mistakes";
  }
  if (/(pdf|slide|slides|ppt|doc|docx|worksheet|lesson|handout)/.test(value)) {
    return "docs";
  }
  return "other";
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

function buildSourceRef(uploadedFiles, fallbackTopic) {
  const sourceName = uploadedFiles[0]?.name || fallbackTopic || "topic";
  return String(sourceName).trim().toLowerCase();
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
  const data = new TextEncoder().encode(`${prefix}:${input}`);
  let hash = 2166136261;
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}-${crypto.randomUUID().slice(0, 8)}`;
}

async function handleDashboardRequest(env) {
  if (!env.studypilot) {
    return jsonResponse(
      {
        error: "Missing D1 binding for StudyPilot dashboard."
      },
      500
    );
  }

  try {
    const taskStatement = env.studypilot.prepare(`
      SELECT
        bucket,
        subject_slug,
        topic,
        task_type,
        note,
        due_date,
        priority,
        resource_label,
        resource_url,
        source_kind
      FROM study_tasks
      WHERE is_active = 1
      ORDER BY
        CASE bucket
          WHEN 'today' THEN 0
          WHEN 'week' THEN 1
          ELSE 2
        END,
        CASE subject_slug
          WHEN 'science' THEN 0
          WHEN 'math' THEN 1
          WHEN 'english' THEN 2
          ELSE 3
        END,
        rowid DESC
    `);

    const reviewCountStatement = env.studypilot.prepare(`
      SELECT COUNT(*) AS count
      FROM mistakes
      WHERE
        LOWER(COALESCE(retry_status, '')) LIKE '%review%'
        OR LOWER(COALESCE(retry_status, '')) LIKE '%retry%'
    `);

    const [taskResult, reviewResult] = await env.studypilot.batch([taskStatement, reviewCountStatement]);
    const allTasks = [
      ...(taskResult.results || []).map(mapD1TaskRow),
      ...buildRecurringClubTasks().map(stripTaskBucket),
      ...buildRecurringBohrRutherfordTasks().map(stripTaskBucket),
      ...buildRecurringGrade10MathTasks().map(stripTaskBucket),
      ...buildRecurringSlideQuizTasks().map(stripTaskBucket)
    ];
    const normalizedBuckets = normalizeDashboardBuckets({
      today: allTasks.filter((task) => task.bucket === "today"),
      week: allTasks.filter((task) => task.bucket === "week"),
      nextWeek: allTasks.filter((task) => task.bucket === "nextWeek")
    });
    const todayTasks = dedupeDashboardTasks(normalizedBuckets.today);
    const weekTasks = dedupeDashboardTasks(normalizedBuckets.week);
    const nextWeekTasks = dedupeDashboardTasks(normalizedBuckets.nextWeek);
    const reviewCount = Number(reviewResult.results?.[0]?.count || 0);

    return jsonResponse({
      source: "d1",
      tasks: {
        today: todayTasks,
        week: weekTasks,
        nextWeek: nextWeekTasks
      },
      totals: {
        today: todayTasks.length,
        week: weekTasks.length,
        nextWeek: nextWeekTasks.length,
        mistakesForReview: reviewCount
      }
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot dashboard data."
      },
      500
    );
  }
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

function stripTaskBucket(task) {
  return task;
}

function dedupeDashboardTasks(tasks) {
  const uniqueTasks = [];
  const indexByKey = new Map();

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const key = buildTaskFamilyKey(task);
    if (!key) {
      uniqueTasks.push(task);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, uniqueTasks.length);
      uniqueTasks.push(task);
      continue;
    }

    if (scoreTask(task) > scoreTask(uniqueTasks[existingIndex])) {
      uniqueTasks[existingIndex] = task;
    }
  }

  return uniqueTasks;
}

function buildTaskFamilyKey(task) {
  const subject = String(task?.subject || "").trim().toLowerCase();
  const titleTokens = tokenizeTaskFamily(task?.topic || "");
  const resourceTokens = tokenizeTaskFamily(task?.resourceLabel || "");
  const tokens = mergeTaskFamilyTokens(titleTokens, resourceTokens);
  if (!subject || tokens.length < 2) {
    return "";
  }
  return `${subject}::${tokens.join("|")}`;
}

function tokenizeTaskFamily(text) {
  const stopWords = new Set([
    "a", "an", "and", "class", "classroom", "current", "for", "from", "in", "lesson",
    "open", "overview", "pdf", "prep", "question", "questions", "review", "study",
    "summary", "table", "task", "the", "to", "worksheet"
  ]);

  return Array.from(
    new Set(
      String(text || "")
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.map((token) => token.endsWith("s") ? token.slice(0, -1) : token)
        .filter((token) => token && !stopWords.has(token)) || []
    )
  );
}

function mergeTaskFamilyTokens(titleTokens, resourceTokens) {
  const merged = [...titleTokens];
  const titleSet = new Set(titleTokens);
  for (const token of resourceTokens) {
    if (titleSet.has(token)) {
      continue;
    }
    if (/^\d+$/.test(token)) {
      continue;
    }
    merged.push(token);
  }
  return merged;
}

function scoreTask(task) {
  const priorityScore = {
    high: 3,
    medium: 2,
    low: 1
  }[String(task?.priority || "").toLowerCase()] || 0;

  const dueDateScore = task?.dueDate ? 1 : 0;
  const resourceScore = task?.resourceLink || task?.resourceLabel ? 1 : 0;

  return priorityScore * 10 + dueDateScore * 2 + resourceScore;
}

function normalizeDashboardBuckets(taskBuckets, referenceDate = new Date()) {
  const today = buildStudyDate(referenceDate);
  return {
    today: (Array.isArray(taskBuckets.today) ? taskBuckets.today : []).filter((task) => taskMatchesBucket(task, "today", today)),
    week: (Array.isArray(taskBuckets.week) ? taskBuckets.week : []).filter((task) => taskMatchesBucket(task, "week", today)),
    nextWeek: (Array.isArray(taskBuckets.nextWeek) ? taskBuckets.nextWeek : []).filter((task) => taskMatchesBucket(task, "nextWeek", today))
  };
}

function taskMatchesBucket(task, bucket, today) {
  const parsed = parseDashboardDueDate(task?.dueDate, today);
  if (!parsed) {
    return true;
  }

  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (bucket === "today") {
    return diffDays === 0;
  }
  if (bucket === "week") {
    return diffDays >= 1 && diffDays <= 7;
  }
  if (bucket === "nextWeek") {
    return diffDays >= 8;
  }
  return true;
}

function parseDashboardDueDate(value, today = buildStudyDate()) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  if (/^today$/i.test(text)) {
    return today;
  }

  if (/^tomorrow$/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  const relativeMatch = text.match(/^in\s+(\d+)\s+days?$/i);
  if (relativeMatch) {
    const future = new Date(today);
    future.setUTCDate(future.getUTCDate() + Number(relativeMatch[1] || 0));
    return future;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  return null;
}

async function handleScienceRequest(env) {
  if (!env.studypilot) {
    return jsonResponse(
      {
        error: "Missing D1 binding for StudyPilot science page."
      },
      500
    );
  }

  try {
    const statements = [
      env.studypilot.prepare(`
        SELECT
          id,
          title,
          overview,
          current_exam_subject,
          current_exam_range_start,
          current_exam_note
        FROM science_schedule
        ORDER BY updated_at DESC
        LIMIT 1
      `),
      env.studypilot.prepare(`
        SELECT
          schedule_id,
          unit_order,
          name,
          window_label,
          focus,
          notes
        FROM science_schedule_units
        ORDER BY unit_order ASC
      `),
      env.studypilot.prepare(`
        SELECT
          schedule_id,
          date_order,
          date_label,
          label,
          note
        FROM science_schedule_key_dates
        ORDER BY date_order ASC
      `),
      env.studypilot.prepare(`
        SELECT
          id,
          when_label,
          topic,
          support_type,
          summary
        FROM upcoming_support_items
        WHERE subject_slug = 'science'
        ORDER BY updated_at DESC, rowid DESC
      `),
      env.studypilot.prepare(`
        SELECT
          support_id,
          section_key,
          item_order,
          item_type,
          text_value,
          label,
          url
        FROM upcoming_support_sections
        WHERE support_id IN (
          SELECT id FROM upcoming_support_items WHERE subject_slug = 'science'
        )
        ORDER BY support_id, section_key, item_order
      `),
        env.studypilot.prepare(`
          SELECT
            id,
            title,
            summary
          FROM subject_topic_cards
          WHERE subject_slug = 'science'
          ORDER BY updated_at DESC, rowid ASC
        `),
      env.studypilot.prepare(`
        SELECT
          card_id,
          section_key,
          item_order,
          item_type,
          text_value,
          label,
          url
        FROM subject_topic_sections
        WHERE card_id IN (
          SELECT id FROM subject_topic_cards WHERE subject_slug = 'science'
        )
        ORDER BY card_id, section_key, item_order
      `),
      env.studypilot.prepare(`
        SELECT
          ci.title,
          ci.meta,
          ci.item_order
        FROM classroom_items ci
        JOIN classroom_courses cc ON cc.id = ci.course_id
        JOIN classroom_sync_runs csr ON csr.id = cc.run_id
        WHERE cc.course_key = 'science' AND ci.topic_name = 'Chemistry'
        ORDER BY csr.generated_at DESC, ci.item_order ASC
        LIMIT 8
      `)
    ];

    const [
      scheduleResult,
      scheduleUnitsResult,
      scheduleDatesResult,
      supportItemsResult,
      supportSectionsResult,
      topicCardsResult,
      topicSectionsResult,
      classroomItemsResult
    ] = await env.studypilot.batch(statements);

    const scheduleRow = scheduleResult.results?.[0] || null;
    const schedule = scheduleRow
      ? {
          title: scheduleRow.title || "",
          overview: scheduleRow.overview || "",
          currentExamRange: {
            subject: scheduleRow.current_exam_subject || null,
            rangeStart: scheduleRow.current_exam_range_start || null,
            note: scheduleRow.current_exam_note || null
          },
          units: (scheduleUnitsResult.results || []).map((row) => ({
            name: row.name || "",
            window: row.window_label || "",
            focus: row.focus || "",
            notes: row.notes || ""
          })),
          keyDates: (scheduleDatesResult.results || []).map((row) => ({
            date: row.date_label || "",
            label: row.label || "",
            note: row.note || ""
          }))
        }
      : null;

    return jsonResponse({
      source: "d1",
      schedule,
      upcomingSupport: mapSectionedItems(
        supportItemsResult.results || [],
        supportSectionsResult.results || [],
        {
          titleKey: "topic",
          summaryKey: "summary",
          whenKey: "when_label",
          typeKey: "support_type",
          sectionDefaults: ["beforeClass", "keywords", "quickQuestions", "resources", "labSteps", "propertyUseLinks", "teacherQuestions", "flexibleThinkingExamples"]
        }
      ),
      topics: mapSectionedItems(
        topicCardsResult.results || [],
        topicSectionsResult.results || [],
        {
          titleKey: "title",
          summaryKey: "summary",
          sectionDefaults: ["keyConcepts", "teacherNotes", "resources", "quizEasy", "quizMedium", "quizHard", "feynmanChecklist", "applications"]
        }
      ),
      classroomItems: (classroomItemsResult.results || []).map((row) => ({
        title: row.title || "",
        meta: row.meta || ""
      }))
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot science data."
      },
      500
    );
  }
}

async function handleArchiveTopicCard(request, env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot archive action." }, 500);
  }

  try {
    const payload = await request.json();
    const subject = normalizeSubject(payload?.subject);
    const title = String(payload?.title || "").trim();

    if (!title || subject === "General") {
      return jsonResponse({ error: "Subject and title are required." }, 400);
    }

    const result = await env.studypilot.prepare(`
      DELETE FROM subject_topic_cards
      WHERE subject_slug = ? AND lower(title) = lower(?)
    `).bind(subject.toLowerCase(), title).run();

    return jsonResponse({
      ok: true,
      deleted: Number(result.meta?.changes || 0) > 0
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not archive this topic card."
      },
      500
    );
  }
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

async function handleRestoreTopicCard(request, env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot restore action." }, 500);
  }

  try {
    const payload = await request.json();
    const subject = normalizeSubject(payload?.subject);
    const topic = payload?.topic;

    if (!topic || typeof topic !== "object" || !String(topic.topic || "").trim() || subject === "General") {
      return jsonResponse({ error: "Subject and topic payload are required." }, 400);
    }

    const subjectSlug = subject.toLowerCase();
    const now = new Date().toISOString();
    const sourceRef = String(topic.sourceRef || topic.topic || "").trim().toLowerCase();

    const existingCard = await env.studypilot.prepare(`
      SELECT id
      FROM subject_topic_cards
      WHERE subject_slug = ? AND lower(title) = lower(?)
      LIMIT 1
    `).bind(subjectSlug, topic.topic).first();

    const cardId = existingCard?.id || stableId("subject-card", `${subjectSlug}:${topic.topic}:${Date.now()}`);

    if (existingCard?.id) {
      await env.studypilot.prepare(`
        UPDATE subject_topic_cards
        SET summary = ?, source_ref = ?, updated_at = ?
        WHERE id = ?
      `).bind(topic.summary || "", sourceRef, now, cardId).run();
      await env.studypilot.prepare(`DELETE FROM subject_topic_sections WHERE card_id = ?`).bind(cardId).run();
    } else {
      await env.studypilot.prepare(`
        INSERT INTO subject_topic_cards (
          id, subject_slug, title, summary, source_kind, source_upload_id, source_ref, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'manual', NULL, ?, ?, ?)
      `).bind(cardId, subjectSlug, topic.topic || "Restored topic", topic.summary || "", sourceRef, now, now).run();
    }

    await insertSectionItems(env, "subject_topic_sections", "card_id", cardId, getSubjectSectionKeys(subject), topic);

    return jsonResponse({
      ok: true,
      restored: true
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not restore this topic card."
      },
      500
    );
  }
}

async function handleMathRequest(env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot math page." }, 500);
  }

  try {
    const [topicCardsResult, topicSectionsResult, classroomItemsResult] = await env.studypilot.batch([
      env.studypilot.prepare(`
        SELECT id, title, summary
        FROM subject_topic_cards
        WHERE subject_slug = 'math'
        ORDER BY updated_at DESC, rowid DESC
      `),
      env.studypilot.prepare(`
        SELECT
          card_id,
          section_key,
          item_order,
          item_type,
          text_value,
          label,
          url
        FROM subject_topic_sections
        WHERE card_id IN (
          SELECT id FROM subject_topic_cards WHERE subject_slug = 'math'
        )
        ORDER BY card_id, section_key, item_order
      `),
      env.studypilot.prepare(`
        SELECT
          ci.title,
          ci.meta,
          ci.item_order
        FROM classroom_items ci
        JOIN classroom_courses cc ON cc.id = ci.course_id
        JOIN classroom_sync_runs csr ON csr.id = cc.run_id
        WHERE cc.course_key = 'math' AND ci.topic_name = 'Cycle 3'
        ORDER BY csr.generated_at DESC, ci.item_order ASC
        LIMIT 8
      `)
    ]);

    return jsonResponse({
      source: "d1",
      topics: mapSectionedItems(
        topicCardsResult.results || [],
        topicSectionsResult.results || [],
        {
          titleKey: "title",
          summaryKey: "summary",
          sectionDefaults: ["formulas", "solvingSteps", "examples", "commonMistakes", "practiceEasy", "practiceMedium", "practiceHard"]
        }
      ),
      classroomItems: (classroomItemsResult.results || []).map((row) => ({
        title: row.title || "",
        meta: row.meta || ""
      }))
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot math data."
      },
      500
    );
  }
}

async function handleEnglishRequest(env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot english page." }, 500);
  }

  try {
    const [topicCardsResult, topicSectionsResult] = await env.studypilot.batch([
      env.studypilot.prepare(`
        SELECT id, title, summary
        FROM subject_topic_cards
        WHERE subject_slug = 'english'
        ORDER BY updated_at DESC, rowid DESC
      `),
      env.studypilot.prepare(`
        SELECT
          card_id,
          section_key,
          item_order,
          item_type,
          text_value,
          label,
          url
        FROM subject_topic_sections
        WHERE card_id IN (
          SELECT id FROM subject_topic_cards WHERE subject_slug = 'english'
        )
        ORDER BY card_id, section_key, item_order
      `)
    ]);

    return jsonResponse({
      source: "d1",
      topics: mapSectionedItems(
        topicCardsResult.results || [],
        topicSectionsResult.results || [],
        {
          titleKey: "title",
          summaryKey: "summary",
          sectionDefaults: ["readingFocus", "writingTips", "structureTemplates", "vocabulary", "resources", "practicePrompts"]
        }
      )
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot english data."
      },
      500
    );
  }
}

async function handleMistakesRequest(env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot mistakes page." }, 500);
  }

  try {
    const result = await env.studypilot.prepare(`
      SELECT
        subject_slug,
        topic,
        subtopic,
        mistake_date,
        error_type,
        question,
        student_answer,
        correct_answer,
        explanation,
        correction,
        retry_status,
        mastery_level,
        source_kind,
        image_path
      FROM mistakes
      ORDER BY updated_at DESC, rowid DESC
    `).all();

    return jsonResponse({
      source: "d1",
      mistakes: (result.results || []).map(mapD1MistakeRow),
      drafts: []
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot mistakes data."
      },
      500
    );
  }
}

async function handleReviewRequest(env) {
  if (!env.studypilot) {
    return jsonResponse({ error: "Missing D1 binding for StudyPilot review page." }, 500);
  }

  try {
    const result = await env.studypilot.prepare(`
      SELECT
        subject_slug,
        topic,
        subtopic,
        mistake_date,
        error_type,
        question,
        student_answer,
        correct_answer,
        explanation,
        correction,
        retry_status,
        mastery_level,
        source_kind,
        image_path
      FROM mistakes
      ORDER BY updated_at DESC, rowid DESC
    `).all();

    const mistakes = (result.results || []).map(mapD1MistakeRow);
    const reviewItems = mistakes.filter(shouldReviewToday);

    return jsonResponse({
      source: "d1",
      reviewItems,
      total: reviewItems.length,
      suggestion: getReviewSuggestion(reviewItems.length)
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Could not query StudyPilot review data."
      },
      500
    );
  }
}

function mapD1TaskRow(row) {
  return {
    bucket: normalizeTaskBucket(row.bucket),
    subject: titleCaseSubject(row.subject_slug),
    topic: row.topic || "",
    type: row.task_type || "task",
    note: row.note || "",
    dueDate: row.due_date || "",
    priority: row.priority || "Medium",
    resourceLabel: row.resource_label || null,
    resourceLink: row.resource_url || null,
    source: mapTaskSource(row.source_kind)
  };
}

function normalizeTaskBucket(bucket) {
  if (bucket === "nextWeek") {
    return "nextWeek";
  }
  if (bucket === "week") {
    return "week";
  }
  return "today";
}

function titleCaseSubject(subjectSlug) {
  const normalized = String(subjectSlug || "").toLowerCase();
  if (normalized === "math") {
    return "Math";
  }
  if (normalized === "english") {
    return "English";
  }
  if (normalized === "science") {
    return "Science";
  }
  return "General";
}

function mapTaskSource(sourceKind) {
  if (sourceKind === "classroom_sync") {
    return "classroom-sync";
  }
  if (sourceKind === "chat_upload") {
    return "codex-chat-upload";
  }
  return "manual";
}

function mapD1MistakeRow(row) {
  return {
    subject: titleCaseSubject(row.subject_slug),
    topic: row.topic || "",
    subtopic: row.subtopic || "",
    date: row.mistake_date || "",
    errorType: row.error_type || "",
    question: row.question || "",
    studentAnswer: row.student_answer || "",
    correctAnswer: row.correct_answer || "",
    explanation: row.explanation || "",
    correction: row.correction || "",
    retryStatus: row.retry_status || "",
    masteryLevel: Number(row.mastery_level || 1),
    source: mapMistakeSource(row.source_kind),
    imagePath: row.image_path || ""
  };
}

function mapMistakeSource(sourceKind) {
  if (sourceKind === "chat_upload") {
    return "codex-chat-upload";
  }
  return "manual";
}

function mapSectionedItems(parentRows, sectionRows, config) {
  const byParent = new Map();

  for (const parent of parentRows) {
    const baseItem = {
      topic: parent[config.titleKey] || "",
      summary: parent[config.summaryKey] || ""
    };

    if (config.whenKey) {
      baseItem.when = parent[config.whenKey] || null;
    }
    if (config.typeKey) {
      baseItem.type = parent[config.typeKey] || null;
    }

    for (const sectionKey of config.sectionDefaults || []) {
      baseItem[sectionKey] = [];
    }

    byParent.set(parent.id, baseItem);
  }

  for (const row of sectionRows) {
    const target =
      byParent.get(row.card_id) ||
      byParent.get(row.support_id);

    if (!target) {
      continue;
    }

    const key = row.section_key;
    if (!Array.isArray(target[key])) {
      target[key] = [];
    }

    if (row.item_type === "resource") {
      target[key].push({
        label: row.label || row.url || "",
        url: row.url || null
      });
      continue;
    }

    target[key].push(row.text_value || "");
  }

  return Array.from(byParent.values());
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
