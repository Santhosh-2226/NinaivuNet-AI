const { ProjectMember } = require("../models/ProjectMember");
const Invitation = require("../models/Invitation");
const Project = require("../models/Project");

/* ------------------------------------------------------------------ */
/* GET /api/dashboard — Aggregated view for the logged-in user        */
/* ------------------------------------------------------------------ */
exports.getDashboard = async (req, res) => {
  try {
    // 1. All active projects the user belongs to (with their role)
    const memberships = await ProjectMember.find({
      user: req.user._id,
      status: "active",
    })
      .populate({ path: "project", match: { isArchived: false } })
      .sort({ joinedAt: -1 });

    const projects = memberships
      .filter((m) => m.project)
      .map((m) => ({
        id: m.project._id,
        name: m.project.name,
        description: m.project.description,
        domain: m.project.domain,
        color: m.project.color,
        myRole: m.role,
        joinedAt: m.joinedAt,
        meetingCount: m.project.meetingIds?.length || 0,
      }));

    // 2. Pending invitations for this user
    const pendingInvitations = await Invitation.find({
      invitedEmail: req.user.email,
      status: "pending",
    })
      .populate("project", "name color domain")
      .populate("invitedBy", "name email profilePicture")
      .sort({ createdAt: -1 })
      .limit(10);

    // 3. Summary stats
    const stats = {
      totalProjects: projects.length,
      projectsAsManager: projects.filter((p) => p.myRole === "Manager").length,
      pendingInvitations: pendingInvitations.length,
    };

    res.json({
      ok: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
      },
      stats,
      projects,
      pendingInvitations,
    });
  } catch (err) {
    console.error("[getDashboard]", err);
    res.status(500).json({ ok: false, error: "Failed to load dashboard" });
  }
};
