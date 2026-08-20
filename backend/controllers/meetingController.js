const ScheduledMeeting = require("../models/ScheduledMeeting");
const Project = require("../models/Project");
const { ProjectMember } = require("../models/ProjectMember");
const Notification = require("../models/Notification");
const { getSqliteProjectId } = require("../services/sqliteSync");

/**
 * Creates a scheduled meeting for a project.
 * Requester role validation (Manager/Team Lead) is handled in route middleware.
 */
exports.scheduleMeeting = async (req, res) => {
  try {
    const { title, dateTime } = req.body;
    const { projectId } = req.params;

    if (!title || !dateTime) {
      return res.status(400).json({ ok: false, error: "title and dateTime are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "Project not found" });

    // Generate unique meetingId based on project slug & formatted date-time
    const dateObj = new Date(dateTime);
    const dateStr = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = dateObj.toTimeString().slice(0, 5).replace(":", "-"); // HH-MM
    const projectSlug = getSqliteProjectId(project.name);
    const meetingId = `${projectSlug}_${dateStr}_${timeStr}_${Math.random().toString(36).slice(2, 6)}`;

    const scheduled = await ScheduledMeeting.create({
      project: projectId,
      title,
      dateTime: dateObj,
      createdBy: req.user._id,
      meetingId,
      status: "scheduled",
    });

    // Create notifications for all active project members (excluding creator)
    const members = await ProjectMember.find({ project: projectId, status: "active" }).populate("user", "name email");
    const notificationPromises = members
      .filter((m) => m.user && String(m.user._id) !== String(req.user._id))
      .map((m) =>
        Notification.create({
          recipient: m.user._id,
          sender: req.user._id,
          project: projectId,
          message: `${req.user.name} scheduled a meeting "${title}" on ${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          type: "meeting_scheduled",
          link: meetingId,
        })
      );
    await Promise.all(notificationPromises);

    // Send scheduling notification emails to active members (excluding creator)
    const { sendMeetingScheduledEmail } = require("../services/emailService");
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const joinUrl = `${clientUrl}/projects/${projectId}`;

    const emailPromises = members
      .filter((m) => m.user && String(m.user._id) !== String(req.user._id))
      .map((m) =>
        sendMeetingScheduledEmail({
          toEmail: m.user.email,
          creatorName: req.user.name,
          projectName: project.name,
          meetingTitle: title,
          dateTime: dateObj,
          joinUrl,
        }).catch((err) => console.error(`Failed to send email to ${m.user.email}:`, err.message))
      );
    await Promise.all(emailPromises);

    res.status(201).json({ ok: true, scheduled });
  } catch (err) {
    console.error("[scheduleMeeting]", err);
    res.status(500).json({ ok: false, error: "Failed to schedule meeting" });
  }
};

/**
 * Creates notifications for all project members when an immediate meeting is started.
 */
exports.notifyImmediateMeeting = async (req, res) => {
  try {
    const { projectId, meetingId } = req.body;
    if (!projectId || !meetingId) {
      return res.status(400).json({ ok: false, error: "projectId and meetingId are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "Project not found" });

    // Create notifications for all active project members (excluding sender)
    const members = await ProjectMember.find({ project: projectId, status: "active" });
    const notificationPromises = members
      .filter((m) => String(m.user) !== String(req.user._id))
      .map((m) =>
        Notification.create({
          recipient: m.user,
          sender: req.user._id,
          project: projectId,
          message: `${req.user.name} started a live call in "${project.name}"!`,
          type: "meeting_started",
          link: meetingId,
        })
      );
    await Promise.all(notificationPromises);

    res.json({ ok: true });
  } catch (err) {
    console.error("[notifyImmediateMeeting]", err);
    res.status(500).json({ ok: false, error: "Failed to create live call notifications" });
  }
};

/**
 * Lists scheduled meetings for a specific project.
 */
exports.listProjectMeetings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const meetings = await ScheduledMeeting.find({
      project: projectId,
    })
      .populate("createdBy", "name email")
      .sort({ dateTime: 1 });

    res.json({ ok: true, meetings });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch meetings" });
  }
};

/**
 * Lists scheduled meetings across all projects the logged-in user belongs to (Calendar feed).
 */
exports.listMyCalendar = async (req, res) => {
  try {
    // Get all projects the user belongs to
    const memberships = await ProjectMember.find({
      user: req.user._id,
      status: "active",
    });

    const projectIds = memberships.map((m) => m.project);

    // Fetch all upcoming/active scheduled meetings
    const meetings = await ScheduledMeeting.find({
      project: { $in: projectIds },
      status: { $in: ["scheduled", "live"] },
    })
      .populate("project", "name color domain")
      .populate("createdBy", "name email")
      .sort({ dateTime: 1 });

    res.json({ ok: true, meetings });
  } catch (err) {
    console.error("[listMyCalendar]", err);
    res.status(500).json({ ok: false, error: "Failed to fetch calendar schedule" });
  }
};

exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await ScheduledMeeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ ok: false, error: "Scheduled meeting not found" });
    }

    // Only host who scheduled the meeting can cancel it
    if (String(meeting.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, error: "Only the host who scheduled the meeting can cancel it" });
    }

    await ScheduledMeeting.deleteOne({ meetingId });
    res.json({ ok: true });
  } catch (err) {
    console.error("[cancelMeeting]", err);
    res.status(500).json({ ok: false, error: "Failed to cancel meeting" });
  }
};
