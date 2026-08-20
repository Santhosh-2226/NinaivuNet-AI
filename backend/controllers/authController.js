const authService = require("../services/authService");
const mongoRepo = require("../repositories/mongoRepository");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { issueTokenPair } = require("../services/jwtService");

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  preferredLanguage: user.preferredLanguage || "en",
  autoTranslate: user.autoTranslate !== undefined ? user.autoTranslate : true,
  translateCaptions: user.translateCaptions !== undefined ? user.translateCaptions : true,
  translateDashboard: user.translateDashboard !== undefined ? user.translateDashboard : true,
  translateEmails: user.translateEmails !== undefined ? user.translateEmails : true,
  translateAI: user.translateAI !== undefined ? user.translateAI : true,
  createdAt: user.createdAt,
});

const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
    timestamp: new Date().toISOString(),
    requestId: res.req.headers["x-request-id"] || Math.random().toString(36).slice(2, 11)
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.registerUser({ name, email, password });
  res.status(201).json({
    ok: true,
    user: safeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });
  res.json({
    ok: true,
    user: safeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ ok: false, error: "Refresh token required" });
  }
  const tokens = await authService.refreshAccessToken(refreshToken);
  res.json({
    ok: true,
    ...tokens
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await mongoRepo.updateUserById(req.user._id, { refreshToken: null });
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { 
    name, 
    profilePicture, 
    preferredLanguage,
    autoTranslate,
    translateCaptions,
    translateDashboard,
    translateEmails,
    translateAI
  } = req.body;

  const updated = await mongoRepo.updateUserById(
    req.user._id,
    { 
      ...(name && { name }), 
      ...(profilePicture !== undefined && { profilePicture }),
      ...(preferredLanguage !== undefined && { preferredLanguage }),
      ...(autoTranslate !== undefined && { autoTranslate }),
      ...(translateCaptions !== undefined && { translateCaptions }),
      ...(translateDashboard !== undefined && { translateDashboard }),
      ...(translateEmails !== undefined && { translateEmails }),
      ...(translateAI !== undefined && { translateAI })
    }
  );

  res.json({ ok: true, user: safeUser(updated) });
});

exports.googleCallback = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = issueTokenPair(req.user._id);
  req.user.refreshToken = refreshToken;
  await req.user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  res.redirect(`${clientUrl}/auth/callback?access=${accessToken}&refresh=${refreshToken}`);
});
