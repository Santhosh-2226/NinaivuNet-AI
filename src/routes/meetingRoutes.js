const express = require("express");
const multer = require("multer");
const path = require("path");
const config = require("../config/config");
const { 
  validate, 
  meetingStartSchema, 
  reminderSchema, 
  translateRequestSchema, 
  emailDraftSchema, 
  meetingPrepSchema, 
  whiteboardSchema, 
  executiveCopilotSchema, 
  ragQuerySchema 
} = require("../validators/validator");
const meetingController = require("../controllers/meetingController");
const { asyncHandler } = require("../middlewares/errorMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { meetingId, userId } = req.body;
    if (!meetingId || !userId) return cb(new Error("meetingId and userId are required"));
    const dir = path.join(config.recordingsDir, String(meetingId).replace(/[^a-zA-Z0-9_-]/g, ""), String(userId).replace(/[^a-zA-Z0-9_-]/g, ""));
    const fs = require("fs");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body.chunkIndex ?? Date.now();
    cb(null, `chunk-${String(chunkIndex).padStart(6, "0")}.webm`);
  },
});

const upload = multer({ storage });

router.post("/meetings/:meetingId/participants/:userId/start", validate(meetingStartSchema), asyncHandler(meetingController.startRecording));
router.post("/meetings/:meetingId/participants/:userId/finalize", asyncHandler(meetingController.finalizeRecording));
router.post("/upload-audio", upload.single("audio"), asyncHandler(meetingController.uploadAudio));

/* Past Meetings — list & detail (called by React frontend) */
router.get("/db/meetings", asyncHandler(meetingController.listMeetings));
router.get("/db/meetings/:meetingId", asyncHandler(meetingController.getMeetingById));
router.get("/db/meetings/:meetingId/attendance", asyncHandler(meetingController.getMeetingAttendance));

/* Manual re-ingest trigger (frontend “Import Folder” button) */
router.post("/meetings/:meetingId/ingest", asyncHandler(meetingController.manualIngest));
router.post("/db/meetings/:meetingId/reminders", validate(reminderSchema), asyncHandler(meetingController.sendReminders));
router.post("/db/meetings/:meetingId/email-draft", validate(emailDraftSchema), asyncHandler(meetingController.generateEmailDraft));
router.post("/db/meetings/:meetingId/negotiation-analyze", asyncHandler(meetingController.analyzeNegotiations));
router.get("/db/meetings/:meetingId/coach-hints", asyncHandler(meetingController.getCoachHints));
router.post("/db/meetings/:projectId/prep-brief", validate(meetingPrepSchema), asyncHandler(meetingController.generatePrepBrief));
router.post("/db/meetings/:meetingId/analyze-whiteboard", validate(whiteboardSchema), asyncHandler(meetingController.analyzeWhiteboard));
router.post("/db/translate", validate(translateRequestSchema), asyncHandler(meetingController.translateText));
router.post("/db/executive-copilot", validate(executiveCopilotSchema), asyncHandler(meetingController.queryExecutiveCopilot));
router.get("/db/org-risk-map", asyncHandler(meetingController.getOrgRiskMap));
router.get("/db/collaboration-scores", asyncHandler(meetingController.getCollaborationScores));
router.get("/db/org-memory", asyncHandler(meetingController.getOrgMemoryTimeline));
router.post("/db/global-search", asyncHandler(meetingController.globalSearch));
router.post("/db/decision-simulator", asyncHandler(meetingController.simulateDecision));
router.get("/db/governance-status", asyncHandler(meetingController.getGovernanceStatus));
router.post("/rag/query", validate(ragQuerySchema), asyncHandler(meetingController.queryRAG));
router.get("/db/audit-logs", asyncHandler(meetingController.getAuditLogs));

/* Tasks APIs */
router.get("/db/tasks", asyncHandler(meetingController.listTasks));
router.post("/db/tasks/:taskId/status", asyncHandler(meetingController.updateTaskStatus));

/* Project-scoped Decisions & Audits */
router.get("/db/projects/:projectId/decisions", asyncHandler(meetingController.listProjectDecisions));
router.get("/db/projects/:projectId/audit-logs", asyncHandler(meetingController.getProjectAuditLogs));
router.post("/db/projects/:projectId/meeting-prep", validate(meetingPrepSchema), asyncHandler(meetingController.generatePrepBrief));
/* Transcript Search */
router.get("/db/search", asyncHandler(meetingController.searchTranscripts));

/* Delete meeting routes */
router.delete("/db/meetings/:meetingId", asyncHandler(meetingController.deleteMeeting));
router.post("/db/meetings/:meetingId/delete", asyncHandler(meetingController.deleteMeeting));
router.post("/db/meetings/:meetingId/generate-quiz", asyncHandler(meetingController.generateQuiz));

/* Sync routes called by main backend server */
router.post("/projects", asyncHandler(meetingController.createProject));
router.post("/projects/:projectId/members", asyncHandler(meetingController.addProjectMember));
router.delete("/projects/:projectId", asyncHandler(meetingController.deleteProject));

module.exports = router;

