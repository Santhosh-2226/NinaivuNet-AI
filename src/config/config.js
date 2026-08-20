const path = require("path");

const env = process.env.NODE_ENV || "development";

const common = {
  env,
  port: parseInt(process.env.PORT || "3000", 10),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  recordingsDir: path.join(__dirname, "../../recordings"),
  dbPath: path.join(__dirname, "../../ninaivunet.db"),
  geminiApiKey: process.env.GEMINI_API_KEY || "AQ.Ab8RN6K4Ln70rWPJVmZyBMTKSaYwwWaZ9Zm7dx5lJq87RIbHNA",
  retentionDays: parseInt(process.env.RETENTION_DAYS || "30", 10),
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "santhoshi.aids2023@citchennai.net",
    pass: process.env.SMTP_PASS || "exjw nczb melf mcwl"
  }
};

const configs = {
  development: {
    ...common,
    logLevel: "debug",
  },
  production: {
    ...common,
    logLevel: "info",
  },
  test: {
    ...common,
    dbPath: ":memory:",
    logLevel: "silent",
  }
};

module.exports = configs[env] || configs.development;
