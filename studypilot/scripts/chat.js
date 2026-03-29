(function () {
  const STORAGE_KEY = "studypilot-codex-chat";
  const UI_STATE_KEY = "studypilot-codex-chat-ui";
  const MAX_FILE_SIZE = 30 * 1024 * 1024;
  const DEFAULT_CONFIG = {
    mode: "endpoint",
    endpoint: "/api/studypilot-chat",
    assistantName: "Codex"
  };

  document.addEventListener("DOMContentLoaded", initializeChat);

  function initializeChat() {
    if (!window.StudyUtils) {
      return;
    }

    const config = readConfig();
    const state = {
      pendingFiles: [],
      messages: loadMessages(),
      isOpen: loadUiState()
    };

    ensureSeedMessage(state);
    const ui = mountFloatingChat(config, state);

    renderMessages(ui.thread, state.messages, config);
    renderPendingFiles(ui.attachmentsNode, state.pendingFiles);
    syncOpenState(ui.root, ui.toggleButton, state.isOpen, config);

    ui.toggleButton.addEventListener("click", () => {
      state.isOpen = !state.isOpen;
      saveUiState(state.isOpen);
      syncOpenState(ui.root, ui.toggleButton, state.isOpen, config);
      if (state.isOpen) {
        scrollThreadToLatest(ui.thread);
        ui.input.focus();
      }
    });

    ui.exampleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        ui.input.value = button.dataset.promptTemplate || "";
        ui.input.dataset.chatMode = button.dataset.chatMode || "";
        if (!state.isOpen) {
          state.isOpen = true;
          saveUiState(state.isOpen);
          syncOpenState(ui.root, ui.toggleButton, state.isOpen, config);
        }
        ui.input.focus();
        ui.input.setSelectionRange(ui.input.value.length, ui.input.value.length);
      });
    });

    ui.fileInput.addEventListener("change", () => {
      const selectedFiles = Array.from(ui.fileInput.files || []);
      const validFiles = selectedFiles.filter((file) => file.size <= MAX_FILE_SIZE);
      state.pendingFiles = [...state.pendingFiles, ...validFiles];
      renderPendingFiles(ui.attachmentsNode, state.pendingFiles);

      const rejectedCount = selectedFiles.length - validFiles.length;
      if (rejectedCount > 0) {
        appendMessage(state, ui.thread, config, {
          role: "assistant",
          text: `${rejectedCount} file(s) were skipped because they are larger than 30 MB in this floating chat view.`,
          timestamp: new Date().toISOString(),
          attachments: []
        });
      }

      ui.fileInput.value = "";
    });

    ui.attachmentsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-index]");
      if (!button) {
        return;
      }

      const index = Number(button.dataset.removeIndex);
      state.pendingFiles.splice(index, 1);
      renderPendingFiles(ui.attachmentsNode, state.pendingFiles);
    });

    ui.clearButton.addEventListener("click", () => {
      state.pendingFiles = [];
      state.messages = [
        {
          role: "assistant",
          text: "Chat cleared. Upload a teacher slide, handout, or mistake, then tell me what you want in simple English. On the Mistakes page, you can upload a mistake photo and ask me to explain what went wrong and update the page.",
          timestamp: new Date().toISOString(),
          attachments: []
        }
      ];
      saveMessages(state.messages);
      renderPendingFiles(ui.attachmentsNode, state.pendingFiles);
      renderMessages(ui.thread, state.messages, config);
      scrollThreadToLatest(ui.thread);
    });

    ui.form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const text = ui.input.value.trim();
      if (!text && !state.pendingFiles.length) {
        return;
      }

      const pendingAttachments = state.pendingFiles.map(simplifyFile);
      const userMessage = {
        role: "user",
        text,
        chatMode: ui.input.dataset.chatMode || "",
        timestamp: new Date().toISOString(),
        attachments: pendingAttachments
      };

      appendMessage(state, ui.thread, config, userMessage);
      state.pendingFiles = [];
      renderPendingFiles(ui.attachmentsNode, state.pendingFiles);
      ui.input.value = "";
      ui.input.dataset.chatMode = "";
      setSendingState(ui.sendButton, true, config);
      scrollThreadToLatest(ui.thread);

      try {
        const reply = await getAssistantReply(config, userMessage, state.messages);
        appendMessage(state, ui.thread, config, reply);
        maybeHandleAppliedUpdates(reply);
      } catch (error) {
        console.error(error);
        appendMessage(state, ui.thread, config, {
          role: "assistant",
          text: `The chat request failed: ${error && error.message ? error.message : "Unknown error."}`,
          timestamp: new Date().toISOString(),
          attachments: []
        });
      } finally {
        setSendingState(ui.sendButton, false, config);
        ui.input.focus();
      }
    });
  }

  function mountFloatingChat(config, state) {
    const shell = document.createElement("div");
    const modeLabel = config.mode === "endpoint" && config.endpoint ? "API mode" : "Demo mode";
    shell.className = "floating-chat";
    shell.innerHTML = `
      <button type="button" class="floating-chat-toggle" aria-expanded="false">
        <span class="floating-chat-toggle-title">${escape(config.assistantName)}</span>
        <span class="floating-chat-toggle-mode">${modeLabel}</span>
      </button>
      <section class="floating-chat-panel" aria-label="${escape(config.assistantName)} chat">
        <div class="floating-chat-header">
          <div>
            <p class="section-label">AI help</p>
            <h2>${escape(config.assistantName)} Chat</h2>
          </div>
          <span class="badge">${modeLabel}</span>
        </div>
        <p class="muted floating-chat-note">
          Upload a school file and ask in simple English. I can explain it, organize it, and update the website content.
        </p>
        <div class="chat-example-box">
          <p class="section-label">Example prompts</p>
          <div class="chat-example-actions">
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="support"
              data-prompt-template="This is my teacher's new science slide. Please process it, turn it into simple English, and update the science support on the website."
            >
              Update science support
            </button>
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="support"
              data-prompt-template="This is my teacher's new math lesson PDF. Please update the math support card in simple English."
            >
              Update math support
            </button>
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="chat-only"
              data-prompt-template="This is a question from my science PDF. Please give the direct answer first in one short sentence. Then give a short explanation. Only update the website if I ask you to."
            >
              Answer this question
            </button>
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="task-only"
              data-prompt-template="This is my math practice sheet. Please pull out today's practice tasks, tell me what I should do first, and update the task list only. Do not create a new support card unless I ask."
            >
              Prepare practice tasks
            </button>
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="support"
              data-prompt-template="This is my new mistake. Please explain what I did wrong in simple English, show the correct idea, tell me how to avoid this mistake next time, and update the Mistakes page."
            >
              New mistake
            </button>
            <button
              type="button"
              class="chat-example-button"
              data-chat-mode="support"
              data-prompt-template="This is my teacher's new lesson PDF. Please explain the key ideas in simple English, tell me what I should prepare for class, and update the website."
            >
              Prepare me for class
            </button>
          </div>
          <p class="chat-example-line">Tap a button to fill the message box, then edit it if needed.</p>
        </div>
        <div id="chat-thread" class="chat-thread" aria-live="polite"></div>
        <div class="chat-controls">
          <div class="chat-toolbar">
            <label class="upload-button" for="chat-file-input">Attach files</label>
            <input id="chat-file-input" class="visually-hidden" type="file" multiple>
            <button id="chat-clear-button" class="ghost-button" type="button">Clear chat</button>
          </div>
          <div id="chat-attachments" class="chat-attachments"></div>
          <form id="chat-form" class="chat-form">
            <label class="visually-hidden" for="chat-input">Message for ${escape(config.assistantName)}</label>
            <textarea
              id="chat-input"
              name="message"
              rows="4"
              placeholder="Example: This is a question from my science PDF. Please give the direct answer first in one short sentence."
              required
            ></textarea>
            <button id="chat-send-button" class="send-button" type="submit">Send to ${escape(config.assistantName)}</button>
          </form>
        </div>
      </section>
    `;

    document.body.appendChild(shell);

    return {
      root: shell,
      toggleButton: shell.querySelector(".floating-chat-toggle"),
      thread: shell.querySelector("#chat-thread"),
      form: shell.querySelector("#chat-form"),
      input: shell.querySelector("#chat-input"),
      fileInput: shell.querySelector("#chat-file-input"),
      attachmentsNode: shell.querySelector("#chat-attachments"),
      clearButton: shell.querySelector("#chat-clear-button"),
      sendButton: shell.querySelector("#chat-send-button"),
      exampleButtons: Array.from(shell.querySelectorAll(".chat-example-button"))
    };
  }

  function syncOpenState(root, toggleButton, isOpen, config) {
    root.classList.toggle("is-open", isOpen);
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.innerHTML = isOpen
      ? `<span class="floating-chat-toggle-title">Hide ${escape(config.assistantName)}</span><span class="floating-chat-toggle-mode">Chat is open</span>`
      : `<span class="floating-chat-toggle-title">${escape(config.assistantName)}</span><span class="floating-chat-toggle-mode">Open chat</span>`;
  }

  function ensureSeedMessage(state) {
    if (state.messages.length) {
      return;
    }

    state.messages = [
      {
        role: "assistant",
        text: "Upload a teacher slide, handout, or mistake, then choose the right prompt. If you want a direct answer, use: This is a question from my science PDF. Please give the direct answer first in one short sentence. On the Mistakes page, a good example is: This is my new mistake. Please explain what I did wrong in simple English, show the correct idea, tell me how to avoid this mistake next time, and update the Mistakes page.",
        timestamp: new Date().toISOString(),
        attachments: []
      }
    ];
  }

  function readConfig() {
    const customConfig = window.StudyChatConfig || {};
    return {
      ...DEFAULT_CONFIG,
      ...customConfig
    };
  }

  function loadMessages() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const messages = JSON.parse(raw || "[]");
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function saveMessages(messages) {
    const serializableMessages = messages.map((message) => ({
      ...message,
      attachments: Array.isArray(message.attachments)
        ? message.attachments.map((attachment) => ({
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            sizeLabel: attachment.sizeLabel
          }))
        : []
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableMessages));
  }

  function loadUiState() {
    try {
      return window.localStorage.getItem(UI_STATE_KEY) === "open";
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function saveUiState(isOpen) {
    window.localStorage.setItem(UI_STATE_KEY, isOpen ? "open" : "closed");
  }

  function appendMessage(state, thread, config, message) {
    state.messages = [...state.messages, message];
    saveMessages(state.messages);
    renderMessages(thread, state.messages, config);
  }

  function renderMessages(container, messages, config) {
    const { escapeHtml } = window.StudyUtils;

    container.innerHTML = messages.map((message) => {
      const roleLabel = message.role === "assistant" ? escapeHtml(config.assistantName) : "You";
      const attachments = renderMessageAttachments(message.attachments || [], escapeHtml);
      const messageBody = renderMessageBody(message.text || "(No text message)", escapeHtml);

      return `
        <article class="chat-message chat-message-${escapeHtml(message.role)}">
          <div class="message-meta">
            <span class="message-role">${roleLabel}</span>
            <span>${formatTime(message.timestamp)}</span>
          </div>
          ${messageBody}
          ${attachments}
        </article>
      `;
    }).join("");

    scrollThreadToLatest(container);
  }

  function renderMessageAttachments(files, escapeHtml) {
    if (!Array.isArray(files) || !files.length) {
      return "";
    }

    const chips = files.map((file) => {
      const suffix = file.sizeLabel ? ` - ${escapeHtml(file.sizeLabel)}` : "";
      return `<span class="message-file-chip">${escapeHtml(file.name)}${suffix}</span>`;
    }).join("");

    return `<div class="message-files">${chips}</div>`;
  }

  function renderMessageBody(text, escapeHtml) {
    const rawText = String(text || "");
    const match = rawText.match(/^(Direct answer:|Short answer:)\s*(.+)$/im);
    if (!match) {
      return `<p class="message-text">${escapeHtml(rawText || "(No text message)")}</p>`;
    }

    const answerLabel = match[1];
    const answerText = match[2];
    const remainingText = rawText.replace(match[0], "").trim();

    return `
      <div class="message-answer-box">
        <p class="message-answer-label">${escapeHtml(answerLabel)}</p>
        <p class="message-answer-text">${escapeHtml(answerText)}</p>
      </div>
      ${remainingText ? `<p class="message-text">${escapeHtml(remainingText)}</p>` : ""}
    `;
  }

  function renderPendingFiles(container, files) {
    const { escapeHtml } = window.StudyUtils;

    if (!files.length) {
      container.innerHTML = '<p class="muted pending-note">No files attached yet.</p>';
      return;
    }

    container.innerHTML = files.map((file, index) => {
      const label = `${escapeHtml(file.name)} - ${escapeHtml(formatSize(file.size))}`;
      return `
        <div class="attachment-chip">
          <span>${label}</span>
          <button type="button" class="attachment-remove" data-remove-index="${index}" aria-label="Remove ${escapeHtml(file.name)}">Remove</button>
        </div>
      `;
    }).join("");
  }

  async function getAssistantReply(config, userMessage, history) {
    if (config.mode === "endpoint" && config.endpoint) {
      return sendToEndpoint(config.endpoint, userMessage, history);
    }

    return buildDemoReply(userMessage);
  }

  async function sendToEndpoint(endpoint, userMessage, history) {
    const payload = new FormData();
    payload.append("message", userMessage.text || "");
    payload.append("chatMode", userMessage.chatMode || "");
    payload.append("history", JSON.stringify(history.slice(-10)));
    payload.append("page", window.location.pathname);

    for (const file of userMessage.attachments || []) {
      if (file.rawFile) {
        payload.append("files", file.rawFile, file.name);
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: payload
    });

    if (!response.ok) {
      let errorMessage = `Chat endpoint failed with status ${response.status}`;

      try {
        const errorBody = await response.json();
        if (errorBody.error) {
          errorMessage = String(errorBody.error);
        }
      } catch (error) {
        console.error(error);
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    const appliedUpdates = Array.isArray(result.appliedUpdates) ? result.appliedUpdates : [];
    const d1SyncLine = buildD1SyncLine(result.d1Sync);
    const updateSummary = appliedUpdates.length
      ? `\n\nUpdated website content:\n${appliedUpdates.map((item) => `- ${item.detail}`).join("\n")}`
      : "";

    return {
      role: "assistant",
      text: `${String(result.reply || "No reply returned from the endpoint.")}${updateSummary}${d1SyncLine}`,
      timestamp: new Date().toISOString(),
      attachments: [],
      appliedUpdates,
      reloadRecommended: Boolean(result.reloadRecommended)
    };
  }

  async function buildDemoReply(userMessage) {
    const attachmentSummary = userMessage.attachments.length
      ? `I can see ${userMessage.attachments.length} attached file(s): ${userMessage.attachments.map((file) => file.name).join(", ")}.`
      : "No files were attached this time.";

    const guidance = userMessage.attachments.length
      ? "In a real API mode, the next step would be to upload the files to a backend and pass their IDs or extracted text into a Codex request."
      : "If you want real document analysis, connect this floating panel to a backend endpoint that forwards requests to Codex or the OpenAI API.";

    return {
      role: "assistant",
      text: `${attachmentSummary} You asked: "${userMessage.text || "No text provided."}" ${guidance}`,
      timestamp: new Date().toISOString(),
      attachments: []
    };
  }

  function simplifyFile(file) {
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      sizeLabel: formatSize(file.size),
      rawFile: file
    };
  }

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 1024) {
      return `${bytes || 0} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTime(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function setSendingState(button, isSending, config) {
    button.disabled = isSending;
    button.textContent = isSending ? "Sending..." : `Send to ${config.assistantName}`;
  }

  function escape(value) {
    return window.StudyUtils.escapeHtml(value);
  }

  function maybeHandleAppliedUpdates(reply) {
    if (!reply || !reply.reloadRecommended || !Array.isArray(reply.appliedUpdates) || !reply.appliedUpdates.length) {
      return;
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 1400);
  }

  function buildD1SyncLine(d1Sync) {
    if (!d1Sync || !d1Sync.attempted) {
      return "";
    }

    const status = String(d1Sync.status || "unknown");
    if (status === "direct") {
      return "\n\nLocal D1 sync: direct write succeeded.";
    }
    if (status === "success") {
      return "\n\nLocal D1 sync: fallback full sync completed.";
    }
    if (status === "failed") {
      const detail = d1Sync.error ? ` (${d1Sync.error})` : "";
      return `\n\nLocal D1 sync: failed${detail}.`;
    }
    return `\n\nLocal D1 sync: ${status}.`;
  }

  function scrollThreadToLatest(container) {
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    window.setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 30);
  }
})();
