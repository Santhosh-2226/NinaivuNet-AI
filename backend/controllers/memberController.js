const { ProjectMember, ROLES } = require("../models/ProjectMember");
const User = require("../models/User");

/* ------------------------------------------------------------------ */
/* GET /api/projects/:projectId/members                               */
/* ------------------------------------------------------------------ */
exports.listMembers = async (req, res) => {
  try {
    const members = await ProjectMember.find({
      project: req.params.projectId,
      status: "active",
    })
      .populate("user", "name email profilePicture createdAt")
      .sort({ joinedAt: 1 });

    res.json({ ok: true, members });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch members" });
  }
};

/* ------------------------------------------------------------------ */
/* PATCH /api/projects/:projectId/members/:userId — Change role       */
/* (Manager only, cannot demote yourself if you're the only Manager)  */
/* ------------------------------------------------------------------ */
exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: `role must be one of: ${ROLES.join(", ")}` });
    }

    const { projectId, userId } = req.params;

    // Prevent removing the last Manager
    if (role !== "Manager") {
      const managerCount = await ProjectMember.countDocuments({
        project: projectId,
        role: "Manager",
        status: "active",
      });
      const targetIsManager = await ProjectMember.findOne({
        project: projectId,
        user: userId,
        role: "Manager",
      });
      if (targetIsManager && managerCount <= 1) {
        return res.status(400).json({ ok: false, error: "Cannot demote the last Manager" });
      }
    }

    const membership = await ProjectMember.findOneAndUpdate(
      { project: projectId, user: userId, status: "active" },
      { role },
      { new: true }
    ).populate("user", "name email profilePicture");

    if (!membership) return res.status(404).json({ ok: false, error: "Member not found" });

    // Sync to SQLite (port 3000)
    try {
      const Project = require("../models/Project");
      const project = await Project.findById(projectId);
      if (project) {
        const { syncMember } = require("../services/sqliteSync");
        await syncMember({
          projectName: project.name,
          userName: membership.user.email,
          role: role,
          requestedByName: req.user.email,
        });
      }
    } catch (syncErr) {
      console.warn("Failed to sync member role to SQLite:", syncErr.message);
    }

    res.json({ ok: true, membership });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update role" });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE /api/projects/:projectId/members/:userId — Remove member    */
/* ------------------------------------------------------------------ */
exports.removeMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const managerCount = await ProjectMember.countDocuments({
      project: projectId,
      role: "Manager",
      status: "active",
    });
    const target = await ProjectMember.findOne({ project: projectId, user: userId });
    if (target?.role === "Manager" && managerCount <= 1) {
      return res.status(400).json({ ok: false, error: "Cannot remove the last Manager" });
    }

    await ProjectMember.findOneAndUpdate(
      { project: projectId, user: userId },
      { status: "removed" }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to remove member" });
  }
};
