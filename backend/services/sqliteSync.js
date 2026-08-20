const axios = require("axios");

const SQLITE_URL = "http://localhost:3000/api";

const getSqliteProjectId = (name) => {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const mapRole = (mongoRole) => {
  if (
    mongoRole === "Manager" ||
    mongoRole === "Team Lead" ||
    mongoRole === "Teacher" ||
    mongoRole === "Instructor" ||
    mongoRole === "Professor" ||
    mongoRole === "Course Lead"
  ) {
    return "lead";
  }
  return "member";
};

/**
 * Syncs project creation to the SQLite DB on port 3000
 */
async function syncProject({ name, domain, creatorName }) {
  try {
    await axios.post(`${SQLITE_URL}/projects`, {
      name,
      domain,
      creatorName,
    });
    console.log(`✅ SQLite Sync: Created project "${name}" with creator "${creatorName}"`);
  } catch (err) {
    console.warn(`⚠️ SQLite Sync Warning: Failed to sync project "${name}" to SQLite:`, err.message);
  }
}

/**
 * Syncs member role additions/updates to the SQLite DB on port 3000
 */
async function syncMember({ projectName, userName, role, requestedByName }) {
  try {
    const projectId = getSqliteProjectId(projectName);
    const sqliteRole = mapRole(role);
    await axios.post(`${SQLITE_URL}/projects/${projectId}/members`, {
      userName,
      role: sqliteRole,
      requestedBy: requestedByName,
    });
    console.log(`✅ SQLite Sync: Added member "${userName}" as "${sqliteRole}" to "${projectName}"`);
  } catch (err) {
    console.warn(`⚠️ SQLite Sync Warning: Failed to sync member "${userName}" to SQLite:`, err.message);
  }
}

module.exports = {
  syncProject,
  syncMember,
  getSqliteProjectId,
};
