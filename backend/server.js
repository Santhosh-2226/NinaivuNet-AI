require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const connectDB = require("./config/db");
const { globalErrorHandler, AppError } = require("./middleware/errorMiddleware");

const app = express();

// -- Security Hardening (Task 12) --------------------------------------
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 10000, // relaxed limit for local dev to prevent blocking developers
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
    data: null,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      details: "Rate limit exceeded"
    }
  }
});
app.use("/api", limiter);

app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Dynamic Response Formatter (Task 11 & Flat Client Compatibility)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && data.success !== undefined && data.ok !== undefined) {
      return originalJson.call(this, data);
    }
    const isSuccess = data && data.success !== false && data.ok !== false;
    const standard = {
      success: isSuccess,
      message: data && (data.message || (isSuccess ? "Success" : "Operation failed")),
      data: isSuccess ? data : null,
      error: !isSuccess ? (data.error || "Operation failed") : null,
      timestamp: new Date().toISOString(),
      requestId: req.headers["x-request-id"] || Math.random().toString(36).slice(2, 11),
      ok: isSuccess,
      ...(data && typeof data === "object" ? data : {})
    };
    return originalJson.call(this, standard);
  };
  next();
});

// -- Routes ------------------------------------------------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/invitations", require("./routes/invitations"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/meetings", require("./routes/meetings"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/org", require("./routes/orgRoutes"));

// -- Health check ------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Service is healthy",
    data: { service: "NinaivuNet API", version: "2.0.0" },
    error: null,
    timestamp: new Date().toISOString()
  });
});

// -- 404 handler -------------------------------------------------------
app.use((req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
});

// -- Global error handler (Task 5) --------------------------------------
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 NinaivuNet API running at http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Auth:   http://localhost:${PORT}/api/auth`);
      console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? "✅ enabled" : "❌ disabled"}`);
      console.log(`   Email:  ${process.env.SMTP_HOST ? "✅ enabled" : "❌ disabled"}\n`);
    });
  });
}

module.exports = app;
