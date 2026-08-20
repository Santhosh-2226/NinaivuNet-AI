const mongoose = require("mongoose");

const scheduledMeetingSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    dateTime: {
      type: Date,
      required: [true, "Meeting date and time is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    meetingId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

// Index to auto-sort by upcoming date
scheduledMeetingSchema.index({ dateTime: 1 });

module.exports = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);
