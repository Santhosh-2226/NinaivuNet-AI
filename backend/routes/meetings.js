const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { requireRole, requireMembership } = require("../middleware/projectRole");
const ctrl = require("../controllers/meetingController");

// Schedule a meeting for a project (Manager/Team Lead only)
router.post(
  "/projects/:projectId/meetings",
  protect,
  requireRole("Manager", "Team Lead"),
  ctrl.scheduleMeeting
);

// Get scheduled meetings for a project (Members only)
router.get(
  "/projects/:projectId/meetings",
  protect,
  requireMembership,
  ctrl.listProjectMeetings
);

// Get upcoming calendar schedule for the user (All projects they belong to)
router.get(
  "/my-calendar",
  protect,
  ctrl.listMyCalendar
);

// Notify project members that an immediate meeting has started
router.post(
  "/started",
  protect,
  ctrl.notifyImmediateMeeting
);

// Cancel a scheduled meeting
router.delete(
  "/scheduled/:meetingId",
  protect,
  ctrl.cancelMeeting
);

module.exports = router;
