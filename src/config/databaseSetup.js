const logger = require("../utils/logger");

const initializeDatabase = (db) => {
  db.serialize(() => {
    logger.info("Initializing SQLite database schemas and performance indexes...");

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      domain     TEXT DEFAULT 'corporate',
      created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL,
      user_name  TEXT NOT NULL,
      role       TEXT NOT NULL,
      added_at   TEXT,
      preferred_language TEXT DEFAULT 'en',
      PRIMARY KEY (project_id, user_name),
      FOREIGN KEY (project_id) REFERENCES projects(project_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS meetings (
      meeting_id      TEXT PRIMARY KEY,
      project_id      TEXT,
      title           TEXT,
      ingested_at     TEXT,
      summary         TEXT,
      project_health  TEXT,
      study_planner   TEXT,
      assignments     TEXT,
      meeting_language TEXT,
      translated_summary TEXT,
      translated_tasks TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(project_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
      transcript_id TEXT PRIMARY KEY,
      meeting_id    TEXT NOT NULL,
      speaker       TEXT,
      text          TEXT,
      timestamp_ms  INTEGER,
      speaker_language TEXT,
      language_probability REAL,
      translated_text TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      task_id     TEXT PRIMARY KEY,
      meeting_id  TEXT NOT NULL,
      description TEXT,
      owner       TEXT,
      deadline    TEXT,
      priority    TEXT,
      status      TEXT DEFAULT 'open',
      depends_on  TEXT,
      confidence  INTEGER,
      evidence    TEXT,
      speaker     TEXT,
      timestamp   TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS decisions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id  TEXT NOT NULL,
      text        TEXT,
      reason      TEXT,
      discussion  TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      meeting_id    TEXT,
      user_name     TEXT,
      join_time     TEXT,
      leave_time    TEXT,
      speaking_secs INTEGER DEFAULT 0,
      email         TEXT,
      role          TEXT,
      PRIMARY KEY (meeting_id, user_name),
      FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS embeddings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id   TEXT NOT NULL,
      project_id   TEXT,
      speaker      TEXT,
      text         TEXT,
      timestamp_ms INTEGER,
      embedding    TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      log_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   TEXT NOT NULL,
      action    TEXT NOT NULL,
      resource  TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS org_knowledge (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  TEXT,
      category    TEXT,
      content     TEXT,
      source_meeting TEXT,
      created_at  TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ai_feedback (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id   TEXT,
      feedback_type TEXT,
      original     TEXT,
      corrected    TEXT,
      user_name    TEXT,
      created_at   TEXT
    )`);

    // Dynamic Alter Migrations to make schema alterations resilient
    db.run("ALTER TABLE tasks ADD COLUMN confidence INTEGER", () => {});
    db.run("ALTER TABLE tasks ADD COLUMN evidence TEXT", () => {});
    db.run("ALTER TABLE tasks ADD COLUMN speaker TEXT", () => {});
    db.run("ALTER TABLE tasks ADD COLUMN timestamp TEXT", () => {});
    db.run("ALTER TABLE decisions ADD COLUMN reason TEXT", () => {});
    db.run("ALTER TABLE decisions ADD COLUMN discussion TEXT", () => {});
    db.run("ALTER TABLE meetings ADD COLUMN meeting_language TEXT", () => {});
    db.run("ALTER TABLE meetings ADD COLUMN translated_summary TEXT", () => {});
    db.run("ALTER TABLE meetings ADD COLUMN translated_tasks TEXT", () => {});
    db.run("ALTER TABLE transcripts ADD COLUMN speaker_language TEXT", () => {});
    db.run("ALTER TABLE transcripts ADD COLUMN language_probability REAL", () => {});
    db.run("ALTER TABLE transcripts ADD COLUMN translated_text TEXT", () => {});
    db.run("ALTER TABLE project_members ADD COLUMN preferred_language TEXT DEFAULT 'en'", () => {});
    db.run("ALTER TABLE attendance ADD COLUMN email TEXT", () => {});
    db.run("ALTER TABLE attendance ADD COLUMN role TEXT", () => {});

    // SQLite Optimization Indexes (Task 10)
    db.run("CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON transcripts(meeting_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_tasks_meeting ON tasks(meeting_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner)");
    db.run("CREATE INDEX IF NOT EXISTS idx_decisions_meeting ON decisions(meeting_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_embeddings_project ON embeddings(project_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON attendance(meeting_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_name)");
    
    logger.info("SQLite schemas and index optimizations successfully initialized.");
  });
};

module.exports = {
  initializeDatabase
};
