const logger = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  const requestId = req.headers["x-request-id"] || Math.random().toString(36).slice(2, 11);

  logger.error(err.message, { 
    statusCode: err.statusCode, 
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    requestId
  });

  // Standard API format (Task 11)
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    data: null,
    error: err.isOperational ? err.message : "Internal server error",
    timestamp: new Date().toISOString(),
    requestId
  });
};

module.exports = {
  AppError,
  asyncHandler,
  globalErrorHandler
};
