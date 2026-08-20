const mongoRepo = require("../repositories/mongoRepository");
const { AppError } = require("../middleware/errorMiddleware");
const jwtService = require("./jwtService");
const User = require("../models/User");
const Invitation = require("../models/Invitation");
const ProjectMember = require("../models/ProjectMember");

const registerUser = async ({ name, email, password }) => {
  const exists = await mongoRepo.findUserByEmail(email);
  if (exists) {
    throw new AppError("Email already registered", 409);
  }

  const user = await mongoRepo.createUser({ name, email, password });

  // Handle pending invitations (Feature 10/11 backend sync)
  const pendingInvites = await Invitation.find({
    invitedEmail: email,
    status: "pending",
  }).populate("project");

  for (const inv of pendingInvites) {
    if (!inv.project) {
      inv.status = "expired";
      await inv.save();
      continue;
    }
    await ProjectMember.create({
      project: inv.project._id,
      user: user._id,
      role: inv.role,
      addedBy: inv.invitedBy,
    });
    inv.status = "accepted";
    inv.invitedUser = user._id;
    await inv.save();

    // Sync registration membership directly to SQLite database
    try {
      const { syncMember } = require("./sqliteSync");
      await syncMember({
        projectName: inv.project.name,
        userName: email,
        role: inv.role,
        requestedByName: "System"
      });
    } catch (syncErr) {
      console.warn("Failed to sync registration membership to SQLite:", syncErr.message);
    }
  }

  const { accessToken, refreshToken } = jwtService.issueTokenPair(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user || !user.password) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const { accessToken, refreshToken } = jwtService.issueTokenPair(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

const refreshAccessToken = async (token) => {
  let payload;
  try {
    payload = jwtService.verifyRefreshToken(token);
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (!payload || !payload.sub) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await mongoRepo.findUserById(payload.sub).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokens = jwtService.issueTokenPair(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  return tokens;
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken
};
