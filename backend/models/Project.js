const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [120, "Project name cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    domain: {
      type: String,
      enum: ["corporate", "education"],
      default: "corporate",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Soft-delete
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Optional: icon color chosen at creation
    color: {
      type: String,
      default: "#6c5ce7",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    // Link to the SQLite meeting pipeline (meeting IDs produced by
    // transcribe.py / llm_pipeline.py live here)
    meetingIds: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: member count (populated separately when needed)
projectSchema.virtual("memberCount", {
  ref: "ProjectMember",
  localField: "_id",
  foreignField: "project",
  count: true,
});

module.exports = mongoose.model("Project", projectSchema);
