const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

module.exports = {
  isS3: () => false,

  uploadFile: async (localPath, key) => {
    return localPath;
  },

  downloadFile: async (key, localPath) => {
    return localPath;
  },

  listMeetingFiles: async (meetingId) => {
    return [];
  },

  getSignedUrl: async (key, fallbackRelativeUrl) => {
    return fallbackRelativeUrl || `/${key}`;
  }
};
