export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.sessions = new Map(); // sessionId -> { socket, playerId }
    this.playerSessions = new Map(); // playerId -> sessionId

    this.game = null;
    this.meta = null;
    this.initialized = false;

    this.state.blockConcurrencyWhile(async () => {
      const [storedGame, storedMeta] = await Promise.all([
        this.state.storage.get("game"),
        this.state.storage.get("meta"),
      ]);

      if (storedGame) {
        this.game = storedGame;
      }

      if (storedMeta) {
        this.meta = storedMeta;
      }

      this.initialized = !!storedGame || !!storedMeta;
    });
  }

  async fetch(request) {
    const url = new URL(request.url);

    // ---------------------------
    // Registry mode
    // ---------------------------
    if (url.pathname === "/registry/register" && request.method === "POST") {
      return this.handleRegistryRegister(request);
    }

    if (url.pathname === "/registry/list") {
      return this.handleRegistryList();
    }

    if (url.pathname === "/registry/remove" && request.method === "POST") {
      return this.handleRegistryRemove(request);
    }

    if (url.pathname === "/registry/session" && request.method === "POST") {
      return this.handleRegistrySessionWrite(request);
    }

    if (url.pathname === "/registry/classroom") {
      return this.handleRegistryClassroomList(url);
    }

    if (url.pathname === "/registry/analytics-track" && request.method === "POST") {
      return this.handleRegistryAnalyticsTrack(request);
    }

    if (url.pathname === "/registry/analytics-summary") {
      return this.handleRegistryAnalyticsSummary();
    }

    if (url.pathname === "/registry/survey-vote" && request.method === "POST") {
      return this.handleRegistrySurveyVote(request);
    }

    if (url.pathname === "/registry/survey-summary") {
      return this.handleRegistrySurveySummary(url);
    }

    // ---------------------------
    // Room mode
    // ---------------------------
    if (url.pathname === "/init") {
      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      if (!roomCode) {
        return jsonInternal({ type: "error", message: "Missing room code." }, 400);
      }

      const body = request.method === "POST" ? await safeJson(request) : {};
      await this.initializeGameIfNeeded(roomCode, body);
      return jsonInternal({ ok: true, roomCode });
    }

    if (url.pathname === "/exists") {
      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      const storedMeta = this.meta || (await this.state.storage.get("meta"));

      if (storedMeta && (!roomCode || storedMeta.roomCode === roomCode)) {
        return new Response("ok", { status: 200 });
      }

      return new Response("not found", { status: 404 });
    }

    if (url.pathname === "/summary") {
      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      const summary = await this.getRoomSummary(roomCode);

      if (!summary) {
        return jsonInternal({ type: "error", message: "Room not found." }, 404);
      }

      return jsonInternal({ ok: true, room: summary });
    }

    if (url.pathname === "/reserve-player" && request.method === "POST") {
      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      return this.handleReservePlayer(roomCode, request);
    }

    if (url.pathname === "/release-player" && request.method === "POST") {
      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      return this.handleReleasePlayer(roomCode, request);
    }

    if (url.pathname === "/ws") {
      await this.initializeGameIfNeeded(String(url.searchParams.get("room") || "").toUpperCase());

      const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
      const playerId = Number(url.searchParams.get("player"));

      if (!roomCode) {
        return new Response("Missing room code", { status: 400 });
      }

      if (playerId !== 1 && playerId !== 2) {
        return new Response("Invalid player", { status: 400 });
      }

      if (!this.meta || this.meta.roomCode !== roomCode) {
        return new Response("Room not found", { status: 404 });
      }

      if (!Array.isArray(this.meta.reservedPlayers) || !this.meta.reservedPlayers.includes(playerId)) {
        return new Response("Player slot not reserved", { status: 403 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();

      const existingSessionId = this.playerSessions.get(playerId);
      if (existingSessionId) {
        this.closeAndRemoveSession(existingSessionId, "Replaced by reconnect");
      }

      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, { socket: server, playerId });
      this.playerSessions.set(playerId, sessionId);

      if (!Array.isArray(this.meta.connectedPlayers)) {
        this.meta.connectedPlayers = [];
      }
      if (!this.meta.connectedPlayers.includes(playerId)) {
        this.meta.connectedPlayers.push(playerId);
        await this.persistMeta();
      }

      server.addEventListener("message", async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleAction(sessionId, data);
        } catch {
          this.sendToSession(sessionId, {
            type: "error",
            message: "Invalid message.",
          });
        }
      });

      const cleanup = async () => {
        await this.removeSession(sessionId);
      };

      server.addEventListener("close", cleanup);
      server.addEventListener("error", cleanup);

      this.sendToSession(sessionId, {
        type: "info",
        message: `Connected to room ${roomCode} as Player ${playerId}.`,
      });

      if (this.game) {
        this.sendToSession(sessionId, {
          type: "state",
          game: this.game,
        });
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  // ===========================
  // Registry handlers
  // ===========================

  async handleRegistryRegister(request) {
    const body = await safeJson(request);
    const code = String(body?.code || "").toUpperCase();
    if (!code) {
      return jsonInternal({ type: "error", message: "Missing code." }, 400);
    }

    const rooms = (await this.state.storage.get("rooms")) || [];
    if (!rooms.includes(code)) {
      rooms.push(code);
      await this.state.storage.put("rooms", rooms);
    }

    return jsonInternal({ ok: true, rooms });
  }

  async handleRegistryList() {
    const rooms = (await this.state.storage.get("rooms")) || [];
    return jsonInternal({ ok: true, rooms });
  }

  async handleRegistryRemove(request) {
    const body = await safeJson(request);
    const code = String(body?.code || "").toUpperCase();
    const rooms = ((await this.state.storage.get("rooms")) || []).filter((item) => item !== code);
    await this.state.storage.put("rooms", rooms);
    return jsonInternal({ ok: true, rooms });
  }

  async handleRegistrySessionWrite(request) {
    const body = await safeJson(request);
    const classCode = normalizeClassCode(body?.classCode);
    if (!classCode) {
      return jsonInternal({ type: "error", message: "Missing class code." }, 400);
    }

    const summary = {
      id: String(body?.id || crypto.randomUUID()),
      classCode,
      studentName: normalizeDisplayName(body?.studentName, "Anonymous Student"),
      mode: body?.mode === "multiplayer" ? "multiplayer" : "practice",
      roomCode: String(body?.roomCode || ""),
      playerId: Number(body?.playerId) === 2 ? 2 : 1,
      winner: String(body?.winner || ""),
      winnerLabel: normalizeDisplayName(body?.winnerLabel, String(body?.winner || "Unknown")),
      completedGoals: Array.isArray(body?.completedGoals) ? body.completedGoals.slice(0, 8) : [],
      reactionText: String(body?.reactionText || "None this match."),
      statusText: String(body?.statusText || "None this match."),
      takeaway: String(body?.takeaway || ""),
      uploadedAt: Number(body?.uploadedAt) || Date.now(),
    };

    const storageKey = `classroom:${classCode}`;
    const existing = (await this.state.storage.get(storageKey)) || [];
    const filtered = existing.filter((item) => item?.id !== summary.id);
    filtered.unshift(summary);
    await this.state.storage.put(storageKey, filtered.slice(0, 120));

    return jsonInternal({ ok: true, saved: summary.id });
  }

  async handleRegistryClassroomList(url) {
    const classCode = normalizeClassCode(url.searchParams.get("classCode"));
    if (!classCode) {
      return jsonInternal({ type: "error", message: "Missing class code." }, 400);
    }

    const storageKey = `classroom:${classCode}`;
    const sessions = (await this.state.storage.get(storageKey)) || [];
    return jsonInternal({
      ok: true,
      classCode,
      sessions: sessions
        .slice()
        .sort((a, b) => (b?.uploadedAt || 0) - (a?.uploadedAt || 0)),
    });
  }

  async handleRegistryAnalyticsTrack(request) {
    const body = await safeJson(request);
    const eventId = String(body?.eventId || "").trim();
    if (!eventId) {
      return jsonInternal({ type: "error", message: "Missing analytics event id." }, 400);
    }

    const eventKey = `analytics:event:${eventId}`;
    const alreadyTracked = await this.state.storage.get(eventKey);
    if (alreadyTracked) {
      return jsonInternal({ ok: true, duplicate: true, eventId });
    }

    const mode = body?.mode === "multiplayer" ? "multiplayer" : "practice";
    const startedAt = Number(body?.startedAt) || Date.now();
    const visitorId = String(body?.visitorId || "").trim().slice(0, 80);
    const country = normalizeLocationPart(body?.country, "Unknown");
    const region = normalizeLocationPart(body?.region);
    const city = normalizeLocationPart(body?.city);
    const cityLabel = formatCityLabel(city, region, country);

    const overview = (await this.state.storage.get("analytics:overview")) || {
      totalStarts: 0,
      uniqueVisitors: 0,
      modeCounts: { practice: 0, multiplayer: 0 },
      countryCounts: {},
      cityCounts: {},
      updatedAt: 0,
    };

    overview.totalStarts += 1;
    overview.modeCounts[mode] = (overview.modeCounts[mode] || 0) + 1;
    overview.countryCounts[country] = (overview.countryCounts[country] || 0) + 1;
    if (cityLabel) {
      overview.cityCounts[cityLabel] = (overview.cityCounts[cityLabel] || 0) + 1;
    }

    if (visitorId) {
      const visitorKey = `analytics:visitor:${visitorId}`;
      const knownVisitor = await this.state.storage.get(visitorKey);
      if (!knownVisitor) {
        overview.uniqueVisitors += 1;
        await this.state.storage.put(visitorKey, {
          firstSeenAt: startedAt,
          country,
          city: cityLabel,
        });
      }
    }

    overview.updatedAt = startedAt;

    const recent = (await this.state.storage.get("analytics:recent")) || [];
    recent.unshift({
      eventId,
      mode,
      startedAt,
      roomCode: String(body?.roomCode || ""),
      playerId: Number(body?.playerId) === 2 ? 2 : 1,
      classCode: normalizeClassCode(body?.classCode),
      studentName: normalizeDisplayName(body?.studentName, "Anonymous Player"),
      country,
      region,
      city,
      cityLabel,
    });

    await Promise.all([
      this.state.storage.put(eventKey, { trackedAt: startedAt, mode }),
      this.state.storage.put("analytics:overview", overview),
      this.state.storage.put("analytics:recent", recent.slice(0, 120)),
    ]);

    return jsonInternal({ ok: true, eventId });
  }

  async handleRegistryAnalyticsSummary() {
    const overview = (await this.state.storage.get("analytics:overview")) || {
      totalStarts: 0,
      uniqueVisitors: 0,
      modeCounts: { practice: 0, multiplayer: 0 },
      countryCounts: {},
      cityCounts: {},
      updatedAt: 0,
    };
    const recent = (await this.state.storage.get("analytics:recent")) || [];

    return jsonInternal({
      ok: true,
      totals: {
        totalStarts: Number(overview.totalStarts) || 0,
        uniqueVisitors: Number(overview.uniqueVisitors) || 0,
        practiceStarts: Number(overview.modeCounts?.practice) || 0,
        multiplayerStarts: Number(overview.modeCounts?.multiplayer) || 0,
        updatedAt: Number(overview.updatedAt) || 0,
      },
      topCountries: sortCountEntries(overview.countryCounts),
      topCities: sortCountEntries(overview.cityCounts),
      recent: recent
        .slice()
        .sort((a, b) => (b?.startedAt || 0) - (a?.startedAt || 0))
        .slice(0, 30),
    });
  }

  async handleRegistrySurveyVote(request) {
    const body = await safeJson(request);
    const visitorId = normalizeSurveyVisitorId(body?.visitorId);

    if (!visitorId) {
      return jsonInternal({ type: "error", message: "Missing visitor id." }, 400);
    }

    const presetChoice = PRESET_ELEMENT_VOTES[normalizeVoteId(body?.choiceId)];
    const customName = normalizeSurveyLabel(body?.customName, 42);
    const customIdea = normalizeSurveyIdea(body?.idea);

    if (presetChoice && EXISTING_GAME_ELEMENT_VOTE_IDS.has(presetChoice.id)) {
      return jsonInternal({ type: "error", message: `${presetChoice.label} is already in Element Heroes.` }, 400);
    }

    if (!presetChoice && !customName) {
      return jsonInternal({ type: "error", message: "Choose an element or enter a custom idea." }, 400);
    }

    const ballotKey = `survey:ballot:${visitorId}`;
    const previousBallot = await this.state.storage.get(ballotKey);
    const overview = (await this.state.storage.get("survey:overview")) || createEmptySurveyOverview();
    const recentSuggestions = (await this.state.storage.get("survey:recent-suggestions")) || [];

    let nextChoiceId = "";
    let nextLabel = "";
    let nextIdea = "";
    let isCustom = false;

    if (presetChoice) {
      nextChoiceId = presetChoice.id;
      nextLabel = presetChoice.label;
      nextIdea = presetChoice.idea;
    } else {
      const customSlug = normalizeVoteId(customName);
      nextChoiceId = `custom-${customSlug || crypto.randomUUID().slice(0, 8)}`;
      nextLabel = customName;
      nextIdea = customIdea || "Student-created element idea";
      isCustom = true;
    }

    if (previousBallot?.choiceId && overview.voteCounts?.[previousBallot.choiceId]) {
      overview.voteCounts[previousBallot.choiceId] = Math.max(
        0,
        Number(overview.voteCounts[previousBallot.choiceId] || 0) - 1,
      );
    }

    if (!previousBallot) {
      overview.uniqueVoters = Number(overview.uniqueVoters || 0) + 1;
    }

    overview.voteCounts[nextChoiceId] = Number(overview.voteCounts[nextChoiceId] || 0) + 1;
    overview.labels[nextChoiceId] = nextLabel;
    overview.ideas[nextChoiceId] = nextIdea;
    overview.updatedAt = Date.now();
    overview.totalVotes = Object.values(overview.voteCounts).reduce(
      (sum, count) => sum + Math.max(0, Number(count) || 0),
      0,
    );

    if (isCustom) {
      const customSet = new Set(Array.isArray(overview.customChoiceIds) ? overview.customChoiceIds : []);
      customSet.add(nextChoiceId);
      overview.customChoiceIds = [...customSet];

      const filteredSuggestions = recentSuggestions.filter((item) => item?.choiceId !== nextChoiceId);
      filteredSuggestions.unshift({
        choiceId: nextChoiceId,
        label: nextLabel,
        idea: nextIdea,
        submittedAt: Date.now(),
      });
      await this.state.storage.put("survey:recent-suggestions", filteredSuggestions.slice(0, 20));
    }

    const ballot = {
      visitorId,
      choiceId: nextChoiceId,
      label: nextLabel,
      idea: nextIdea,
      isCustom,
      updatedAt: Date.now(),
    };

    await Promise.all([
      this.state.storage.put(ballotKey, ballot),
      this.state.storage.put("survey:overview", overview),
    ]);

    return jsonInternal({
      ok: true,
      ballot,
      totals: buildSurveyTotals(overview),
      leaderboard: buildSurveyLeaderboard(overview).slice(0, 10),
    });
  }

  async handleRegistrySurveySummary(url) {
    const visitorId = normalizeSurveyVisitorId(url.searchParams.get("visitorId"));
    const overview = (await this.state.storage.get("survey:overview")) || createEmptySurveyOverview();
    const recentSuggestions = (await this.state.storage.get("survey:recent-suggestions")) || [];
    const currentVote = visitorId
      ? (await this.state.storage.get(`survey:ballot:${visitorId}`)) || null
      : null;

    return jsonInternal({
      ok: true,
      totals: buildSurveyTotals(overview),
      leaderboard: buildSurveyLeaderboard(overview).slice(0, 10),
      allChoices: buildSurveyLeaderboard(overview).slice(0, 24),
      recentSuggestions: recentSuggestions.slice(0, 8),
      currentVote,
    });
  }

  // ===========================
  // Room handlers
  // ===========================

  async initializeGameIfNeeded(roomCode, options = {}) {
    if (this.initialized && this.game && this.meta) return;

    const [storedGame, storedMeta] = await Promise.all([
      this.state.storage.get("game"),
      this.state.storage.get("meta"),
    ]);

    if (storedGame && storedMeta) {
      this.game = storedGame;
      this.meta = storedMeta;
      this.initialized = true;
      return;
    }

    this.game = createInitialGame();
    const hostName = normalizeDisplayName(options?.studentName, "Host");
    const classCode = normalizeClassCode(options?.classCode);
    this.meta = {
      roomCode,
      createdAt: Date.now(),
      hostName,
      classCode,
      playerNames: {
        1: hostName,
      },
      reservedPlayers: [1],
      connectedPlayers: [],
      closed: false,
    };
    this.initialized = true;

    await this.persistAll();
  }

  async getRoomSummary(roomCode = "") {
    const storedMeta = this.meta || (await this.state.storage.get("meta"));
    if (!storedMeta) return null;
    if (roomCode && storedMeta.roomCode !== roomCode) return null;

    const liveConnectedPlayers = [...new Set(
      [...this.sessions.values()]
        .map((session) => Number(session?.playerId) || 0)
        .filter((playerId) => playerId === 1 || playerId === 2),
    )];
    const connectedPlayers = liveConnectedPlayers.length
      ? liveConnectedPlayers
      : [];
    const reservedPlayers = Array.isArray(storedMeta.reservedPlayers)
      ? storedMeta.reservedPlayers
      : [1];

    if (
      JSON.stringify(connectedPlayers) !== JSON.stringify(Array.isArray(storedMeta.connectedPlayers) ? storedMeta.connectedPlayers : [])
    ) {
      storedMeta.connectedPlayers = connectedPlayers;
      if (!connectedPlayers.length) {
        storedMeta.closed = true;
      }
      this.meta = storedMeta;
      await this.persistMeta();
      if (!connectedPlayers.length) {
        await this.removeRoomFromRegistry();
      }
    }

    const started = connectedPlayers.includes(1) && connectedPlayers.includes(2) && !storedMeta.closed;

    return {
      code: storedMeta.roomCode,
      hostName: storedMeta.hostName || "Host",
      classCode: storedMeta.classCode || "",
      playerCount: reservedPlayers.length,
      connectedCount: connectedPlayers.length,
      started,
      active: !storedMeta.closed,
      createdAt: storedMeta.createdAt || Date.now(),
    };
  }

  async handleReservePlayer(roomCode, request) {
    if (!roomCode) {
      return jsonInternal({ type: "error", message: "Missing room code." }, 400);
    }

    await this.initializeGameIfNeeded(roomCode);

    if (!this.meta || this.meta.roomCode !== roomCode) {
      return jsonInternal({ type: "error", message: "Room not found." }, 404);
    }

    const body = await safeJson(request);
    const playerId = Number(body?.playerId);
    const studentName = normalizeDisplayName(body?.studentName, playerId === 1 ? "Host" : `Player ${playerId}`);
    const classCode = normalizeClassCode(body?.classCode);

    if (playerId !== 1 && playerId !== 2) {
      return jsonInternal({ type: "error", message: "Invalid player." }, 400);
    }

    if (!Array.isArray(this.meta.reservedPlayers)) {
      this.meta.reservedPlayers = [1];
    }

    if (this.meta.reservedPlayers.includes(playerId)) {
      return jsonInternal({ ok: true, roomCode, playerId, alreadyReserved: true });
    }

    if (this.meta.reservedPlayers.length >= 2) {
      return jsonInternal({ type: "error", message: "Room is full." }, 409);
    }

    this.meta.reservedPlayers.push(playerId);
    if (!this.meta.playerNames || typeof this.meta.playerNames !== "object") {
      this.meta.playerNames = {};
    }
    this.meta.playerNames[playerId] = studentName;
    if (!this.meta.classCode && classCode) {
      this.meta.classCode = classCode;
    }
    await this.persistMeta();

    return jsonInternal({ ok: true, roomCode, playerId });
  }

  async handleReleasePlayer(roomCode, request) {
    if (!roomCode) {
      return jsonInternal({ type: "error", message: "Missing room code." }, 400);
    }

    if (!this.meta || this.meta.roomCode !== roomCode) {
      return jsonInternal({ type: "error", message: "Room not found." }, 404);
    }

    const body = await safeJson(request);
    const playerId = Number(body?.playerId);

    if (playerId !== 1 && playerId !== 2) {
      return jsonInternal({ type: "error", message: "Invalid player." }, 400);
    }

    if (playerId === 2) {
      this.meta.reservedPlayers = (this.meta.reservedPlayers || []).filter((id) => id !== 2);
      this.meta.connectedPlayers = (this.meta.connectedPlayers || []).filter((id) => id !== 2);
      await this.persistMeta();
    }

    return jsonInternal({ ok: true });
  }

  async handleAction(sessionId, data) {
    await this.initializeGameIfNeeded(this.meta?.roomCode || "");

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const action = data && data.action;
    const payload = data && data.payload ? data.payload : {};
    const playerId = session.playerId;

    if (!this.game.players[playerId]) {
      this.sendToSession(sessionId, {
        type: "error",
        message: "Unknown player.",
      });
      return;
    }

    if (action === "leave_room") {
      await this.handleLeaveRoom(sessionId);
      return;
    }

    if (action === "play_card") {
      const result = playCard(this.game, playerId, payload.handIndex);
      if (!result.ok) {
        this.sendToSession(sessionId, {
          type: "error",
          message: result.message,
        });
        return;
      }
      await this.afterMutation(result.effect ? [result.effect] : []);
      return;
    }

    if (action === "remove_field_card") {
      const result = removeFieldCard(this.game, playerId, payload.fieldIndex);
      if (!result.ok) {
        this.sendToSession(sessionId, {
          type: "error",
          message: result.message,
        });
        return;
      }
      await this.afterMutation();
      return;
    }

    if (action === "end_turn") {
      const result = endTurn(this.game, playerId);
      if (!result.ok) {
        this.sendToSession(sessionId, {
          type: "error",
          message: result.message,
        });
        return;
      }
      await this.afterMutation();
      return;
    }

    if (action === "restart_match") {
      if (playerId !== 1) {
        this.sendToSession(sessionId, {
          type: "error",
          message: "Only the host can restart the match.",
        });
        return;
      }

      this.game = createInitialGame();
      await this.afterMutation();
      return;
    }

    this.sendToSession(sessionId, {
      type: "error",
      message: "Unknown action.",
    });
  }

  async handleLeaveRoom(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !this.meta) return;

    if (!Array.isArray(this.meta.connectedPlayers)) {
      this.meta.connectedPlayers = [];
    }

    if (!Array.isArray(this.meta.reservedPlayers)) {
      this.meta.reservedPlayers = [1];
    }

    const { playerId } = session;

    this.meta.connectedPlayers = this.meta.connectedPlayers.filter((id) => id !== playerId);

    if (playerId === 2) {
      this.meta.reservedPlayers = this.meta.reservedPlayers.filter((id) => id !== 2);
      await this.persistMeta();
      this.broadcast({
        type: "info",
        message: "Player 2 left the room.",
      });
      this.closeAndRemoveSession(sessionId, "Left room");
      return;
    }

    this.meta.reservedPlayers = [];
    this.meta.connectedPlayers = [];
    this.meta.closed = true;
    await this.persistMeta();

    await this.removeRoomFromRegistry();

    for (const [otherSessionId] of this.sessions.entries()) {
      if (otherSessionId !== sessionId) {
        this.closeAndRemoveSession(otherSessionId, "Host left the room");
      }
    }

    this.closeAndRemoveSession(sessionId, "Left room");
  }

  async afterMutation(effects = []) {
    await this.persistAll();

    for (const effect of effects) {
      this.broadcast({
        type: "play_effect",
        ...effect,
        effect,
      });
    }

    this.broadcast({ type: "state", game: this.game });
  }

  async persistAll() {
    await Promise.all([
      this.state.storage.put("game", this.game),
      this.state.storage.put("meta", this.meta),
    ]);
  }

  async persistMeta() {
    await this.state.storage.put("meta", this.meta);
  }

  async removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const mappedSessionId = this.playerSessions.get(session.playerId);
    if (mappedSessionId === sessionId) {
      this.playerSessions.delete(session.playerId);
    }

    this.sessions.delete(sessionId);

    if (this.meta && Array.isArray(this.meta.connectedPlayers)) {
      this.meta.connectedPlayers = this.meta.connectedPlayers.filter(
        (id) => id !== session.playerId
      );

      await this.persistMeta();

      // If nobody is connected anymore, remove this room from lobby registry
      if (this.meta.connectedPlayers.length === 0) {
        this.meta.closed = true;
        await this.persistMeta();

        await this.removeRoomFromRegistry();
      }
    }
  }

  async removeRoomFromRegistry() {
    if (!this.meta?.roomCode) return;

    try {
      const registryStub = getRegistryStub(this.env);
      await registryStub.fetch("https://room.internal/registry/remove", {
        method: "POST",
        body: JSON.stringify({ code: this.meta.roomCode }),
      });
    } catch (err) {
      console.log("Failed to remove room from registry:", err);
    }
  }

  closeAndRemoveSession(sessionId, reason = "Closed") {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.socket.close(1000, reason);
    } catch {}

    this.removeSession(sessionId);
  }

  sendToSession(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.socket.send(JSON.stringify(message));
    } catch {
      this.removeSession(sessionId);
    }
  }

  broadcast(message) {
    const serialized = JSON.stringify(message);

    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.socket.send(serialized);
      } catch {
        this.removeSession(sessionId);
      }
    }
  }
}

