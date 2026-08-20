const Project = require("../models/Project");
const { ProjectMember, ROLES } = require("../models/ProjectMember");
const { syncProject } = require("../services/sqliteSync");

/* ------------------------------------------------------------------ */
/* GET /api/projects  — My projects with my role in each              */
/* ------------------------------------------------------------------ */
exports.listMyProjects = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({
      user: req.user._id,
      status: "active",
    })
      .populate({
        path: "project",
        match: { isArchived: false },
        populate: [
          { path: "organization", select: "name" },
          { path: "department", select: "name" }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter out nulls (archived projects that didn't match)
    const projects = memberships
      .filter((m) => m.project)
      .map((m) => ({
        ...m.project.toJSON(),
        myRole: m.role,
        joinedAt: m.joinedAt,
      }));

    res.json({ ok: true, projects });
  } catch (err) {
    console.error("[listMyProjects]", err);
    res.status(500).json({ ok: false, error: "Failed to fetch projects" });
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/projects — Create a new project                          */
/* ------------------------------------------------------------------ */
exports.createProject = async (req, res) => {
  try {
    const { name, description, domain, color, organization, department } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });

    const project = await Project.create({
      name,
      description: description || "",
      domain: domain || "corporate",
      color: color || "#6c5ce7",
      createdBy: req.user._id,
      organization: organization || null,
      department: department || null,
    });

    // Creator automatically becomes Manager
    await ProjectMember.create({
      project: project._id,
      user: req.user._id,
      role: "Manager",
      addedBy: req.user._id,
    });

    // Sync to SQLite (port 3000)
    await syncProject({
      name,
      domain: domain || "corporate",
      creatorName: req.user.email,
    });

    res.status(201).json({ ok: true, project: { ...project.toJSON(), myRole: "Manager" } });
  } catch (err) {
    console.error("[createProject]", err);
    res.status(500).json({ ok: false, error: "Failed to create project" });
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/projects/:projectId — Project detail                      */
/* ------------------------------------------------------------------ */
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("createdBy", "name email profilePicture")
      .populate("organization", "name")
      .populate("department", "name");
    if (!project || project.isArchived) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const members = await ProjectMember.find({
      project: project._id,
      status: "active",
    }).populate("user", "name email profilePicture");

    res.json({
      ok: true,
      project: {
        ...project.toJSON(),
        myRole: req.membership?.role,
        members,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch project" });
  }
};

/* ------------------------------------------------------------------ */
/* PATCH /api/projects/:projectId — Update project (Manager only)     */
/* ------------------------------------------------------------------ */
exports.updateProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { ...(name && { name }), ...(description !== undefined && { description }), ...(color && { color }) },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
    res.json({ ok: true, project });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update project" });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE /api/projects/:projectId — Full delete project (Creator only)*/
/* ------------------------------------------------------------------ */
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "Project not found" });

    // Restrict deletion to the creator of the project only
    if (String(project.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ ok: false, error: "Access Denied: Only the project creator can delete this project" });
    }

    // 1. Sync deletion to SQLite meeting server (port 3000)
    try {
      const axios = require("axios");
      const sqliteId = project.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await axios.delete(`http://localhost:3000/api/projects/${sqliteId}`);
    } catch (sqliteErr) {
      console.warn("Failed to sync project deletion to SQLite:", sqliteErr.message);
    }

    // 2. Delete all related MongoDB resources
    const ScheduledMeeting = require("../models/ScheduledMeeting");
    const Invitation = require("../models/Invitation");
    const Notification = require("../models/Notification");

    await Project.findByIdAndDelete(projectId);
    await ProjectMember.deleteMany({ project: projectId });
    await Invitation.deleteMany({ project: projectId });
    await ScheduledMeeting.deleteMany({ project: projectId });
    await Notification.deleteMany({ project: projectId });

    res.json({ ok: true, message: "Project and all related resources deleted successfully from all databases" });
  } catch (err) {
    console.error("[deleteProject]", err);
    res.status(500).json({ ok: false, error: "Failed to delete project" });
  }
};
