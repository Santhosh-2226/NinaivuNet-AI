const { verifyAccessToken } = require("../services/jwtService");
const User = require("../models/User");

/**
 * Extracts the JWT from the Authorization header, verifies it,
 * loads the user from MongoDB, and attaches them to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ ok: false, error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, error: "Token expired" });
    }
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
};

module.exports = { protect };
