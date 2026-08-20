const { v4: uuidv4 } = require("uuid");
const Invitation = require("../models/Invitation");
const { ProjectMember, ROLES } = require("../models/ProjectMember");
const Project = require("../models/Project");
const User = require("../models/User");
const { sendInvitationEmail } = require("../services/emailService");

/* ------------------------------------------------------------------ */
/* POST /api/projects/:projectId/invitations — Invite by email        */
/* ------------------------------------------------------------------ */
exports.sendInvitation = async (req, res) => {
  try {
    const { email, role } = req.body;
    const projectId = req.params.projectId;

    if (!email) return res.status(400).json({ ok: false, error: "email is required" });
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: `role must be one of: ${ROLES.join(", ")}` });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "Project not found" });

    // Check if the user already is a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const alreadyMember = await ProjectMember.findOne({
        project: projectId,
        user: existingUser._id,
        status: "active",
      });
      if (alreadyMember) {
        return res.status(409).json({ ok: false, error: "User is already a member of this project" });
      }
    }

    // Prevent duplicate pending invitations
    const existingInvite = await Invitation.findOne({
      project: projectId,
      invitedEmail: email.toLowerCase(),
      status: "pending",
    });
    if (existingInvite) {
      return res.status(409).json({ ok: false, error: "An invitation has already been sent to this email" });
    }

    const token = uuidv4();
    const invitation = await Invitation.create({
      project: projectId,
      invitedEmail: email.toLowerCase(),
      invitedBy: req.user._id,
      role: role || "Member",
      token,
      invitedUser: existingUser?._id || null,
    });

    // Try to send email (silently skips if SMTP not configured)
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    await sendInvitationEmail({
      toEmail: email,
      inviterName: req.user.name,
      projectName: project.name,
      role: role || "Member",
      acceptUrl: `${clientUrl}/invitations/${token}/accept`,
    });

    res.status(201).json({ ok: true, invitation: { id: invitation._id, email, role: invitation.role, token } });
  } catch (err) {
    console.error("[sendInvitation]", err);
    res.status(500).json({ ok: false, error: "Failed to send invitation" });
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/invitations/pending — My pending invitations              */
/* ------------------------------------------------------------------ */
exports.myPendingInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      invitedEmail: req.user.email,
      status: "pending",
    })
      .populate("project", "name description domain color")
      .populate("invitedBy", "name email profilePicture")
      .sort({ createdAt: -1 });

    res.json({ ok: true, invitations });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch invitations" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/invitations/:token/accept                                 */
/* ------------------------------------------------------------------ */
exports.acceptInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      status: "pending",
    }).populate("project");

    if (!invitation) {
      return res.status(404).json({ ok: false, error: "Invitation not found or already used" });
    }
    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(410).json({ ok: false, error: "Invitation has expired" });
    }
    if (invitation.invitedEmail !== req.user.email) {
      return res.status(403).json({ ok: false, error: "This invitation was sent to a different email address" });
    }

    // Upsert membership (handles case where they were manually added already)
    await ProjectMember.findOneAndUpdate(
      { project: invitation.project._id, user: req.user._id },
      { role: invitation.role, status: "active", addedBy: invitation.invitedBy, joinedAt: new Date() },
      { upsert: true, new: true }
    );

    invitation.status = "accepted";
    invitation.invitedUser = req.user._id;
    await invitation.save();

    // Sync to SQLite (port 3000)
    try {
      const { syncMember } = require("../services/sqliteSync");
      await invitation.populate("invitedBy", "name");
      await syncMember({
        projectName: invitation.project.name,
        userName: req.user.email,
        role: invitation.role,
        requestedByName: invitation.invitedBy?.email || "Manager",
      });
    } catch (syncErr) {
      console.warn("Failed to sync invitation acceptance to SQLite:", syncErr.message);
    }

    res.json({ ok: true, project: invitation.project, role: invitation.role });
  } catch (err) {
    console.error("[acceptInvitation]", err);
    res.status(500).json({ ok: false, error: "Failed to accept invitation" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/invitations/:token/decline                                */
/* ------------------------------------------------------------------ */
exports.declineInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findOne({
      token: req.params.token,
      status: "pending",
    });
    if (!invitation) return res.status(404).json({ ok: false, error: "Invitation not found" });

    invitation.status = "declined";
    await invitation.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to decline invitation" });
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/projects/:projectId/invitations — List project invites    */
/* ------------------------------------------------------------------ */
exports.listProjectInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      project: req.params.projectId,
    })
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ ok: true, invitations });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch invitations" });
  }
};
