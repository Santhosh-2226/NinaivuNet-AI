const pino = require("pino");
const fs = require("fs");
const path = require("path");
const config = require("../config/config");

const logDirectory = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Custom log streams
const appStream = fs.createWriteStream(path.join(logDirectory, "app.log"), { flags: "a" });
const securityStream = fs.createWriteStream(path.join(logDirectory, "security.log"), { flags: "a" });
const meetingStream = fs.createWriteStream(path.join(logDirectory, "meeting.log"), { flags: "a" });
const aiStream = fs.createWriteStream(path.join(logDirectory, "ai.log"), { flags: "a" });

const pinoLogger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime
}, pino.multistream([
  { stream: process.stdout },
  { stream: appStream }
]));

const securityLogger = pino({
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime
}, securityStream);

const meetingLogger = pino({
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime
}, meetingStream);

const aiLogger = pino({
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime
}, aiStream);

module.exports = {
  info: (msg, obj = {}) => {
    pinoLogger.info(obj, msg);
  },
  error: (msg, obj = {}) => {
    pinoLogger.error(obj, msg);
  },
  debug: (msg, obj = {}) => {
    pinoLogger.debug(obj, msg);
  },
  warn: (msg, obj = {}) => {
    pinoLogger.warn(obj, msg);
  },
  
  security: (action, userId, resource, extra = {}) => {
    const payload = { action, userId, resource, ...extra };
    securityLogger.info(payload, `[SECURITY] ${action}`);
  },
  
  meeting: (meetingId, action, extra = {}) => {
    const payload = { meetingId, action, ...extra };
    meetingLogger.info(payload, `[MEETING] ${meetingId} - ${action}`);
  },
  
  ai: (meetingId, pipeline, status, extra = {}) => {
    const payload = { meetingId, pipeline, status, ...extra };
    aiLogger.info(payload, `[AI] ${pipeline} ${status} - ${meetingId}`);
  }
};
