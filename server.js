/**
 * NinaivuNet AI - Meeting Server
 * ---------------------------------
 */
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { Server } = require("socket.io");
const config = require("./src/config/config");
const logger = require("./src/utils/logger");
const sqliteRepo = require("./src/repositories/sqliteRepository");
const meetingService = require("./src/services/meetingService");
const { globalErrorHandler } = require("./src/middlewares/errorMiddleware");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8,
});

const PORT = config.port;
const RECORDINGS_DIR = config.recordingsDir;

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Central health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Meeting Server is healthy",
    timestamp: new Date().toISOString()
  });
});

// Load all modular meeting routes
app.use("/api", require("./src/routes/meetingRoutes"));

// WebRTC Rooms Map
const rooms = new Map();
const activeQuizzes = new Map();

io.on("connection", (socket) => {
  let currentMeetingId = null;
  let currentUserName = null;

  socket.on("join-meeting", async ({ meetingId, userName, email, role: passedRole }) => {
    currentMeetingId = meetingId;
    currentUserName = userName || `Guest-${socket.id.slice(0, 5)}`;
    const projectId = meetingId.split("_")[0];
    const resolvedEmail = email || currentUserName;

    let role = null;
    if (email) {
      role = await sqliteRepo.resolveRole(projectId, email);
    }
    if (!role && userName) {
      role = await sqliteRepo.resolveRole(projectId, userName);
    }

    // Fallback: If not found in SQLite, ask the backend API server on port 4000
    if (!role && email) {
      try {
        const axios = require("axios");
        const backendRes = await axios.get(`http://localhost:4000/api/projects/internal/verify-member`, {
          params: { projectId, email }
        });
        if (backendRes.data && backendRes.data.ok) {
          const mongoRole = backendRes.data.role;
          // Map MongoDB role to SQLite role ("lead" or "member")
          role = (
            mongoRole === "Manager" ||
            mongoRole === "Team Lead" ||
            mongoRole === "Teacher" ||
            mongoRole === "Instructor" ||
            mongoRole === "Professor" ||
            mongoRole === "Course Lead"
          ) ? "lead" : "member";

          // Dynamically sync and save to SQLite so future queries are instant
          await sqliteRepo.addProjectMember({ projectId, userName: email, role });
          logger.info(`[sqlite-sync] Dynamically synced and cached member ${email} as ${role}`);
        }
      } catch (err) {
        logger.error(`[backend-verify-failed] Fallback verification call failed: ${err.message}`);
      }
    }

    if (!role) {
      logger.warn(`[join-rejected] Access Denied for email=${email}/userName=${userName} on meeting ${meetingId}`);
      socket.emit("join-rejected", { error: "Access Denied: Only invited team members can join this project meeting!" });
      return;
    }

    socket.role = role;
    socket.email = resolvedEmail;
    socket.join(meetingId);

    sqliteRepo.logAudit({
      userId: resolvedEmail,
      action: "JOIN_MEETING",
      resource: `Meeting: ${meetingId}, Project: ${projectId}, Role: ${role}`
    }).catch(e => logger.error(`Audit log failed: ${e.message}`));

    sqliteRepo.logAttendance({ 
      meetingId, 
      userName: currentUserName, 
      joinTime: new Date().toISOString(),
      email: resolvedEmail,
      role: passedRole || role
    }).catch(e => logger.error(`Attendance join log failed: ${e.message}`));

    if (!rooms.has(meetingId)) rooms.set(meetingId, new Map());
    const room = rooms.get(meetingId);

    const existingPeers = Array.from(room.entries()).map(([id, peerObj]) => ({
      socketId: id,
      userName: peerObj.userName,
      role: peerObj.role
    }));
    socket.emit("existing-peers", existingPeers);

    socket.to(meetingId).emit("peer-joined", { socketId: socket.id, userName: currentUserName, role });

    const projectDomain = await sqliteRepo.getProjectDomain(projectId) || "corporate";
    socket.emit("meeting-joined", { role, domain: projectDomain });

    room.set(socket.id, { userName: currentUserName, role });
    logger.meeting(meetingId, `${currentUserName} joined meeting as ${role}`);
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("chat-message", (text) => {
    if (currentMeetingId) {
      socket.to(currentMeetingId).emit("chat-message", {
        from: currentUserName,
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
    }
  });

  socket.on("live-caption", (payload) => {
    if (currentMeetingId) {
      socket.to(currentMeetingId).emit("live-caption-received", {
        speaker: currentUserName,
        text: payload.text,
        language: payload.language
      });
    }
  });

  socket.on("hand-raise", (isRaised) => {
    if (currentMeetingId) {
      socket.to(currentMeetingId).emit("hand-raise", {
        from: socket.id,
        isRaised
      });
    }
  });

  socket.on("peer-state-change", (state) => {
    if (currentMeetingId) {
      socket.to(currentMeetingId).emit("peer-state-change", {
        from: socket.id,
        ...state
      });
    }
  });

  socket.on("draw-line", (drawData) => {
    if (currentMeetingId) socket.to(currentMeetingId).emit("draw-line", drawData);
  });

  socket.on("draw-shape", (shapeData) => {
    if (currentMeetingId) socket.to(currentMeetingId).emit("draw-shape", shapeData);
  });

  socket.on("draw-text", (textData) => {
    if (currentMeetingId) socket.to(currentMeetingId).emit("draw-text", textData);
  });

  socket.on("clear-whiteboard", () => {
    if (currentMeetingId) socket.to(currentMeetingId).emit("clear-whiteboard");
  });

  socket.on("quiz-launch", ({ questionObj }) => {
    if (!currentMeetingId) return;
    activeQuizzes.set(currentMeetingId, {
      questionObj,
      submissions: new Map()
    });
    socket.to(currentMeetingId).emit("quiz-launched", { questionObj });
    logger.info(`[quiz-launch] Quiz launched in room ${currentMeetingId}: "${questionObj.question}"`);
  });

  socket.on("quiz-close", () => {
    if (!currentMeetingId) return;
    activeQuizzes.delete(currentMeetingId);
    socket.to(currentMeetingId).emit("quiz-closed");
    logger.info(`[quiz-close] Quiz closed in room ${currentMeetingId}`);
  });

  socket.on("quiz-submit", ({ answer }) => {
    if (!currentMeetingId) return;
    const activeQuiz = activeQuizzes.get(currentMeetingId);
    if (!activeQuiz) {
      logger.warn(`[quiz-submit-ignored] No active quiz found in room ${currentMeetingId}`);
      return;
    }

    const { questionObj, submissions } = activeQuiz;
    const isCorrect = String(answer).trim().toLowerCase() === String(questionObj.answer).trim().toLowerCase();

    submissions.set(socket.id, {
      studentName: currentUserName,
      answer,
      isCorrect
    });

    const details = Array.from(submissions.values());
    const totalSubmissions = details.length;
    const correctCount = details.filter(d => d.isCorrect).length;
    const incorrectCount = totalSubmissions - correctCount;

    const stats = {
      question: questionObj.question,
      totalSubmissions,
      correctCount,
      incorrectCount,
      details
    };

    io.to(currentMeetingId).emit("quiz-answer-update", stats);
    logger.info(`[quiz-submit] Student "${currentUserName}" submitted "${answer}" in room ${currentMeetingId}. Correct: ${isCorrect}`);
  });

  socket.on("quiz-action", (quizData) => {
    if (currentMeetingId) socket.to(currentMeetingId).emit("quiz-action-received", quizData);
  });

  socket.on("disconnect", () => {
    if (currentMeetingId && rooms.has(currentMeetingId)) {
      rooms.get(currentMeetingId).delete(socket.id);
      socket.to(currentMeetingId).emit("peer-left", { socketId: socket.id });

      sqliteRepo.logAttendance({ meetingId: currentMeetingId, userName: currentUserName, leaveTime: new Date().toISOString() })
        .catch(e => logger.error(`Attendance leave log failed: ${e.message}`));

      if (rooms.get(currentMeetingId).size === 0) {
        rooms.delete(currentMeetingId);
        const mid = currentMeetingId;
        setTimeout(() => {
          meetingService.triggerAutoIngest(mid);
        }, 2500);
      }
    }
    logger.meeting(currentMeetingId || "N/A", `Participant disconnected: ${currentUserName}`);
  });
});

// Run data retention checks once on boot, and set daily cron-like checks
meetingService.applyDataRetentionPolicy();
setInterval(meetingService.applyDataRetentionPolicy, 24 * 60 * 60 * 1000);

// Central error handler
app.use(globalErrorHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`NinaivuNet meeting server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, server };
