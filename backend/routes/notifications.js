const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/notificationController");

router.use(protect);

// Get all notifications for the user
router.get("/", ctrl.listNotifications);

// Mark a specific notification as read
router.patch("/:notificationId/read", ctrl.markAsRead);

module.exports = router;
