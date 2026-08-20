const sqlite3 = require("sqlite3").verbose();
const cryptoHelper = require("../../cryptoHelper");
const config = require("../config/config");
const logger = require("../utils/logger");

let db = null;
const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(config.dbPath);
    const { initializeDatabase } = require("../config/databaseSetup");
    initializeDatabase(db);
  }
  return db;
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) {
        logger.error(`SQLite run error: ${err.message}`, { sql });
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) {
        logger.error(`SQLite get error: ${err.message}`, { sql });
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        logger.error(`SQLite all error: ${err.message}`, { sql });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  get db() { return getDb(); },
  run,
  get,
  all,
  
  createProject: async ({ projectId, name, domain }) => {
    await run(
      `INSERT OR IGNORE INTO projects (project_id, name, domain, created_at) VALUES (?, ?, ?, ?)`,
      [projectId, name, domain || "corporate", new Date().toISOString()]
    );
  },

  deleteProjectCascading: async (projectId) => {
    await run(`DELETE FROM transcripts WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM tasks WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM decisions WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM attendance WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM embeddings WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM ai_feedback WHERE meeting_id IN (SELECT meeting_id FROM meetings WHERE project_id = ?)`, [projectId]);
    await run(`DELETE FROM meetings WHERE project_id = ?`, [projectId]);
    await run(`DELETE FROM project_members WHERE project_id = ?`, [projectId]);
    await run(`DELETE FROM org_knowledge WHERE project_id = ?`, [projectId]);
    await run(`DELETE FROM audit_logs WHERE resource LIKE ?`, [`%Project: ${projectId}%`]);
    await run(`DELETE FROM projects WHERE project_id = ?`, [projectId]);
  },

  addProjectMember: async ({ projectId, userName, role }) => {
    await run(
      `INSERT INTO project_members (project_id, user_name, role, added_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(project_id, user_name) DO UPDATE SET role = excluded.role`,
      [projectId, userName, role, new Date().toISOString()]
    );
  },

  removeProjectMember: async ({ projectId, userName }) => {
    await run(
      `DELETE FROM project_members WHERE project_id = ? AND user_name = ?`,
      [projectId, userName]
    );
  },

  listProjectMembers: (projectId) => {
    return all(
      `SELECT user_name, role, added_at FROM project_members WHERE project_id = ?`,
      [projectId]
    );
  },

  listProjectsForUser: (userName) => {
    return all(
      `SELECT p.project_id, p.name, p.domain, pm.role
       FROM project_members pm
       JOIN projects p ON p.project_id = pm.project_id
       WHERE pm.user_name = ?
       ORDER BY p.created_at DESC`,
      [userName]
    );
  },

  resolveRole: async (projectId, userName) => {
    const row = await get(
      `SELECT role FROM project_members WHERE project_id = ? AND user_name = ?`,
      [projectId, userName]
    );
    return row ? row.role : null;
  },

  getMeeting: async (meetingId) => {
    return get("SELECT * FROM meetings WHERE meeting_id = ?", [meetingId]);
  },

  upsertMeeting: async ({ meetingId, projectId, title, summary, healthStr, studyStr, assignmentsStr, meetingLanguage, translatedSummary, translatedTasks }) => {
    const existing = await get("SELECT meeting_id FROM meetings WHERE meeting_id = ?", [meetingId]);
    if (existing) {
      await run(
        `UPDATE meetings SET project_id = ?, title = ?, ingested_at = ?, summary = ?, project_health = ?, study_planner = ?, assignments = ?, meeting_language = ?, translated_summary = ?, translated_tasks = ? WHERE meeting_id = ?`,
        [projectId, title, new Date().toISOString(), summary, healthStr, studyStr, assignmentsStr, meetingLanguage, translatedSummary, translatedTasks, meetingId]
      );
    } else {
      await run(
        `INSERT INTO meetings (meeting_id, project_id, title, ingested_at, summary, project_health, study_planner, assignments, meeting_language, translated_summary, translated_tasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [meetingId, projectId, title, new Date().toISOString(), summary, healthStr, studyStr, assignmentsStr, meetingLanguage, translatedSummary, translatedTasks]
      );
    }
  },

  clearTranscripts: (meetingId) => {
    return run("DELETE FROM transcripts WHERE meeting_id = ?", [meetingId]);
  },

  clearTasks: (meetingId) => {
    return run("DELETE FROM tasks WHERE meeting_id = ?", [meetingId]);
  },

  clearDecisions: (meetingId) => {
    return run("DELETE FROM decisions WHERE meeting_id = ?", [meetingId]);
  },

  insertTranscript: ({ transcriptId, meetingId, speaker, text, timestampMs, speakerLanguage, languageProbability, translatedText }) => {
    const encryptedText = cryptoHelper.encryptText(text);
    const encryptedTransText = translatedText ? cryptoHelper.encryptText(translatedText) : null;
    return run(
      `INSERT INTO transcripts (transcript_id, meeting_id, speaker, text, timestamp_ms, speaker_language, language_probability, translated_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transcriptId, meetingId, speaker, encryptedText, timestampMs, speakerLanguage || null, languageProbability || null, encryptedTransText]
    );
  },

  insertTask: ({ taskId, meetingId, description, owner, deadline, priority, status, dependsOn, confidence, evidence, speaker, timestamp }) => {
    return run(
      `INSERT INTO tasks (task_id, meeting_id, description, owner, deadline, priority, status, depends_on, confidence, evidence, speaker, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, meetingId, description, owner, deadline, priority, status, dependsOn ? JSON.stringify(dependsOn) : null, confidence || null, evidence || null, speaker || null, timestamp || null]
    );
  },

  insertDecision: ({ meetingId, text, reason, discussion }) => {
    const encryptedText = cryptoHelper.encryptText(text);
    const encryptedReason = cryptoHelper.encryptText(reason);
    const encryptedDiscussion = cryptoHelper.encryptText(discussion);
    return run(
      "INSERT INTO decisions (meeting_id, text, reason, discussion) VALUES (?, ?, ?, ?)",
      [meetingId, encryptedText, encryptedReason, encryptedDiscussion]
    );
  },

  listMeetings: ({ projectId }) => {
    const sql = `
      SELECT m.*,
        COALESCE(
          (SELECT ROUND((MAX(timestamp_ms) - MIN(timestamp_ms)) / 60000.0, 1) FROM transcripts WHERE meeting_id = m.meeting_id AND timestamp_ms > 0),
          (SELECT ROUND((JULIANDAY(MAX(leave_time)) - JULIANDAY(MIN(join_time))) * 1440.0, 1) FROM attendance WHERE meeting_id = m.meeting_id AND leave_time IS NOT NULL),
          12.0
        ) as duration_mins
      FROM meetings m
      ${projectId ? "WHERE m.project_id = ?" : ""}
      ORDER BY m.ingested_at DESC
    `;
    return all(sql, projectId ? [projectId] : []);
  },

  listTasksForUser: (userName) => {
    return all(
      `SELECT t.*, m.title as meeting_title, m.project_id
       FROM tasks t
       JOIN meetings m ON m.meeting_id = t.meeting_id
       WHERE t.owner = ? AND t.status = 'open'
       ORDER BY t.deadline ASC`,
      [userName]
    );
  },

  updateTaskStatus: (taskId, status) => {
    return run(`UPDATE tasks SET status = ? WHERE task_id = ?`, [status, taskId]);
  },

  getTranscripts: (meetingId) => {
    return all("SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY timestamp_ms ASC", [meetingId]);
  },

  getTasks: (meetingId) => {
    return all("SELECT * FROM tasks WHERE meeting_id = ?", [meetingId]);
  },

  getTasksForUser: (meetingId, userName) => {
    return all("SELECT * FROM tasks WHERE meeting_id = ? AND owner = ?", [meetingId, userName]);
  },

  getDecisions: (meetingId) => {
    return all("SELECT text, reason, discussion FROM decisions WHERE meeting_id = ?", [meetingId]);
  },

  searchTranscripts: async (projectId) => {
    let rows;
    if (projectId) {
      rows = await all(
        `SELECT tr.transcript_id, tr.meeting_id, tr.speaker, tr.text, tr.timestamp_ms
         FROM transcripts tr
         JOIN meetings m ON m.meeting_id = tr.meeting_id
         WHERE m.project_id = ?
         ORDER BY tr.timestamp_ms DESC`,
        [projectId]
      );
    } else {
      rows = await all(
        `SELECT transcript_id, meeting_id, speaker, text, timestamp_ms
         FROM transcripts ORDER BY timestamp_ms DESC`
      );
    }
    return rows.map(r => ({
      ...r,
      text: cryptoHelper.decryptText(r.text)
    }));
  },

  clearEmbeddings: (meetingId) => {
    return run(`DELETE FROM embeddings WHERE meeting_id = ?`, [meetingId]);
  },

  insertEmbedding: ({ meetingId, projectId, speaker, text, timestampMs, embedding }) => {
    const encryptedText = cryptoHelper.encryptText(text);
    const encryptedEmbedding = cryptoHelper.encryptText(embedding);
    return run(
      `INSERT INTO embeddings (meeting_id, project_id, speaker, text, timestamp_ms, embedding)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [meetingId, projectId || null, speaker || null, encryptedText, timestampMs || 0, encryptedEmbedding]
    );
  },

  queryEmbeddingsForProject: async (projectId) => {
    let rows;
    if (projectId) {
      rows = await all(
        `SELECT id, meeting_id, speaker, text, timestamp_ms, embedding
         FROM embeddings WHERE project_id = ?`,
        [projectId]
      );
    } else {
      rows = await all(`SELECT id, meeting_id, speaker, text, timestamp_ms, embedding FROM embeddings`);
    }
    return rows.map(r => ({
      ...r,
      text: cryptoHelper.decryptText(r.text),
      embedding: cryptoHelper.decryptText(r.embedding)
    }));
  },

  getProjectDomain: async (projectId) => {
    const row = await get("SELECT domain FROM projects WHERE project_id = ?", [projectId]);
    return row ? row.domain : "corporate";
  },

  getProjectDecisions: (projectId) => {
    return all(
      `SELECT d.text, d.reason, d.discussion, m.ingested_at, m.title, m.meeting_id
       FROM decisions d
       JOIN meetings m ON d.meeting_id = m.meeting_id
       WHERE m.project_id = ?
       ORDER BY m.ingested_at DESC`,
      [projectId]
    );
  },

  getMeetingAttendance: (meetingId) => {
    return all("SELECT * FROM attendance WHERE meeting_id = ? ORDER BY user_name ASC", [meetingId]);
  },

  logAttendance: async ({ meetingId, userName, joinTime, leaveTime, speakingSecs, email, role }) => {
    const existing = await get("SELECT meeting_id FROM attendance WHERE meeting_id = ? AND user_name = ?", [meetingId, userName]);
    if (existing) {
      if (leaveTime) {
        await run(
          `UPDATE attendance SET leave_time = ? WHERE meeting_id = ? AND user_name = ?`,
          [leaveTime, meetingId, userName]
        );
      }
      if (speakingSecs !== undefined) {
        await run(
          `UPDATE attendance SET speaking_secs = speaking_secs + ? WHERE meeting_id = ? AND user_name = ?`,
          [speakingSecs, meetingId, userName]
        );
      }
      if (email) {
        await run(
          `UPDATE attendance SET email = ? WHERE meeting_id = ? AND user_name = ?`,
          [email, meetingId, userName]
        );
      }
      if (role) {
        await run(
          `UPDATE attendance SET role = ? WHERE meeting_id = ? AND user_name = ?`,
          [role, meetingId, userName]
        );
      }
    } else {
      await run(
        `INSERT INTO attendance (meeting_id, user_name, join_time, leave_time, speaking_secs, email, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [meetingId, userName, joinTime || new Date().toISOString(), leaveTime || null, speakingSecs || 0, email || null, role || null]
      );
    }
  },

  logAudit: ({ userId, action, resource }) => {
    return run(
      `INSERT INTO audit_logs (user_id, action, resource, timestamp) VALUES (?, ?, ?, ?)`,
      [userId, action, resource, new Date().toISOString()]
    );
  },

  getAuditLogs: () => {
    return all(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`);
  },

  getProject: (projectId) => {
    return get(`SELECT * FROM projects WHERE project_id = ?`, [projectId]);
  },

  deleteMeeting: async (meetingId) => {
    await run(`DELETE FROM transcripts WHERE meeting_id = ?`, [meetingId]);
    await run(`DELETE FROM tasks WHERE meeting_id = ?`, [meetingId]);
    await run(`DELETE FROM decisions WHERE meeting_id = ?`, [meetingId]);
    await run(`DELETE FROM attendance WHERE meeting_id = ?`, [meetingId]);
    await run(`DELETE FROM embeddings WHERE meeting_id = ?`, [meetingId]);
    await run(`DELETE FROM meetings WHERE meeting_id = ?`, [meetingId]);
  }
};
