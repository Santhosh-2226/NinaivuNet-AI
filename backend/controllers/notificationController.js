const Notification = require("../models/Notification");

/**
 * Fetch all notifications for the authenticated user
 */
exports.listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("sender", "name profilePicture")
      .populate("project", "name color")
      .sort({ createdAt: -1 });

    res.json({ ok: true, notifications });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch notifications" });
  }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, { isRead: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to update notification" });
  }
};
