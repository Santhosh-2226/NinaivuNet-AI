const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { requireRole, requireMembership } = require("../middleware/projectRole");
const projectCtrl = require("../controllers/projectController");
const memberCtrl = require("../controllers/memberController");
const inviteCtrl = require("../controllers/inviteController");

// Internal role resolver (used by meeting server on port 3000 to verify members without JWT cookies)
router.get("/internal/verify-member", async (req, res) => {
  try {
    const { projectId, email } = req.query;
    if (!projectId || !email) {
      return res.status(400).json({ ok: false, error: "projectId and email are required" });
    }
    const { ProjectMember } = require("../models/ProjectMember");
    const User = require("../models/User");
    const Project = require("../models/Project");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: false, error: "User not found" });

    // Look up by project ID or name slug
    let project = null;
    try {
      project = await Project.findById(projectId);
    } catch(e) {}
    
    if (!project) {
      const projects = await Project.find();
      project = projects.find(p => p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") === projectId);
    }
    if (!project) return res.json({ ok: false, error: "Project not found" });

    const member = await ProjectMember.findOne({ project: project._id, user: user._id, status: "active" });
    if (!member) return res.json({ ok: false, error: "Not a member" });

    res.json({ ok: true, role: member.role });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// All project routes require authentication
router.use(protect);

// ── Projects ─────────────────────────────────────────────────────────
router.get("/", projectCtrl.listMyProjects);
router.post("/", projectCtrl.createProject);

router.get("/:projectId", requireMembership, projectCtrl.getProject);
router.patch("/:projectId", requireRole("Manager"), projectCtrl.updateProject);
router.delete("/:projectId", requireRole("Manager"), projectCtrl.deleteProject);

// ── Members ──────────────────────────────────────────────────────────
router.get("/:projectId/members", requireMembership, memberCtrl.listMembers);
router.patch("/:projectId/members/:userId", requireRole("Manager"), memberCtrl.updateMemberRole);
router.delete("/:projectId/members/:userId", requireRole("Manager"), memberCtrl.removeMember);

// ── Invitations (per-project) ─────────────────────────────────────────
router.post("/:projectId/invitations", requireRole("Manager", "Team Lead"), inviteCtrl.sendInvitation);
router.get("/:projectId/invitations", requireRole("Manager", "Team Lead"), inviteCtrl.listProjectInvitations);

module.exports = router;
