const { ProjectMember } = require("../models/ProjectMember");

/**
 * Returns a middleware that checks whether req.user has AT LEAST one of
 * the allowedRoles in the project specified by req.params.projectId.
 *
 * Usage:
 *   router.delete("/:projectId", protect, requireRole("Manager"), ...)
 *   router.patch("/:projectId/members/:uid", protect, requireRole("Manager","Team Lead"), ...)
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ ok: false, error: "projectId is required" });
      }

      const membership = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id,
        status: "active",
      });

      if (!membership) {
        return res.status(403).json({ ok: false, error: "You are not a member of this project" });
      }

      // Expand allowedRoles to include equivalent educational/academic roles
      const expandedAllowedRoles = [...allowedRoles];
      if (allowedRoles.includes("Manager")) {
        expandedAllowedRoles.push("Instructor", "Teacher", "Professor");
      }
      if (allowedRoles.includes("Team Lead")) {
        expandedAllowedRoles.push("Course Lead");
      }
      if (allowedRoles.includes("Member")) {
        expandedAllowedRoles.push("Student");
      }

      if (!expandedAllowedRoles.includes(membership.role)) {
        return res.status(403).json({
          ok: false,
          error: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
        });
      }

      // Attach the membership so controllers don't have to re-query it
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Lightweight membership check (any role) — use when you just need to
 * verify the user belongs to the project, not a specific role.
 */
const requireMembership = requireRole("Manager", "Team Lead", "Member", "Student", "Viewer");

module.exports = { requireRole, requireMembership };
