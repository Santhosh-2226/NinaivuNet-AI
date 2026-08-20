const router = require("express").Router();
const { protect } = require("../middleware/auth");
const inviteCtrl = require("../controllers/inviteController");

router.use(protect);

// My pending invitations
router.get("/pending", inviteCtrl.myPendingInvitations);

// Accept / decline by token
router.post("/:token/accept", inviteCtrl.acceptInvitation);
router.post("/:token/decline", inviteCtrl.declineInvitation);

module.exports = router;
