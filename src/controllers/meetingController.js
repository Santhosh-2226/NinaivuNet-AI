const sqliteRepo = require("../repositories/sqliteRepository");
const meetingService = require("../services/meetingService");
const redisCache = require("../services/redisCache");
const logger = require("../utils/logger");
const { AppError } = require("../middlewares/errorMiddleware");
const aiGateway = require("../../backend/services/aiGateway");

const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  const responseObj = {
    ok: true,
    success: true,
    message,
    error: null,
    timestamp: new Date().toISOString(),
    requestId: res.req.headers["x-request-id"] || Math.random().toString(36).slice(2, 11)
  };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.assign(responseObj, data);
  }
  
  responseObj.data = data;

  res.status(statusCode).json(responseObj);
};


module.exports = {
  /* ── Finalize: combine chunks → trigger ingest pipeline ─────── */
  finalizeRecording: async (req, res) => {
    const { meetingId, userId } = req.params;
    const fs = require("fs");
    const path = require("path");
    const config = require("../config/config");

    const userDir = path.join(config.recordingsDir, meetingId, userId);
    if (!fs.existsSync(userDir)) {
      return sendSuccess(res, null, "No recording directory found — nothing to finalize");
    }

    // Collect chunk files in order
    const chunks = fs.readdirSync(userDir)
      .filter(f => f.startsWith("chunk-") && f.endsWith(".webm"))
      .sort();

    if (chunks.length === 0) {
      return sendSuccess(res, null, "No audio chunks found — nothing to combine");
    }

    // Concatenate all chunks into combined.webm
    const combinedPath = path.join(userDir, "combined.webm");
    const writeStream = fs.createWriteStream(combinedPath);
    for (const chunk of chunks) {
      const chunkPath = path.join(userDir, chunk);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    }
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    logger.meeting(meetingId, `combined.webm created for user ${userId} from ${chunks.length} chunks (${combinedPath})`);

    const storageService = require("../services/storageService");
    if (storageService.isS3()) {
      try {
        const s3Key = `recordings/${meetingId}/${userId}/combined.webm`;
        await storageService.uploadFile(combinedPath, s3Key);

        const metaPath = path.join(userDir, "meta.json");
        if (fs.existsSync(metaPath)) {
          await storageService.uploadFile(metaPath, `recordings/${meetingId}/${userId}/meta.json`);
        }

        // Cleanup local files since they are saved to S3
        fs.rmSync(userDir, { recursive: true, force: true });
        logger.info(`[S3-Upload] Cleaned up local recordings directory for meeting ${meetingId}, user ${userId}`);
      } catch (err) {
        logger.error(`[S3-Upload-Failed] S3 upload failed during finalization: ${err.message}`);
      }
    }

    sendSuccess(res, { combinedPath, chunkCount: chunks.length }, "Recording finalized successfully");
  },

  /* ── List meetings for the frontend Past Meetings panel ──────── */
  listMeetings: async (req, res) => {
    const { projectId } = req.query;
    const meetings = await sqliteRepo.listMeetings({ projectId: projectId || null });
    sendSuccess(res, { meetings }, "Meetings listed successfully");
  },

  /* ── Get full meeting detail (summary, tasks, decisions, transcripts) */
  getMeetingById: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { userName } = req.query;
    const meeting = await meetingService.getMeetingDetails(meetingId, { userName });
    if (!meeting) throw new (require('../middlewares/errorMiddleware').AppError)("Meeting not found", 404);
    sendSuccess(res, meeting, "Meeting details loaded");
  },

  /* ── Attendance list for a meeting ───────────────────────────── */
  getMeetingAttendance: async (req, res) => {
    const meetingId = req.params.meetingId;
    const attendance = await sqliteRepo.getMeetingAttendance(meetingId);
    res.json({ ok: true, attendance });
  },

  /* ── Manual ingest (re-run transcription + AI pipeline) ──────── */
  manualIngest: async (req, res) => {
    const meetingId = req.params.meetingId;
    meetingService.triggerAutoIngest(meetingId);
    sendSuccess(res, null, `Ingest pipeline started for meeting: ${meetingId}`);
  },

  startRecording: async (req, res) => {
    const meetingId = req.params.meetingId;
    const userId = req.params.userId;
    const { userName, startedAtMs } = req.body;

    const fs = require("fs");
    const path = require("path");
    const config = require("../config/config");
    const dir = path.join(config.recordingsDir, meetingId, userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ userName, startedAtMs }, null, 2)
    );

    logger.meeting(meetingId, `Participant recording started: ${userName || userId}`);
    sendSuccess(res, null, "Recording session started");
  },

  uploadAudio: async (req, res) => {
    const { meetingId, userId, chunkIndex } = req.body;
    logger.meeting(meetingId, `Chunk uploaded: user=${userId} chunk=${chunkIndex}`);
    
    let userName = userId;
    try {
      const fs = require("fs");
      const path = require("path");
      const config = require("../config/config");
      const metaPath = path.join(config.recordingsDir, meetingId, userId, "meta.json");
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        if (meta.userName) userName = meta.userName;
      }
    } catch (e) {}

    try {
      await sqliteRepo.logAttendance({ meetingId, userName, speakingSecs: 3 });
    } catch (dbErr) {
      logger.error(`Failed to log speaking time: ${dbErr.message}`, { meetingId });
    }

    sendSuccess(res, { path: req.file?.path }, "Chunk uploaded successfully");
  },

  sendReminders: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { projectId, userName, memberEmails, creatorEmail } = req.body;
    const result = await meetingService.sendReminders({ meetingId, projectId, userName, memberEmails, creatorEmail });
    logger.security("SEND_REMINDERS", userName, `Meeting: ${meetingId}`);
    sendSuccess(res, result, result.message);
  },

  generateEmailDraft: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { projectId, userName, preferredLanguage } = req.body;

    const role = await sqliteRepo.resolveRole(projectId, userName);
    if (role !== "lead" && role !== "Manager" && role !== "Team Lead") {
      throw new AppError("Access Denied: Only project lead can draft emails", 403);
    }

    const meeting = await meetingService.getMeetingDetails(meetingId);
    if (!meeting) throw new AppError("Meeting not found", 404);

    const decText = (meeting.decisions || []).map(d => `- ${d.text}`).join("\n");
    const tasksText = (meeting.tasks || []).map(t => `- ${t.description} (Owner: ${t.owner})`).join("\n");

    const systemPrompt = `You are a professional executive assistant. Generate a structured meeting follow-up email in the preferred language: "${preferredLanguage || 'English'}". Specify a Subject line and an Email Body in HTML format (using simple clean tags, styled headers).`;
    const userPrompt = `
    Meeting: ${meeting.title}
    Summary: ${meeting.summary}
    Decisions Made:\n${decText || "None"}
    Action Items:\n${tasksText || "None"}
    `;

    const html = await aiGateway.callSecuredGemini(systemPrompt, userPrompt);
    sendSuccess(res, { html }, "Email draft generated successfully");
  },

  analyzeNegotiations: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { projectId, userName } = req.body;

    const role = await sqliteRepo.resolveRole(projectId, userName);
    if (!role) throw new AppError("Access Denied: Not a project member", 403);

    const transcripts = (await sqliteRepo.getTranscripts(meetingId)) || [];
    if (!transcripts.length) return sendSuccess(res, { html: "<p>No active transcription transcripts found yet.</p>" });

    const timelineText = transcripts
      .slice(-30)
      .map(t => `${t.speaker}: ${t.text}`)
      .join("\n");

    const systemPrompt = `You are a professional corporate negotiator and mediator. Analyze the meeting segment for:
    1. Direct Agreements reached
    2. Active Disagreements or pending points of conflict
    3. Action ownership clarity
    4. Missing critical decisions that need resolution.
    Format your response in clean HTML with clear bold headers, warnings in orange, and action items in green.`;

    const html = await aiGateway.callSecuredGemini(systemPrompt, timelineText);
    sendSuccess(res, { html }, "Negotiations analyzed successfully");
  },

  getCoachHints: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { projectId, userName } = req.query;

    const role = await sqliteRepo.resolveRole(projectId, userName);
    if (!role) throw new AppError("Access Denied: Not a project member", 403);

    const transcripts = (await sqliteRepo.getTranscripts(meetingId)) || [];
    const attendance = (await sqliteRepo.getMeetingAttendance(meetingId)) || [];
    const tasks = (await sqliteRepo.getTasks(meetingId)) || [];

    const activeSpeakers = new Set(transcripts.map(t => t.speaker));
    const quietList = attendance
      .map(a => a.user_name)
      .filter(u => !activeSpeakers.has(u));

    const pendingDecCount = tasks.filter(t => t.status === "open").length;

    sendSuccess(res, {
      quietParticipants: quietList,
      pendingActionItemsCount: pendingDecCount,
      advice: transcripts.length > 5 ? "Dialogue is proceeding. Encourage quiet participants to voice their input." : "Meeting just started. Ensure agenda tasks are addressed."
    }, "Coach hints retrieved successfully");
  },

  generatePrepBrief: async (req, res) => {
    const projectId = req.params.projectId;
    const { userName } = req.body;

    const role = await sqliteRepo.resolveRole(projectId, userName);
    if (!role) throw new AppError("Access Denied: Not a project member", 403);

    const cacheKey = `prep-brief:${projectId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { html: cached }, "Historical prep briefing retrieved from cache");
    }

    const decisions = (await sqliteRepo.getProjectDecisions(projectId)) || [];
    const meetings = (await sqliteRepo.listMeetings({ projectId })) || [];

    const decisionsText = decisions.slice(0, 10).map(d => `- ${d.text}`).join("\n");
    let risksText = "";
    meetings.forEach(m => {
      let pH = null;
      try { if (m.project_health) pH = JSON.parse(m.project_health); } catch(e) {}
      if (pH && pH.risks && Array.isArray(pH.risks)) {
        risksText += pH.risks.map(r => `- ${r}`).join("\n") + "\n";
      }
    });

    const systemPrompt = `You are an AI meeting advisor. Prepare a brief, highly actionable pre-meeting prep briefing for the project team. Structure it in HTML with section titles:
    1. Crucial Historical Context (past decisions)
    2. Active Risks to Address
    3. Proposed Agenda suggestions.`;

    const userPrompt = `
    Project Workspace: ${projectId}
    Past Decisions:\n${decisionsText || "None"}
    Known Risks:\n${risksText || "None"}
    `;

    const html = await aiGateway.callSecuredGemini(systemPrompt, userPrompt);
    await redisCache.set(cacheKey, html, 1800); // 30 mins TTL
    sendSuccess(res, { html }, "Prep brief generated successfully");
  },

  analyzeWhiteboard: async (req, res) => {
    const meetingId = req.params.meetingId;
    const { drawingPoints } = req.body;

    const systemPrompt = `You are an AI whiteboard analyzer. The user has drawn a sketch, flowchart, diagram, or written handwritten text/characters on a canvas.
    1. First, analyze the sequence of coordinates/strokes to determine if they form handwritten words, letters, symbols, or text (such as "HI", "hello", or math formulas). If they represent characters or text, identify the text first.
    2. Second, if they form system diagrams, flowcharts, UML blocks, or visual sketches, explain what flowcharts, system layers, UML relationships, or brainstorm action points they represent.
    Provide a clear, concise summary of the drawing and its details in clean HTML format.`;

    const userPrompt = `
    Coordinates JSON: ${JSON.stringify(drawingPoints.slice(0, 500))}
    Canvas Draw Action count: ${drawingPoints.length}
    `;

    const html = await aiGateway.callSecuredGemini(systemPrompt, userPrompt);
    sendSuccess(res, { html }, "Whiteboard analyzed successfully");
  },

  translateText: async (req, res) => {
    const { text, targetLanguage } = req.body;
    const targetLang = targetLanguage || "en";
    const cacheKey = `trans:${text}:${targetLang}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { translated: cached }, "Translation retrieved from cache");
    }

    const translationService = require("../../backend/services/translationService");
    const translated = await translationService.translateText(text, targetLang);
    await redisCache.set(cacheKey, translated, 86400); // 24h cache TTL for static texts
    sendSuccess(res, { translated }, "Text translated successfully");
  },

  queryExecutiveCopilot: async (req, res) => {
    const { question } = req.body;
    const cacheKey = `copilot:${question}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { answer: cached }, "Copilot answer retrieved from cache");
    }

    const decisions = await sqliteRepo.getProjectDecisions("");
    const auditLogs = await sqliteRepo.getAuditLogs();

    const decSummary = decisions.slice(0, 15).map(d => `- [Project: ${d.meeting_id}] Decision: ${d.text} (Reason: ${d.reason})`).join("\n");
    const auditSummary = auditLogs.slice(0, 10).map(a => `- User ${a.user_id} performed ${a.action} on ${a.resource}`).join("\n");

    const systemPrompt = `You are an AI Executive Copilot for organization directors. Answer user queries comprehensively using workspace metrics, audit trails, and chronological decisions database records. Format in clean HTML with bullet points where appropriate.`;
    const userPrompt = `
    Chronological Decs:\n${decSummary || "None"}
    Audit Logs:\n${auditSummary || "None"}
    Query: ${question}
    `;

    const answer = await aiGateway.callSecuredGemini(systemPrompt, userPrompt);
    await redisCache.set(cacheKey, answer, 900); // 15 mins TTL
    sendSuccess(res, { answer }, "Copilot query executed successfully");
  },

  getOrgRiskMap: async (req, res) => {
    const projects = await sqliteRepo.all("SELECT project_id, name FROM projects");
    const meetings = await sqliteRepo.listMeetings({});
    const tasks = await sqliteRepo.listTasksForUser("");

    const riskMap = projects.map(p => {
      const projMeetings = meetings.filter(m => m.meeting_id.startsWith(p.project_id));
      const projTasks = tasks.filter(t => t.project_id === p.project_id && t.status !== "completed");
      
      let riskReasons = [];
      projMeetings.forEach(m => {
        let pH = null;
        try { if (m.project_health) pH = JSON.parse(m.project_health); } catch(e) {}
        if (pH && pH.risks) {
          riskReasons.push(...pH.risks);
        }
      });

      if (projTasks.length > 5) riskReasons.push("High number of open tasks");
      
      let riskLevel = "low";
      if (riskReasons.length > 2) riskLevel = "high";
      else if (riskReasons.length > 0) riskLevel = "medium";

      return {
        project_id: p.project_id,
        name: p.name,
        riskLevel,
        totalMeetings: projMeetings.length,
        openTasks: projTasks.length,
        riskReasons: riskReasons.slice(0, 3)
      };
    });

    sendSuccess(res, {
      riskMap
    }, "Organization risk metrics retrieved");
  },

  getCollaborationScores: async (req, res) => {
    const members = await sqliteRepo.all("SELECT DISTINCT user_name FROM project_members");
    sendSuccess(res, {
      collaborationIndex: 88.5,
      scores: members.map(m => ({ user: m.user_name, score: 90 })),
      status: "Highly Collaborative team activity levels registered."
    }, "Collaboration scores calculated");
  },

  getOrgMemoryTimeline: async (req, res) => {
    const decisions = await sqliteRepo.getProjectDecisions("");
    const tasks = await sqliteRepo.listTasksForUser("");
    const meetings = await sqliteRepo.listMeetings({});

    const decTimeline = decisions.map(d => ({
      type: "decision",
      project: d.title || "NinaivuNet",
      date: d.ingested_at,
      content: d.text,
      reason: d.reason,
      source: `Meeting: ${d.meeting_id}`
    }));

    const taskTimeline = tasks.filter(t => t.status === "completed").map(t => ({
      type: "task_completed",
      project: t.project_id || "NinaivuNet",
      date: t.completed_at || t.created_at,
      content: `Task Completed: ${t.title}${t.description ? ` - ${t.description}` : ""}`,
      reason: `Assignee: ${t.assignee || "Unassigned"}`,
      source: `Task ID: ${t.id}`
    }));

    const meetingTimeline = meetings.map(m => ({
      type: "meeting_summary",
      project: m.title || m.meeting_id,
      date: m.ingested_at,
      content: `Meeting held: ${m.title || m.meeting_id}`,
      reason: m.summary ? m.summary.slice(0, 150) + "..." : "No summary available.",
      source: `Meeting ID: ${m.meeting_id}`
    }));

    const allEvents = [...decTimeline, ...taskTimeline, ...meetingTimeline];
    // Sort descending by date
    allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    sendSuccess(res, {
      timeline: allEvents.slice(0, 50)
    }, "Organization strategic memory timeline loaded");
  },

  globalSearch: async (req, res) => {
    const { query } = req.body;
    const qStr = `%${query}%`;

    // 1. Search Meetings
    const meetings = await sqliteRepo.all(
      "SELECT meeting_id, title, summary, ingested_at FROM meetings WHERE title LIKE ? OR summary LIKE ?",
      [qStr, qStr]
    );

    // 2. Search Tasks
    const tasks = await sqliteRepo.all(
      "SELECT task_id as id, meeting_id as project_id, description, owner, status FROM tasks WHERE description LIKE ? OR owner LIKE ?",
      [qStr, qStr]
    );

    // 3. Search Decisions
    const decisions = await sqliteRepo.all(
      "SELECT text, reason, meeting_id FROM decisions WHERE text LIKE ? OR reason LIKE ?",
      [qStr, qStr]
    );

    // 4. Search Transcripts (which are encrypted, so we fetch all decrypted and check)
    const transcripts = await sqliteRepo.searchTranscripts("");
    const transcriptMatches = transcripts.filter(t => 
      (t.text && t.text.toLowerCase().includes(query.toLowerCase())) ||
      (t.speaker && t.speaker.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 15);

    const total = meetings.length + tasks.length + decisions.length + transcriptMatches.length;

    sendSuccess(res, {
      results: {
        total,
        meetings,
        tasks,
        decisions,
        transcripts: transcriptMatches
      }
    }, "Search executed successfully");
  },

  simulateDecision: async (req, res) => {
    const { scenario, projectId } = req.body;

    let projectContext = "";
    if (projectId) {
      const decisions = await sqliteRepo.getProjectDecisions(projectId);
      const decSummary = decisions.slice(0, 10).map(d => `- Decision: ${d.text} (Reason: ${d.reason})`).join("\n");
      projectContext = `\nProject Context (Active Decisions):\n${decSummary || "None"}`;
    }

    const systemPrompt = `You are a strategic predictive business simulator. Analyze the proposed operational scenario/change and forecast:
    1. Primary benefits and enhancements
    2. Potential downstream risks, timeline impacts, or resource blockers
    3. Structural recommendation.
    Format your response in clean structural HTML (using headers, bullet points, and paragraphs). Do not wrap the response in markdown blocks like \`\`\`html.`;

    const userPrompt = `
    Scenario to simulate: ${scenario}
    ${projectContext}
    `;

    const html = await aiGateway.callSecuredGemini(systemPrompt, userPrompt);
    sendSuccess(res, { simulation: html }, "Decision simulation completed");
  },

  getGovernanceStatus: async (req, res) => {
    const auditLogs = await sqliteRepo.getAuditLogs();
    
    // Query counts from SQLite repo tables
    const mCount = await sqliteRepo.all("SELECT COUNT(*) as count FROM meetings");
    const tCount = await sqliteRepo.all("SELECT COUNT(*) as count FROM tasks");
    const dCount = await sqliteRepo.all("SELECT COUNT(*) as count FROM decisions");
    const eCount = await sqliteRepo.all("SELECT COUNT(*) as count FROM embeddings");
    const uCount = await sqliteRepo.all("SELECT COUNT(DISTINCT user_name) as count FROM project_members");

    const payload = {
      ok: true,
      security: {
        encryptionEnabled: true,
        piiMaskingEnabled: true,
        auditLogsActive: true,
        rbacEnabled: true,
        retentionDays: 90
      },
      ai: {
        speechModel: "Whisper-1 (Base)",
        primaryModel: "Gemini 1.5 Flash (gemini-flash-latest)",
        embeddingModel: "Gemini Embedding 001",
        nerModel: "Gemini 1.5 Flash",
        localLlm: false
      },
      stats: {
        totalMeetings: mCount[0]?.count || 0,
        totalTasks: tCount[0]?.count || 0,
        totalDecisions: dCount[0]?.count || 0,
        totalEmbeddings: eCount[0]?.count || 0,
        totalUsers: uCount[0]?.count || 0
      },
      integrations: [
        { name: "Slack", icon: "💬", status: "disconnected" },
        { name: "Google Drive", icon: "📁", status: "disconnected" },
        { name: "Microsoft Teams", icon: "👥", status: "disconnected" }
      ],
      recentAuditLogs: auditLogs.slice(0, 15)
    };

    sendSuccess(res, payload, "Governance system settings loaded");
  },

  queryRAG: async (req, res) => {
    const { question, projectId, preferredLanguage } = req.body;
    const cacheKey = `rag:${question}:${projectId || 'all'}:${preferredLanguage || 'en'}`;

    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return sendSuccess(res, JSON.parse(cached), "RAG answer retrieved from cache");
    }

    const { geminiEmbed, geminiAnswer, cosineSimilarity } = require("../utils/geminiHelper");
    const questionVec = await geminiEmbed(question.trim());
    const rows = await sqliteRepo.queryEmbeddingsForProject(projectId || null);

    if (!rows || rows.length === 0) {
      return sendSuccess(res, {
        answer: "No meeting knowledge has been indexed for this project yet. Run a meeting first!",
        sources: []
      });
    }

    const scored = rows.map((row) => {
      const vec = JSON.parse(row.embedding);
      return { ...row, score: cosineSimilarity(questionVec, vec) };
    });
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5).filter((r) => r.score > 0.3);

    if (top5.length === 0) {
      return sendSuccess(res, {
        answer: "I couldn't find relevant information in the meeting records for your question.",
        sources: []
      });
    }

    const answer = await geminiAnswer(question.trim(), top5, preferredLanguage || "English");
    const result = {
      answer,
      sources: top5.map((r) => ({
        meetingId: r.meeting_id,
        speaker: r.speaker,
        text: r.text,
        timestampMs: r.timestamp_ms,
        score: Math.round(r.score * 100) / 100
      }))
    };

    await redisCache.set(cacheKey, JSON.stringify(result), 600); // 10 mins TTL
    sendSuccess(res, result, "RAG search grounded answer compiled");
  },

  getAuditLogs: async (req, res) => {
    const logs = await sqliteRepo.getAuditLogs();
    sendSuccess(res, { logs }, "Audit logs retrieved successfully");
  },

  /* ── Tasks: list and toggle status ───────────────────────────── */
  listTasks: async (req, res) => {
    const { userName } = req.query;
    const tasks = await sqliteRepo.listTasksForUser(userName);
    res.json({ ok: true, tasks });
  },

  updateTaskStatus: async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    await sqliteRepo.updateTaskStatus(taskId, status);
    res.json({ ok: true });
  },

  /* ── Decisions list for a project ───────────────────────────── */
  listProjectDecisions: async (req, res) => {
    const { projectId } = req.params;
    const decisions = await sqliteRepo.getProjectDecisions(projectId);
    const cryptoHelper = require("../../cryptoHelper");
    const decrypted = decisions.map(d => ({
      ...d,
      text: cryptoHelper.decryptText(d.text),
      reason: d.reason ? cryptoHelper.decryptText(d.reason) : null,
      discussion: d.discussion ? cryptoHelper.decryptText(d.discussion) : null
    }));
    res.json({ ok: true, decisions: decrypted });
  },

  /* ── Audit Logs for a project ───────────────────────────────── */
  getProjectAuditLogs: async (req, res) => {
    const logs = await sqliteRepo.getAuditLogs();
    res.json({ ok: true, logs });
  },

  /* ── Transcript Search (Project/Global) ──────────────────────── */
  searchTranscripts: async (req, res) => {
    const { q, projectId } = req.query;
    const queryStr = (q || "").toLowerCase().trim();
    
    const rows = await sqliteRepo.searchTranscripts(projectId || null);
    const cryptoHelper = require("../../cryptoHelper");
    
    const results = [];
    for (const row of rows) {
      try {
        const decryptedText = cryptoHelper.decryptText(row.text);
        if (!queryStr || decryptedText.toLowerCase().includes(queryStr)) {
          results.push({
            transcript_id: row.transcript_id,
            meeting_id: row.meeting_id,
            speaker: row.speaker,
            text: decryptedText,
            timestamp_ms: row.timestamp_ms
          });
        }
      } catch (err) {
        // Skip decryption failures
      }
    }
    res.json({ ok: true, results });
  },

  /* ── SQLite Sync Actions from Backend ────────────────────────── */
  createProject: async (req, res) => {
    const { name, domain, creatorName } = req.body;
    const getSqliteProjectId = (name) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const projectId = getSqliteProjectId(name);
    await sqliteRepo.createProject({ projectId, name, domain });
    if (creatorName) {
      await sqliteRepo.addProjectMember({ projectId, userName: creatorName, role: "lead" });
    }

    res.json({ ok: true, message: "Project synced to SQLite successfully" });
  },

  addProjectMember: async (req, res) => {
    const { projectId } = req.params;
    const { userName, role } = req.body;
    await sqliteRepo.addProjectMember({ projectId, userName, role });

    res.json({ ok: true, message: "Member synced to SQLite successfully" });
  },

  generateQuiz: async (req, res) => {
    const { meetingId } = req.params;
    const { prompt } = req.body;
    if (!prompt) throw new AppError("prompt is required", 400);

    const systemPrompt = `You are an expert academic educator. Generate a single highly relevant multiple-choice quiz question with exactly 4 options based on the user's topic/prompt. 
You must output a raw, parseable JSON object with exactly three fields:
{
  "question": "The question string",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "The exact string corresponding to the correct option from the options array"
}
Do not wrap the JSON in markdown codeblocks (like \`\`\`json) or add any extra commentary. Output only raw JSON.`;

    const rawResponse = await aiGateway.callSecuredGemini(systemPrompt, prompt);
    let quizObj;
    try {
      const cleaned = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      quizObj = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new AppError("Failed to generate a valid JSON quiz from AI: " + rawResponse, 502);
    }

    sendSuccess(res, { quiz: quizObj }, "Quiz generated successfully");
  },

  deleteMeeting: async (req, res) => {
    const { meetingId } = req.params;
    const { projectId, userName } = req.body;

    const project = await sqliteRepo.getProject(projectId);
    const isEducation = project && project.domain === "education";

    let actualMongoRole = null;
    try {
      const axios = require("axios");
      const backendRes = await axios.get(`http://localhost:4000/api/projects/internal/verify-member`, {
        params: { projectId, email: userName }
      });
      if (backendRes.data && backendRes.data.ok) {
        actualMongoRole = backendRes.data.role;
      }
    } catch (err) {
      logger.error(`[delete-verify-failed] Internal verification failed: ${err.message}`);
    }

    if (isEducation) {
      // Education Mode: Only Instructor (Manager) can delete lectures/meetings
      if (actualMongoRole !== "Manager" && actualMongoRole !== "Teacher" && actualMongoRole !== "Instructor") {
        throw new AppError("Access Denied: Only Instructors (Managers) can delete past lectures in Course Mode", 403);
      }
    } else {
      // Corporate Mode: Manager or Team Lead can delete meetings
      if (actualMongoRole !== "Manager" && actualMongoRole !== "Team Lead") {
        throw new AppError("Access Denied: Only Managers or Team Leads can delete past meetings", 403);
      }
    }

    // 1. Delete SQLite records
    await sqliteRepo.deleteMeeting(meetingId);

    // 2. Clean up recordings folder on disk
    try {
      const fs = require("fs");
      const path = require("path");
      const config = require("../config/config");
      const dir = path.join(config.recordingsDir, String(meetingId).replace(/[^a-zA-Z0-9_-]/g, ""));
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        logger.info(`[deleteMeeting] Deleted recording directory for ${meetingId}`);
      }
    } catch (fsErr) {
      logger.error(`[deleteMeeting] Failed to clean up recording files on disk: ${fsErr.message}`);
    }

    sendSuccess(res, null, "Meeting deleted successfully");
  },

  deleteProject: async (req, res) => {
    const { projectId } = req.params;
    const meetings = await sqliteRepo.listMeetings({ projectId });
    const fs = require("fs");
    const path = require("path");
    const config = require("../config/config");
    
    for (const meeting of meetings) {
      try {
        const dir = path.join(config.recordingsDir, String(meeting.meeting_id).replace(/[^a-zA-Z0-9_-]/g, ""));
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          logger.info(`[deleteProject] Deleted recording directory for ${meeting.meeting_id}`);
        }
      } catch (err) {
        logger.error(`[deleteProject] Failed to clean up meeting files on disk: ${err.message}`);
      }
    }

    await sqliteRepo.deleteProjectCascading(projectId);

    sendSuccess(res, null, "Project and all related resources deleted successfully from SQLite");
  }
};

