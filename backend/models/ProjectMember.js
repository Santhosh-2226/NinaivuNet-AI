const mongoose = require("mongoose");

// Role belongs to (User + Project), never to the User globally.
// The same user can be "Manager" in Project A and "Member" in Project B.
const ROLES = ["Manager", "Team Lead", "Member", "Student", "Viewer"];

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "pending", "removed"],
      default: "active",
    },
    // Who added this member (for audit trail)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A user can only have ONE membership record per project
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);

module.exports = { ProjectMember, ROLES };
