const router = require("express").Router();
const passport = require("passport");
const ctrl = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { validate, registerSchema, loginSchema } = require("../validators/validator");

router.post("/register", validate(registerSchema), ctrl.register);
router.post("/login", validate(loginSchema), ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/logout", protect, ctrl.logout);
router.get("/me", protect, ctrl.me);
router.patch("/profile", protect, ctrl.updateProfile);

if (process.env.GOOGLE_CLIENT_ID) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  const User = require("../models/User");

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              user.googleId = profile.id;
              user.profilePicture = user.profilePicture || profile.photos[0]?.value;
              await user.save({ validateBeforeSave: false });
            } else {
              user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                profilePicture: profile.photos[0]?.value,
                isVerified: true,
              });
            }
          }
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=oauth_failed" }),
    ctrl.googleCallback
  );
} else {
  router.get("/google", (req, res) => {
    res.status(400).json({
      success: false,
      message: "Google OAuth is not configured"
    });
  });
  router.get("/google/callback", (req, res) => {
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=oauth_not_configured`);
  });
}

module.exports = router;