function corsHeaders(origin) {
  const allowedOrigin =
    origin === "https://www.kevin-apps.com"
      ? origin
      : "https://www.kevin-apps.com";

  return {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "https://www.kevin-apps.com";
    const requiresGameRoomBinding = [
      "/create-room",
      "/join-room",
      "/rooms",
      "/ws",
      "/teacher-summaries",
      "/teacher-summary",
      "/analytics-track",
      "/analytics-summary",
      "/survey-vote",
      "/survey-summary",
    ].includes(url.pathname);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (requiresGameRoomBinding && !hasGameRoomBinding(env)) {
      return json(
        {
          type: "error",
          message: "Worker is missing the GAME_ROOM Durable Object binding.",
        },
        500,
        origin,
      );
    }

    try {
      if (request.method === "POST" && url.pathname === "/create-room") {
        const body = await safeJson(request);
        let roomCode = "";
        let created = false;

        for (let i = 0; i < 12; i += 1) {
          const candidate = generateRoomCode();
          const id = env.GAME_ROOM.idFromName(candidate);
          const stub = env.GAME_ROOM.get(id);
          const existsResponse = await stub.fetch(`https://room.internal/exists?room=${candidate}`);

          if (existsResponse.status === 404) {
            roomCode = candidate;
            await stub.fetch(`https://room.internal/init?room=${roomCode}`, {
              method: "POST",
              body: JSON.stringify(body),
            });
            created = true;
            break;
          }
        }

        if (!created || !roomCode) {
          return json(
            { type: "error", message: "Could not create a unique room. Please try again." },
            500,
            origin,
          );
        }

        const registryStub = getRegistryStub(env);
        await registryStub.fetch("https://room.internal/registry/register", {
          method: "POST",
          body: JSON.stringify({ code: roomCode }),
        });

        return json(
          {
            type: "room_created",
            roomCode,
            playerId: 1,
          },
          200,
          origin,
        );
      }

      if (request.method === "POST" && url.pathname === "/join-room") {
        const body = await safeJson(request);
        const roomCode = String(body?.roomCode || "").toUpperCase();

        if (!roomCode) {
          return json(
            { type: "error", message: "Missing room code." },
            400,
            origin,
          );
        }

        const id = env.GAME_ROOM.idFromName(roomCode);
        const stub = env.GAME_ROOM.get(id);
        const existsResponse = await stub.fetch(`https://room.internal/exists?room=${roomCode}`);

        if (existsResponse.status !== 200) {
          return json(
            { type: "error", message: "Room not found." },
            404,
            origin,
          );
        }

        const reserveResponse = await stub.fetch(`https://room.internal/reserve-player?room=${roomCode}`, {
          method: "POST",
          body: JSON.stringify({
            playerId: 2,
            studentName: body?.studentName,
            classCode: body?.classCode,
          }),
        });

        const reserveData = await safeResponseJson(reserveResponse);

        if (!reserveResponse.ok) {
          return json(
            { type: "error", message: reserveData?.message || "Room is full." },
            reserveResponse.status,
            origin,
          );
        }

        return json(
          {
            type: "room_joined",
            roomCode,
            playerId: 2,
          },
          200,
          origin,
        );
      }

      if (request.method === "GET" && url.pathname === "/rooms") {
        const registryStub = getRegistryStub(env);
        const listResponse = await registryStub.fetch("https://room.internal/registry/list");
        const listData = await safeResponseJson(listResponse);
        const roomCodes = Array.isArray(listData?.rooms) ? listData.rooms : [];

        const summaries = await Promise.all(
          roomCodes.map(async (code) => {
            try {
              const id = env.GAME_ROOM.idFromName(code);
              const stub = env.GAME_ROOM.get(id);
              const summaryResponse = await stub.fetch(`https://room.internal/summary?room=${code}`);

              if (!summaryResponse.ok) return null;
              const summaryData = await safeResponseJson(summaryResponse);
              return summaryData?.room || null;
            } catch {
              return null;
            }
          }),
        );

        const validRooms = summaries.filter(
          (room) => room && room.active !== false && room.connectedCount > 0,
        );

        const rooms = validRooms.sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
        );

        return json({ rooms }, 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/teacher-summary") {
        const body = await safeJson(request);
        const registryStub = getRegistryStub(env);
        const saveResponse = await registryStub.fetch("https://room.internal/registry/session", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const saveData = await safeResponseJson(saveResponse);
        return json(
          saveResponse.ok
            ? { ok: true, saved: saveData?.saved || null }
            : { type: "error", message: saveData?.message || "Could not save class summary." },
          saveResponse.status,
          origin,
        );
      }

      if (request.method === "POST" && url.pathname === "/analytics-track") {
        const body = await safeJson(request);
        const registryStub = getRegistryStub(env);
        const trackResponse = await registryStub.fetch("https://room.internal/registry/analytics-track", {
          method: "POST",
          body: JSON.stringify({
            ...body,
            country: normalizeLocationPart(request.cf?.country, "Unknown"),
            region: normalizeLocationPart(request.cf?.region || request.cf?.regionCode),
            city: normalizeLocationPart(request.cf?.city),
          }),
        });
        const trackData = await safeResponseJson(trackResponse);
        return json(
          trackResponse.ok
            ? { ok: true, eventId: trackData?.eventId || null, duplicate: !!trackData?.duplicate }
            : { type: "error", message: trackData?.message || "Could not track analytics event." },
          trackResponse.status,
          origin,
        );
      }

      if (request.method === "GET" && url.pathname === "/analytics-summary") {
        const registryStub = getRegistryStub(env);
        const summaryResponse = await registryStub.fetch("https://room.internal/registry/analytics-summary");
        const summaryData = await safeResponseJson(summaryResponse);
        return json(
          summaryResponse.ok
            ? {
                ok: true,
                totals: summaryData?.totals || {},
                topCountries: Array.isArray(summaryData?.topCountries) ? summaryData.topCountries : [],
                topCities: Array.isArray(summaryData?.topCities) ? summaryData.topCities : [],
                recent: Array.isArray(summaryData?.recent) ? summaryData.recent : [],
              }
            : { type: "error", message: summaryData?.message || "Could not load analytics summary." },
          summaryResponse.status,
          origin,
        );
      }

      if (request.method === "POST" && url.pathname === "/survey-vote") {
        const body = await safeJson(request);
        const registryStub = getRegistryStub(env);
        const voteResponse = await registryStub.fetch("https://room.internal/registry/survey-vote", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const voteData = await safeResponseJson(voteResponse);
        return json(
          voteResponse.ok
            ? voteData || { ok: true }
            : { type: "error", message: voteData?.message || "Could not save vote." },
          voteResponse.status,
          origin,
        );
      }

      if (request.method === "GET" && url.pathname === "/survey-summary") {
        const registryStub = getRegistryStub(env);
        const visitorId = normalizeSurveyVisitorId(url.searchParams.get("visitorId"));
        const query = visitorId ? `?visitorId=${encodeURIComponent(visitorId)}` : "";
        const summaryResponse = await registryStub.fetch(`https://room.internal/registry/survey-summary${query}`);
        const summaryData = await safeResponseJson(summaryResponse);
        return json(
          summaryResponse.ok
            ? summaryData || { ok: true, totals: {}, leaderboard: [] }
            : { type: "error", message: summaryData?.message || "Could not load survey results." },
          summaryResponse.status,
          origin,
        );
      }

      if (request.method === "GET" && url.pathname === "/teacher-summaries") {
        const classCode = normalizeClassCode(url.searchParams.get("classCode"));
        if (!classCode) {
          return json({ type: "error", message: "Missing class code." }, 400, origin);
        }

        const registryStub = getRegistryStub(env);
        const listResponse = await registryStub.fetch(
          `https://room.internal/registry/classroom?classCode=${encodeURIComponent(classCode)}`,
        );
        const listData = await safeResponseJson(listResponse);
        return json(
          listResponse.ok
            ? {
                ok: true,
                classCode,
                sessions: Array.isArray(listData?.sessions) ? listData.sessions : [],
              }
            : { type: "error", message: listData?.message || "Could not load classroom summaries." },
          listResponse.status,
          origin,
        );
      }

      if (url.pathname === "/ws") {
        const roomCode = String(url.searchParams.get("room") || "").toUpperCase();
        const playerId = Number(url.searchParams.get("player"));

        if (!roomCode) {
          return new Response("Missing room", {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "https://www.kevin-apps.com",
            },
          });
        }

        if (playerId !== 1 && playerId !== 2) {
          return new Response("Invalid player", {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "https://www.kevin-apps.com",
            },
          });
        }

        const id = env.GAME_ROOM.idFromName(roomCode);
        const stub = env.GAME_ROOM.get(id);

        return stub.fetch(
          new Request(`https://room.internal/ws?room=${encodeURIComponent(roomCode)}&player=${encodeURIComponent(playerId)}`, {
            method: "GET",
            headers: request.headers,
          }),
        );
      }

      return new Response("OK", {
        headers: {
          "Access-Control-Allow-Origin": "https://www.kevin-apps.com",
        },
      });
    } catch (error) {
      console.error("Top-level worker fetch failed:", error);
      return json(
        {
          type: "error",
          message: "Worker request failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
        origin,
      );
    }
  },
};

function hasGameRoomBinding(env) {
  return !!env?.GAME_ROOM && typeof env.GAME_ROOM.idFromName === "function";
}

function getRegistryStub(env) {
  const id = env.GAME_ROOM.idFromName("__ROOM_REGISTRY__");
  return env.GAME_ROOM.get(id);
}

function json(data, status = 200, origin = "https://www.kevin-apps.com") {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function jsonInternal(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function safeResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeDisplayName(value, fallback = "Host") {
  const clean = String(value || "").trim().slice(0, 24);
  return clean || fallback;
}

function normalizeClassCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 12);
}

function normalizeLocationPart(value, fallback = "") {
  const clean = String(value || "").trim().slice(0, 60);
  return clean || fallback;
}

function formatCityLabel(city, region, country) {
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

const PERIODIC_TABLE_CHOICES = [
  { id: "hydrogen", label: "Hydrogen", symbol: "H", number: 1 },
  { id: "helium", label: "Helium", symbol: "He", number: 2 },
  { id: "lithium", label: "Lithium", symbol: "Li", number: 3 },
  { id: "beryllium", label: "Beryllium", symbol: "Be", number: 4 },
  { id: "boron", label: "Boron", symbol: "B", number: 5 },
  { id: "carbon", label: "Carbon", symbol: "C", number: 6 },
  { id: "nitrogen", label: "Nitrogen", symbol: "N", number: 7 },
  { id: "oxygen", label: "Oxygen", symbol: "O", number: 8 },
  { id: "fluorine", label: "Fluorine", symbol: "F", number: 9 },
  { id: "neon", label: "Neon", symbol: "Ne", number: 10 },
  { id: "sodium", label: "Sodium", symbol: "Na", number: 11 },
  { id: "magnesium", label: "Magnesium", symbol: "Mg", number: 12 },
  { id: "aluminium", label: "Aluminium", symbol: "Al", number: 13 },
  { id: "silicon", label: "Silicon", symbol: "Si", number: 14 },
  { id: "phosphorus", label: "Phosphorus", symbol: "P", number: 15 },
  { id: "sulfur", label: "Sulfur", symbol: "S", number: 16 },
  { id: "chlorine", label: "Chlorine", symbol: "Cl", number: 17 },
  { id: "argon", label: "Argon", symbol: "Ar", number: 18 },
  { id: "potassium", label: "Potassium", symbol: "K", number: 19 },
  { id: "calcium", label: "Calcium", symbol: "Ca", number: 20 },
  { id: "scandium", label: "Scandium", symbol: "Sc", number: 21 },
  { id: "titanium", label: "Titanium", symbol: "Ti", number: 22 },
  { id: "vanadium", label: "Vanadium", symbol: "V", number: 23 },
  { id: "chromium", label: "Chromium", symbol: "Cr", number: 24 },
  { id: "manganese", label: "Manganese", symbol: "Mn", number: 25 },
  { id: "iron", label: "Iron", symbol: "Fe", number: 26 },
  { id: "cobalt", label: "Cobalt", symbol: "Co", number: 27 },
  { id: "nickel", label: "Nickel", symbol: "Ni", number: 28 },
  { id: "copper", label: "Copper", symbol: "Cu", number: 29 },
  { id: "zinc", label: "Zinc", symbol: "Zn", number: 30 },
  { id: "gallium", label: "Gallium", symbol: "Ga", number: 31 },
  { id: "germanium", label: "Germanium", symbol: "Ge", number: 32 },
  { id: "arsenic", label: "Arsenic", symbol: "As", number: 33 },
  { id: "selenium", label: "Selenium", symbol: "Se", number: 34 },
  { id: "bromine", label: "Bromine", symbol: "Br", number: 35 },
  { id: "krypton", label: "Krypton", symbol: "Kr", number: 36 },
  { id: "rubidium", label: "Rubidium", symbol: "Rb", number: 37 },
  { id: "strontium", label: "Strontium", symbol: "Sr", number: 38 },
  { id: "yttrium", label: "Yttrium", symbol: "Y", number: 39 },
  { id: "zirconium", label: "Zirconium", symbol: "Zr", number: 40 },
  { id: "niobium", label: "Niobium", symbol: "Nb", number: 41 },
  { id: "molybdenum", label: "Molybdenum", symbol: "Mo", number: 42 },
  { id: "technetium", label: "Technetium", symbol: "Tc", number: 43 },
  { id: "ruthenium", label: "Ruthenium", symbol: "Ru", number: 44 },
  { id: "rhodium", label: "Rhodium", symbol: "Rh", number: 45 },
  { id: "palladium", label: "Palladium", symbol: "Pd", number: 46 },
  { id: "silver", label: "Silver", symbol: "Ag", number: 47 },
  { id: "cadmium", label: "Cadmium", symbol: "Cd", number: 48 },
  { id: "indium", label: "Indium", symbol: "In", number: 49 },
  { id: "tin", label: "Tin", symbol: "Sn", number: 50 },
  { id: "antimony", label: "Antimony", symbol: "Sb", number: 51 },
  { id: "tellurium", label: "Tellurium", symbol: "Te", number: 52 },
  { id: "iodine", label: "Iodine", symbol: "I", number: 53 },
  { id: "xenon", label: "Xenon", symbol: "Xe", number: 54 },
  { id: "caesium", label: "Caesium", symbol: "Cs", number: 55 },
  { id: "barium", label: "Barium", symbol: "Ba", number: 56 },
  { id: "lanthanum", label: "Lanthanum", symbol: "La", number: 57 },
  { id: "cerium", label: "Cerium", symbol: "Ce", number: 58 },
  { id: "praseodymium", label: "Praseodymium", symbol: "Pr", number: 59 },
  { id: "neodymium", label: "Neodymium", symbol: "Nd", number: 60 },
  { id: "promethium", label: "Promethium", symbol: "Pm", number: 61 },
  { id: "samarium", label: "Samarium", symbol: "Sm", number: 62 },
  { id: "europium", label: "Europium", symbol: "Eu", number: 63 },
  { id: "gadolinium", label: "Gadolinium", symbol: "Gd", number: 64 },
  { id: "terbium", label: "Terbium", symbol: "Tb", number: 65 },
  { id: "dysprosium", label: "Dysprosium", symbol: "Dy", number: 66 },
  { id: "holmium", label: "Holmium", symbol: "Ho", number: 67 },
  { id: "erbium", label: "Erbium", symbol: "Er", number: 68 },
  { id: "thulium", label: "Thulium", symbol: "Tm", number: 69 },
  { id: "ytterbium", label: "Ytterbium", symbol: "Yb", number: 70 },
  { id: "lutetium", label: "Lutetium", symbol: "Lu", number: 71 },
  { id: "hafnium", label: "Hafnium", symbol: "Hf", number: 72 },
  { id: "tantalum", label: "Tantalum", symbol: "Ta", number: 73 },
  { id: "tungsten", label: "Tungsten", symbol: "W", number: 74 },
  { id: "rhenium", label: "Rhenium", symbol: "Re", number: 75 },
  { id: "osmium", label: "Osmium", symbol: "Os", number: 76 },
  { id: "iridium", label: "Iridium", symbol: "Ir", number: 77 },
  { id: "platinum", label: "Platinum", symbol: "Pt", number: 78 },
  { id: "gold", label: "Gold", symbol: "Au", number: 79 },
  { id: "mercury", label: "Mercury", symbol: "Hg", number: 80 },
  { id: "thallium", label: "Thallium", symbol: "Tl", number: 81 },
  { id: "lead", label: "Lead", symbol: "Pb", number: 82 },
  { id: "bismuth", label: "Bismuth", symbol: "Bi", number: 83 },
  { id: "polonium", label: "Polonium", symbol: "Po", number: 84 },
  { id: "astatine", label: "Astatine", symbol: "At", number: 85 },
  { id: "radon", label: "Radon", symbol: "Rn", number: 86 },
  { id: "francium", label: "Francium", symbol: "Fr", number: 87 },
  { id: "radium", label: "Radium", symbol: "Ra", number: 88 },
  { id: "actinium", label: "Actinium", symbol: "Ac", number: 89 },
  { id: "thorium", label: "Thorium", symbol: "Th", number: 90 },
  { id: "protactinium", label: "Protactinium", symbol: "Pa", number: 91 },
  { id: "uranium", label: "Uranium", symbol: "U", number: 92 },
  { id: "neptunium", label: "Neptunium", symbol: "Np", number: 93 },
  { id: "plutonium", label: "Plutonium", symbol: "Pu", number: 94 },
  { id: "americium", label: "Americium", symbol: "Am", number: 95 },
  { id: "curium", label: "Curium", symbol: "Cm", number: 96 },
  { id: "berkelium", label: "Berkelium", symbol: "Bk", number: 97 },
  { id: "californium", label: "Californium", symbol: "Cf", number: 98 },
  { id: "einsteinium", label: "Einsteinium", symbol: "Es", number: 99 },
  { id: "fermium", label: "Fermium", symbol: "Fm", number: 100 },
  { id: "mendelevium", label: "Mendelevium", symbol: "Md", number: 101 },
  { id: "nobelium", label: "Nobelium", symbol: "No", number: 102 },
  { id: "lawrencium", label: "Lawrencium", symbol: "Lr", number: 103 },
  { id: "rutherfordium", label: "Rutherfordium", symbol: "Rf", number: 104 },
  { id: "dubnium", label: "Dubnium", symbol: "Db", number: 105 },
  { id: "seaborgium", label: "Seaborgium", symbol: "Sg", number: 106 },
  { id: "bohrium", label: "Bohrium", symbol: "Bh", number: 107 },
  { id: "hassium", label: "Hassium", symbol: "Hs", number: 108 },
  { id: "meitnerium", label: "Meitnerium", symbol: "Mt", number: 109 },
  { id: "darmstadtium", label: "Darmstadtium", symbol: "Ds", number: 110 },
  { id: "roentgenium", label: "Roentgenium", symbol: "Rg", number: 111 },
  { id: "copernicium", label: "Copernicium", symbol: "Cn", number: 112 },
  { id: "nihonium", label: "Nihonium", symbol: "Nh", number: 113 },
  { id: "flerovium", label: "Flerovium", symbol: "Fl", number: 114 },
  { id: "moscovium", label: "Moscovium", symbol: "Mc", number: 115 },
  { id: "livermorium", label: "Livermorium", symbol: "Lv", number: 116 },
  { id: "tennessine", label: "Tennessine", symbol: "Ts", number: 117 },
  { id: "oganesson", label: "Oganesson", symbol: "Og", number: 118 },
];

const PRESET_ELEMENT_VOTES = Object.fromEntries(
  PERIODIC_TABLE_CHOICES.map((item) => [
    item.id,
    {
      id: item.id,
      label: item.label,
      idea: `Vote to add ${item.label} (${item.symbol}) as a future Element Heroes card or hero concept.`,
    },
  ]),
);

const EXISTING_GAME_ELEMENT_VOTE_IDS = new Set([
  "sulfur",
  "oxygen",
  "water",
  "iron",
  "hydrogen",
  "carbon",
  "chlorine",
  "sodium",
  "potassium",
  "helium",
  "calcium",
]);

function createEmptySurveyOverview() {
  const labels = {};
  const ideas = {};
  Object.values(PRESET_ELEMENT_VOTES).forEach((item) => {
    labels[item.id] = item.label;
    ideas[item.id] = item.idea;
  });

  return {
    totalVotes: 0,
    uniqueVoters: 0,
    updatedAt: 0,
    voteCounts: {},
    labels,
    ideas,
    customChoiceIds: [],
  };
}

function normalizeVoteId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function normalizeSurveyVisitorId(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeSurveyLabel(value, maxLength = 48) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeSurveyIdea(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function buildSurveyTotals(overview) {
  return {
    totalVotes: Number(overview.totalVotes) || 0,
    uniqueVoters: Number(overview.uniqueVoters) || 0,
    customSuggestions: Array.isArray(overview.customChoiceIds) ? overview.customChoiceIds.length : 0,
    updatedAt: Number(overview.updatedAt) || 0,
  };
}

function buildSurveyLeaderboard(overview) {
  const totalVotes = Math.max(1, Number(overview.totalVotes) || 0);
  return Object.entries(overview.voteCounts || {})
    .map(([choiceId, votes]) => ({
      choiceId,
      label: overview.labels?.[choiceId] || choiceId,
      idea: overview.ideas?.[choiceId] || "Element idea",
      votes: Number(votes) || 0,
      percent: Math.round(((Number(votes) || 0) / totalVotes) * 1000) / 10,
      isCustom: Array.isArray(overview.customChoiceIds) && overview.customChoiceIds.includes(choiceId),
    }))
    .filter((item) => item.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label));
}

function sortCountEntries(counts) {
  return Object.entries(counts || {})
    .map(([label, count]) => ({ label, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 12);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const CARD_LIBRARY = {
  sulfur: {
    id: "sulfur",
    name: "Sulfur",
    type: "Element",
    cost: 1,
    symbol: "S",
    text: "Combustible element used in fire reactions.",
    className: "element-sulfur",
    tags: ["element", "fire"],
  },
  oxygen: {
    id: "oxygen",
    name: "Oxygen",
    type: "Element",
    cost: 1,
    symbol: "O",
    text: "Supports combustion and oxidation.",
    className: "element-oxygen",
    tags: ["element", "air"],
  },
  water: {
    id: "water",
    name: "Water",
    type: "Element",
    cost: 1,
    symbol: "H2O",
    text: "Liquid element enabling steam reactions.",
    className: "element-water",
    tags: ["element", "liquid"],
  },
  iron: {
    id: "iron",
    name: "Iron",
    type: "Element",
    cost: 1,
    symbol: "Fe",
    text: "Metal used for rust reactions.",
    className: "element-iron",
    tags: ["element", "metal"],
  },
  hydrogen: {
    id: "hydrogen",
    name: "Hydrogen",
    type: "Element",
    cost: 1,
    symbol: "H",
    text: "Highly flammable gas element.",
    className: "element-hydrogen",
    tags: ["element", "gas"],
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    type: "Element",
    cost: 1,
    symbol: "C",
    text: "Foundation of many reactions.",
    className: "element-carbon",
    tags: ["element", "solid"],
  },
  chlorine: {
    id: "chlorine",
    name: "Chlorine",
    type: "Element",
    cost: 1,
    symbol: "Cl",
    text: "Reactive gas useful for salt and poison combos.",
    className: "element-chlorine",
    tags: ["element", "gas"],
  },
  sodium: {
    id: "sodium",
    name: "Sodium",
    type: "Element",
    cost: 1,
    symbol: "Na",
    text: "Reactive metal that pairs with chlorine.",
    className: "element-sodium",
    tags: ["element", "metal"],
  },
  potassium: {
    id: "potassium",
    name: "Potassium",
    type: "Element",
    cost: 1,
    symbol: "K",
    text: "Highly reactive alkali metal. Violent with water.",
    className: "element-potassium",
    tags: ["element", "metal", "alkali"],
  },
  helium: {
    id: "helium",
    name: "Helium",
    type: "Element",
    cost: 1,
    symbol: "He",
    text: "Stable noble gas. Hard to react with.",
    className: "element-helium",
    tags: ["element", "gas", "noble"],
  },
  calcium: {
    id: "calcium",
    name: "Calcium",
    type: "Element",
    cost: 1,
    symbol: "Ca",
    text: "Reactive metal forming lime and minerals.",
    className: "element-calcium",
    tags: ["element", "metal", "earth"],
  },

  combustion: {
    id: "combustion",
    name: "Combustion",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sulfur + Oxygen = 7 damage.",
    tags: ["reaction", "fire"],
  },
  steamBurst: {
    id: "steamBurst",
    name: "Steam Burst",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Water + Oxygen = 5 damage and Wet.",
    tags: ["reaction", "steam"],
  },
  acidRain: {
    id: "acidRain",
    name: "Acid Rain",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sulfur + Water = 4 damage and Corroded.",
    tags: ["reaction", "acid"],
  },
  rust: {
    id: "rust",
    name: "Rust",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Iron + Oxygen = 4 damage and Corroded.",
    tags: ["reaction", "metal"],
  },
  explosion: {
    id: "explosion",
    name: "Explosion",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Hydrogen + Oxygen = 8 damage.",
    tags: ["reaction", "burst"],
  },
  saltFormation: {
    id: "saltFormation",
    name: "Salt Formation",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sodium + Chlorine = 5 damage and cleanse your Wet.",
    tags: ["reaction", "salt"],
  },
  carbonBurn: {
    id: "carbonBurn",
    name: "Carbon Burn",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Carbon + Oxygen = 5 damage.",
    tags: ["reaction", "fire"],
  },
  potassiumWater: {
    id: "potassiumWater",
    name: "Alkali Reaction",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Potassium + Water = 9 damage and Wet.",
    tags: ["reaction", "alkali"],
  },
  limeFormation: {
    id: "limeFormation",
    name: "Lime Formation",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Calcium + Water = 5 damage and gain 1 energy.",
    tags: ["reaction", "earth"],
  },
  calciumSteam: {
    id: "calciumSteam",
    name: "Calcium Steam",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Calcium + Water = apply Wet and deal 6 damage.",
    tags: ["reaction", "steam"],
  },
  alkaliExplosion: {
    id: "alkaliExplosion",
    name: "Alkali Explosion",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Potassium + Oxygen = 8 damage.",
    tags: ["reaction", "burst"],
  },

  fireball: {
    id: "fireball",
    name: "Fireball",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 3 damage.",
    tags: ["attack", "fire"],
  },
  hammerStrike: {
    id: "hammerStrike",
    name: "Hammer Strike",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 2 damage. +2 if Iron on field.",
    tags: ["attack", "metal"],
  },
  corrode: {
    id: "corrode",
    name: "Corrode",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Destroy enemy field card if enemy Corroded.",
    tags: ["attack", "control"],
  },
  lightning: {
    id: "lightning",
    name: "Lightning",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 4 damage. +2 if enemy Wet.",
    tags: ["attack", "shock"],
  },
  poisonCloud: {
    id: "poisonCloud",
    name: "Poison Cloud",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 2 damage and apply Corroded.",
    tags: ["attack", "poison"],
  },
  plasmaShock: {
    id: "plasmaShock",
    name: "Plasma Shock",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 5 damage. +2 if Oxygen on field.",
    tags: ["attack", "shock"],
  },
  alkaliBlast: {
    id: "alkaliBlast",
    name: "Alkali Blast",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 4 damage. +3 if Potassium on field.",
    tags: ["attack", "alkali"],
  },
  metalCrush: {
    id: "metalCrush",
    name: "Metal Crush",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 3 damage. +2 if Calcium or Iron on field.",
    tags: ["attack", "metal"],
  },
  noblePressure: {
    id: "noblePressure",
    name: "Noble Pressure",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 2 damage. Draw 1 card if Helium on field.",
    tags: ["attack", "gas"],
  },

  catalyst: {
    id: "catalyst",
    name: "Catalyst",
    type: "Utility",
    cost: 1,
    symbol: "UTL",
    text: "Gain 1 energy.",
    tags: ["utility", "lab"],
  },
  shield: {
    id: "shield",
    name: "Lab Shield",
    type: "Utility",
    cost: 1,
    symbol: "UTL",
    text: "Heal 2 HP.",
    tags: ["utility", "defense"],
  },
};

const DECKS = {
  1: [
  "sulfur",
  "oxygen",
  "water",
  "hydrogen",
  "carbon",
  "sodium",
  "potassium",
  "helium",
  "iron",
  "chlorine",
  "calcium",
  "combustion",
  "steamBurst",
  "acidRain",
  "explosion",
  "carbonBurn",
  "potassiumWater",
  "alkaliExplosion",
  "alkaliBlast",
  "fireball",
  "lightning",
  "poisonCloud",
  "plasmaShock",
  "noblePressure",
  "catalyst",
  "shield",
  "corrode",
  "rust",
  "saltFormation",
  "limeFormation",
  "calciumSteam",
  "hammerStrike",
  "metalCrush",
  ],
  2: [
  "sulfur",
  "oxygen",
  "water",
  "hydrogen",
  "carbon",
  "sodium",
  "potassium",
  "helium",
  "iron",
  "chlorine",
  "calcium",
  "combustion",
  "steamBurst",
  "acidRain",
  "explosion",
  "carbonBurn",
  "potassiumWater",
  "alkaliExplosion",
  "alkaliBlast",
  "fireball",
  "lightning",
  "poisonCloud",
  "plasmaShock",
  "noblePressure",
  "catalyst",
  "shield",
  "corrode",
  "rust",
  "saltFormation",
  "limeFormation",
  "calciumSteam",
  "hammerStrike",
  "metalCrush",
  ],
};

function createInitialGame() {
  return {
    turn: 1,
    currentPlayer: 1,
    players: {
      1: createPlayer(1),
      2: createPlayer(2),
    },
    log: ["Match initialized. Player 1 will take the first turn."],
    winner: null,
  };
}

function createPlayer(id) {
  const player = {
    id,
    hp: 30,
    maxHp: 30,
    energy: 3,
    maxEnergy: 3,
    deck: shuffle(DECKS[id].map((cardId) => deepClone(CARD_LIBRARY[cardId]))),
    hand: [],
    field: [],
    discard: [],
    statuses: [],
  };
  drawCard(player, 5);
  return player;
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function isElementCard(card) {
  return !!card && card.type === "Element";
}

function moveCardFromDeckToHand(player, deckIndex) {
  if (deckIndex < 0 || deckIndex >= player.deck.length || player.hand.length >= 6) {
    return false;
  }
  const drawn = player.deck.splice(deckIndex, 1)[0];
  player.hand.push(drawn);
  return true;
}

function drawCard(player, count) {
  const requested = typeof count === "number" ? count : 1;
  const availableSpace = Math.max(0, 6 - player.hand.length);
  const drawCount = Math.min(requested, availableSpace, player.deck.length);
  if (drawCount <= 0) return 0;

  const deckHasElement = player.deck.some(isElementCard);
  const mustGuaranteeElement = drawCount > 0 && deckHasElement;
  let drewElement = false;

  if (mustGuaranteeElement) {
    drewElement = player.deck.slice(0, drawCount).some(isElementCard);
  }

  let cardsDrawn = 0;
  for (let i = 0; i < drawCount; i += 1) {
    const remainingDraws = drawCount - i;
    let deckIndex = 0;
    if (mustGuaranteeElement && !drewElement && remainingDraws === 1) {
      deckIndex = player.deck.findIndex(isElementCard);
    }
    if (!moveCardFromDeckToHand(player, deckIndex)) break;
    cardsDrawn += 1;
    if (isElementCard(player.hand[player.hand.length - 1])) {
      drewElement = true;
    }
  }
  return cardsDrawn;
}

function getOpponentId(playerId) {
  return playerId === 1 ? 2 : 1;
}

function logMessage(game, text) {
  game.log.unshift(text);
  game.log = game.log.slice(0, 16);
}

function hasFieldCard(player, cardId) {
  return player.field.some((card) => card.id === cardId);
}

function addStatus(player, status) {
  if (!player.statuses.includes(status)) {
    player.statuses.push(status);
  }
}

function removeStatus(player, status) {
  player.statuses = player.statuses.filter((item) => item !== status);
}

function checkWinner(game) {
  if (game.players[1].hp <= 0 && game.players[2].hp <= 0) {
    game.winner = "Draw";
  } else if (game.players[1].hp <= 0) {
    game.winner = "Player 2";
  } else if (game.players[2].hp <= 0) {
    game.winner = "Player 1";
  } else {
    game.winner = null;
  }
}

function applyStartTurnEffects(game, player) {
  if (player.statuses.includes("Corroded")) {
    player.hp = Math.max(0, player.hp - 1);
    logMessage(game, "Player " + player.id + " suffers 1 corrosion damage.");
  }
  if (player.statuses.includes("Wet")) {
    removeStatus(player, "Wet");
    logMessage(game, "Player " + player.id + " is no longer Wet.");
  }
}

function createEffectBase(card, player, opponent, overrides = {}) {
  const isSelfTarget = card.type === "Utility" || card.type === "Element";
  const now = Date.now();

  return {
    effectId: `${card.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    effectType: card.id,
    cardId: card.id,
    cardType: card.type,
    actorPid: player.id,
    sourcePid: player.id,
    targetPid: isSelfTarget ? player.id : opponent.id,
    source: player.id,
    target: isSelfTarget ? player.id : opponent.id,
    createdAt: now,
    duration: 900,
    ...overrides,
  };
}

function buildEffectPayload(card, player, opponent) {
  if (!card) return null;

  if (card.type === "Element") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "summon",
      duration: 700,
    });
  }

  if (card.id === "fireball") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: 3,
      duration: 1000,
    });
  }

  if (card.id === "hammerStrike") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: hasFieldCard(player, "iron") ? 4 : 2,
      duration: 850,
    });
  }

  if (card.id === "lightning") {
    const enemyWet = opponent.statuses.includes("Wet");
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: enemyWet ? 6 : 4,
      enemyWet,
      duration: 900,
    });
  }

  if (card.id === "poisonCloud") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: 2,
      applyStatus: "Corroded",
      pulses: 2,
      damagePerPulse: 1,
      duration: 1200,
    });
  }

  if (card.id === "corrode") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      destroysFieldCard: true,
      duration: 950,
    });
  }

  if (card.id === "plasmaShock") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: hasFieldCard(player, "oxygen") ? 7 : 5,
      duration: 900,
    });
  }

  if (card.id === "alkaliBlast") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: hasFieldCard(player, "potassium") ? 7 : 4,
      duration: 950,
    });
  }

  if (card.id === "metalCrush") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage:
        hasFieldCard(player, "calcium") || hasFieldCard(player, "iron")
          ? 5
          : 3,
      duration: 900,
    });
  }

  if (card.id === "noblePressure") {
    const hasHelium = hasFieldCard(player, "helium");
    return createEffectBase(card, player, opponent, {
      effectGroup: "attack",
      damage: 2,
      draw: hasHelium ? 1 : 0,
      hasHelium,
      duration: 850,
    });
  }

  if (card.id === "combustion") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 7,
      duration: 1100,
    });
  }

  if (card.id === "steamBurst") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 5,
      applyStatus: "Wet",
      duration: 1100,
    });
  }

  if (card.id === "acidRain") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 4,
      applyStatus: "Corroded",
      ticks: 2,
      damagePerTick: 2,
      duration: 1300,
    });
  }

  if (card.id === "rust") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 4,
      applyStatus: "Corroded",
      duration: 1000,
    });
  }

  if (card.id === "explosion") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 8,
      duration: 1200,
    });
  }

  if (card.id === "saltFormation") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 5,
      cleanseSelfStatus: "Wet",
      duration: 1000,
    });
  }

  if (card.id === "carbonBurn") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 5,
      duration: 950,
    });
  }

  if (card.id === "potassiumWater") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 9,
      applyStatus: "Wet",
      duration: 1200,
    });
  }

  if (card.id === "limeFormation") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 5,
      energy: 1,
      duration: 1000,
    });
  }

  if (card.id === "calciumSteam") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 6,
      applyStatus: "Wet",
      duration: 1100,
    });
  }

  if (card.id === "alkaliExplosion") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "reaction",
      damage: 8,
      duration: 1200,
    });
  }

  if (card.id === "catalyst") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "utility",
      energy: 1,
      duration: 800,
    });
  }

  if (card.id === "shield") {
    return createEffectBase(card, player, opponent, {
      effectGroup: "utility",
      heal: 2,
      duration: 800,
    });
  }

  return createEffectBase(card, player, opponent, {
    effectGroup: "generic",
  });
}

function resolveAttack(game, card, player, opponent) {
  if (card.id === "fireball") {
    opponent.hp = Math.max(0, opponent.hp - 3);
    logMessage(game, "Player " + player.id + " cast Fireball for 3 damage.");
    return true;
  }

  if (card.id === "hammerStrike") {
    let damage = 2;
    if (hasFieldCard(player, "iron")) damage += 2;
    opponent.hp = Math.max(0, opponent.hp - damage);
    logMessage(game, "Player " + player.id + " used Hammer Strike for " + damage + " damage.");
    return true;
  }

  if (card.id === "lightning") {
    let damage = 4;
    if (opponent.statuses.includes("Wet")) damage += 2;
    opponent.hp = Math.max(0, opponent.hp - damage);
    logMessage(game, "Player " + player.id + " used Lightning for " + damage + " damage.");
    return true;
  }

  if (card.id === "poisonCloud") {
    opponent.hp = Math.max(0, opponent.hp - 2);
    addStatus(opponent, "Corroded");
    logMessage(
      game,
      "Player " + player.id + " used Poison Cloud for 2 damage. Player " + opponent.id + " became Corroded.",
    );
    return true;
  }

  if (card.id === "corrode") {
    if (opponent.statuses.includes("Corroded") && opponent.field.length > 0) {
      const destroyed = opponent.field.pop();
      opponent.discard.push(destroyed);
      logMessage(
        game,
        "Player " + player.id + " used Corrode and destroyed " + destroyed.name + " on Player " + opponent.id + " field.",
      );
      return true;
    }
    return false;
  }

  if (card.id === "plasmaShock") {
    let damage = 5;
    if (hasFieldCard(player, "oxygen")) damage += 2;
    opponent.hp = Math.max(0, opponent.hp - damage);
    logMessage(game, "Player " + player.id + " used Plasma Shock for " + damage + " damage.");
    return true;
  }

  if (card.id === "alkaliBlast") {
    let damage = 4;
    if (hasFieldCard(player, "potassium")) damage += 3;
    opponent.hp = Math.max(0, opponent.hp - damage);
    logMessage(game, "Player " + player.id + " used Alkali Blast for " + damage + " damage.");
    return true;
  }

  if (card.id === "metalCrush") {
    let damage = 3;
    if (hasFieldCard(player, "calcium") || hasFieldCard(player, "iron")) damage += 2;
    opponent.hp = Math.max(0, opponent.hp - damage);
    logMessage(game, "Player " + player.id + " used Metal Crush for " + damage + " damage.");
    return true;
  }

  if (card.id === "noblePressure") {
    opponent.hp = Math.max(0, opponent.hp - 2);
    if (hasFieldCard(player, "helium")) {
      const drawn = drawCard(player, 1);
      logMessage(game, "Player " + player.id + " used Noble Pressure for 2 damage and drew " + drawn + " card.");
    } else {
      logMessage(game, "Player " + player.id + " used Noble Pressure for 2 damage.");
    }
    return true;
  }

  return false;
}

function resolveReaction(game, card, player, opponent) {
  if (card.id === "combustion" && hasFieldCard(player, "sulfur") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 7);
    logMessage(game, "Player " + player.id + " triggered Combustion for 7 damage.");
    return true;
  }

  if (card.id === "steamBurst" && hasFieldCard(player, "water") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 5);
    addStatus(opponent, "Wet");
    logMessage(game, "Player " + player.id + " used Steam Burst for 5 damage. Player " + opponent.id + " became Wet.");
    return true;
  }

  if (card.id === "acidRain" && hasFieldCard(player, "sulfur") && hasFieldCard(player, "water")) {
    opponent.hp = Math.max(0, opponent.hp - 4);
    addStatus(opponent, "Corroded");
    logMessage(game, "Player " + player.id + " cast Acid Rain for 4 damage. Player " + opponent.id + " became Corroded.");
    return true;
  }

  if (card.id === "rust" && hasFieldCard(player, "iron") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 4);
    addStatus(opponent, "Corroded");
    logMessage(game, "Player " + player.id + " triggered Rust for 4 damage. Player " + opponent.id + " became Corroded.");
    return true;
  }

  if (card.id === "explosion" && hasFieldCard(player, "hydrogen") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 8);
    logMessage(game, "Player " + player.id + " triggered Explosion for 8 damage.");
    return true;
  }

  if (card.id === "saltFormation" && hasFieldCard(player, "sodium") && hasFieldCard(player, "chlorine")) {
    opponent.hp = Math.max(0, opponent.hp - 5);
    removeStatus(player, "Wet");
    logMessage(game, "Player " + player.id + " formed Salt for 5 damage and removed Wet from self.");
    return true;
  }

  if (card.id === "carbonBurn" && hasFieldCard(player, "carbon") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 5);
    logMessage(game, "Player " + player.id + " used Carbon Burn for 5 damage.");
    return true;
  }

  if (card.id === "potassiumWater" && hasFieldCard(player, "potassium") && hasFieldCard(player, "water")) {
    opponent.hp = Math.max(0, opponent.hp - 9);
    addStatus(opponent, "Wet");
    logMessage(game, "Player " + player.id + " triggered Alkali Reaction for 9 damage. Player " + opponent.id + " became Wet.");
    return true;
  }

  if (card.id === "limeFormation" && hasFieldCard(player, "calcium") && hasFieldCard(player, "water")) {
    opponent.hp = Math.max(0, opponent.hp - 5);
    player.energy = Math.min(player.maxEnergy, player.energy + 1);
    logMessage(game, "Player " + player.id + " used Lime Formation for 5 damage and gained 1 energy.");
    return true;
  }

  if (card.id === "calciumSteam" && hasFieldCard(player, "calcium") && hasFieldCard(player, "water")) {
    opponent.hp = Math.max(0, opponent.hp - 6);
    addStatus(opponent, "Wet");
    logMessage(game, "Player " + player.id + " used Calcium Steam for 6 damage. Player " + opponent.id + " became Wet.");
    return true;
  }

  if (card.id === "alkaliExplosion" && hasFieldCard(player, "potassium") && hasFieldCard(player, "oxygen")) {
    opponent.hp = Math.max(0, opponent.hp - 8);
    logMessage(game, "Player " + player.id + " triggered Alkali Explosion for 8 damage.");
    return true;
  }

  return false;
}

function playCard(game, playerId, handIndex) {
  if (game.winner) return { ok: false, message: "The match is already over." };
  if (playerId !== game.currentPlayer) return { ok: false, message: "It is not your turn." };

  const player = game.players[playerId];
  const opponent = game.players[getOpponentId(playerId)];
  const card = player.hand[handIndex];

  if (!card) return { ok: false, message: "Invalid hand card." };
  if (player.energy < card.cost) return { ok: false, message: "Not enough energy." };
  if (card.type === "Element" && player.field.length >= 3) {
    return { ok: false, message: "Your field is full." };
  }

  if (card.type === "Attack") {
    const canUse = resolveAttackPreview(game, card, player, opponent);
    if (!canUse.ok) return canUse;
  }

  if (card.type === "Reaction") {
    const canUse = resolveReactionPreview(game, card, player, opponent);
    if (!canUse.ok) return canUse;
  }

  const effect = buildEffectPayload(card, player, opponent);

  player.energy -= card.cost;
  player.hand.splice(handIndex, 1);

  if (card.type === "Element") {
    player.field.push(card);
    logMessage(game, "Player " + player.id + " placed " + card.name + " on the field.");
  } else if (card.id === "catalyst") {
    player.energy = Math.min(player.maxEnergy, player.energy + 1);
    player.discard.push(card);
    logMessage(game, "Player " + player.id + " used Catalyst and gained 1 energy.");
  } else if (card.id === "shield") {
    player.hp = Math.min(player.maxHp, player.hp + 2);
    player.discard.push(card);
    logMessage(game, "Player " + player.id + " used Lab Shield and healed 2 HP.");
  } else if (card.type === "Attack") {
    resolveAttack(game, card, player, opponent);
    player.discard.push(card);
  } else {
    resolveReaction(game, card, player, opponent);
    player.discard.push(card);
  }

  checkWinner(game);
  return { ok: true, effect };
}

function resolveAttackPreview(game, card, player, opponent) {
  void game;
  void player;

  if (card.id === "corrode") {
    if (!(opponent.statuses.includes("Corroded") && opponent.field.length > 0)) {
      return { ok: false, message: "That attack cannot be used right now." };
    }
  }
  return { ok: true };
}

function resolveReactionPreview(game, card, player, opponent) {
  void game;
  void opponent;

  if (card.id === "combustion" && !(hasFieldCard(player, "sulfur") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "steamBurst" && !(hasFieldCard(player, "water") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "acidRain" && !(hasFieldCard(player, "sulfur") && hasFieldCard(player, "water"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "rust" && !(hasFieldCard(player, "iron") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "explosion" && !(hasFieldCard(player, "hydrogen") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "saltFormation" && !(hasFieldCard(player, "sodium") && hasFieldCard(player, "chlorine"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "carbonBurn" && !(hasFieldCard(player, "carbon") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "potassiumWater" && !(hasFieldCard(player, "potassium") && hasFieldCard(player, "water"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "limeFormation" && !(hasFieldCard(player, "calcium") && hasFieldCard(player, "water"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "calciumSteam" && !(hasFieldCard(player, "calcium") && hasFieldCard(player, "water"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  if (card.id === "alkaliExplosion" && !(hasFieldCard(player, "potassium") && hasFieldCard(player, "oxygen"))) {
    return { ok: false, message: "Reaction requirements were not met." };
  }

  return { ok: true };
}

function removeFieldCard(game, playerId, fieldIndex) {
  if (game.winner) return { ok: false, message: "The match is already over." };
  if (playerId !== game.currentPlayer) return { ok: false, message: "It is not your turn." };

  const player = game.players[playerId];
  if (fieldIndex < 0 || fieldIndex >= player.field.length) {
    return { ok: false, message: "Invalid field card." };
  }

  const removed = player.field.splice(fieldIndex, 1)[0];
  player.discard.push(removed);
  logMessage(game, "Player " + player.id + " removed " + removed.name + " from the field.");
  return { ok: true };
}

function endTurn(game, playerId) {
  if (game.winner) return { ok: false, message: "The match is already over." };
  if (playerId !== game.currentPlayer) return { ok: false, message: "It is not your turn." };

  game.currentPlayer = getOpponentId(game.currentPlayer);
  if (game.currentPlayer === 1) {
    game.turn += 1;
  }

  const player = game.players[game.currentPlayer];
  player.energy = player.maxEnergy;
  applyStartTurnEffects(game, player);
  checkWinner(game);

  if (!game.winner && game.turn > 1) {
    drawCard(player, 2);
  }

  checkWinner(game);
  return { ok: true };
}
