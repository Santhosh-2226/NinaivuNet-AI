const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const nodemailer = require("nodemailer");
const sqliteRepo = require("../repositories/sqliteRepository");
const redisCache = require("./redisCache");
const logger = require("../utils/logger");
const config = require("../config/config");
const cryptoHelper = require("../../cryptoHelper");
const taskQueue = require("../workers/taskQueue");

const RECORDINGS_DIR = config.recordingsDir;

const autoCombineUnfinishedChunks = (meetingId) => {
  const meetingDir = path.join(RECORDINGS_DIR, meetingId);
  if (!fs.existsSync(meetingDir)) return;

  try {
    const userDirs = fs.readdirSync(meetingDir);
    for (const udir of userDirs) {
      const userPath = path.join(meetingDir, udir);
      if (fs.statSync(userPath).isDirectory()) {
        const combinedPath = path.join(userPath, "combined.webm");
        if (!fs.existsSync(combinedPath)) {
          const chunks = fs.readdirSync(userPath)
            .filter(f => f.startsWith("chunk-") && f.endsWith(".webm"))
            .sort();
          if (chunks.length > 0) {
            logger.info(`Auto-combining ${chunks.length} chunks for unfinished participant: ${udir}`, { meetingId });
            const writeStream = fs.createWriteStream(combinedPath);
            for (const chunk of chunks) {
              const chunkPath = path.join(userPath, chunk);
              const data = fs.readFileSync(chunkPath);
              writeStream.write(data);
            }
            writeStream.end();
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[autoCombineUnfinishedChunks] Error: ${err.message}`, { meetingId });
  }
};

const decryptMeetingFiles = (meetingId) => {
  const meetingDir = path.join(RECORDINGS_DIR, meetingId);
  const decryptedPaths = [];
  if (fs.existsSync(meetingDir)) {
    try {
      const userDirs = fs.readdirSync(meetingDir);
      for (const udir of userDirs) {
        const userPath = path.join(meetingDir, udir);
        if (fs.statSync(userPath).isDirectory()) {
          const combinedPath = path.join(userPath, "combined.webm");
          if (fs.existsSync(combinedPath)) {
            const decBuffer = cryptoHelper.decryptFile(combinedPath);
            if (decBuffer) {
              fs.writeFileSync(combinedPath, decBuffer);
              decryptedPaths.push(combinedPath);
            }
          }
        }
      }
    } catch (err) {
      logger.error(`[decryptMeetingFiles] Error: ${err.message}`, { meetingId });
    }
  }
  return decryptedPaths;
};

const encryptMeetingFiles = (decryptedPaths) => {
  for (const filepath of decryptedPaths) {
    try {
      cryptoHelper.encryptFile(filepath);
    } catch (err) {
      logger.error(`[encryptMeetingFiles] Error: ${err.message}`, { filepath });
    }
  }
};

const triggerAutoIngest = (meetingId) => {
  taskQueue.addJob(`Auto-ingest meeting ${meetingId}`, { meetingId }, async () => {
    logger.ai(meetingId, "auto-ingest", "START");

    const storageService = require("./storageService");
    if (storageService.isS3()) {
      try {
        logger.info(`[S3-Ingest] Downloading recordings from S3 for meeting ${meetingId}...`);
        const s3Keys = await storageService.listMeetingFiles(meetingId);
        for (const key of s3Keys) {
          const localPath = path.join(RECORDINGS_DIR, key.replace("recordings/", ""));
          await storageService.downloadFile(key, localPath);
        }
      } catch (s3DownloadErr) {
        logger.error(`[S3-Ingest-Error] Failed to download meeting files from S3: ${s3DownloadErr.message}`);
      }
    }

    autoCombineUnfinishedChunks(meetingId);
    const decryptedPaths = decryptMeetingFiles(meetingId);
    const projectSlug = meetingId.includes("_") ? meetingId.split("_")[0] : null;
    let domain = "corporate";
    if (projectSlug) {
      domain = await sqliteRepo.getProjectDomain(projectSlug);
    }

    return new Promise((resolve, reject) => {
      exec(`python transcribe.py ${meetingId} --model base`, (err, stdout, stderr) => {
        encryptMeetingFiles(decryptedPaths);
        if (err) {
          logger.ai(meetingId, "whisper-transcription", "FAILED", { error: err.message });
          return reject(err);
        }
        logger.ai(meetingId, "whisper-transcription", "SUCCESS");

        const preprocessTranslations = async () => {
          const transcriptPath = path.join(RECORDINGS_DIR, meetingId, "transcript.json");
          if (fs.existsSync(transcriptPath)) {
            try {
              const translationService = require("../../backend/services/translationService");
              const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
              const segments = transcriptData.segments || [];
              for (const seg of segments) {
                if (seg.speaker_language && seg.speaker_language !== "en") {
                  logger.info(`Translating segment: ${seg.text.slice(0, 30)}...`, { meetingId });
                  seg.translated_text = await translationService.translateText(seg.text, "en");
                }
              }
              fs.writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2), "utf-8");
            } catch (transErr) {
              logger.error(`Translation preprocessing failed: ${transErr.message}`, { meetingId });
            }
          }
        };

        preprocessTranslations().then(() => {
          exec(`python llm_pipeline.py ${meetingId} --domain ${domain}`, async (err2) => {
            if (err2) {
              logger.ai(meetingId, "llm-pipeline", "FAILED", { error: err2.message });
              return reject(err2);
            }
            logger.ai(meetingId, "llm-pipeline", "SUCCESS");

            try {
              const meetingDir = path.join(RECORDINGS_DIR, meetingId);
              const transcriptPath = path.join(meetingDir, "transcript.json");
              const intelligencePath = path.join(meetingDir, "meeting_intelligence.json");

              if (fs.existsSync(transcriptPath)) {
                const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
                const intelligenceData = fs.existsSync(intelligencePath)
                  ? JSON.parse(fs.readFileSync(intelligencePath, "utf-8"))
                  : null;

                // Call core DB operations
                await ingestMeetingIntoDb({
                  meetingId,
                  projectId: projectSlug,
                  transcriptData,
                  intelligenceData
                });

                exec(`python rag_indexer.py ${meetingId}${projectSlug ? ` --project-id ${projectSlug}` : ""}`, async (err3) => {
                  if (err3) {
                    logger.warn(`RAG indexing skipped for ${meetingId}: ${err3.message}`);
                  } else {
                    logger.info(`RAG knowledge base updated for ${meetingId}`);
                  }

                  try {
                    cryptoHelper.encryptFile(transcriptPath);
                    if (fs.existsSync(intelligencePath)) cryptoHelper.encryptFile(intelligencePath);
                    const txtPath = path.join(meetingDir, "transcript.txt");
                    if (fs.existsSync(txtPath)) cryptoHelper.encryptFile(txtPath);
                    logger.info("Successfully encrypted post-meeting assets at rest", { meetingId });
                  } catch (fileEncryptErr) {
                    logger.error(`Failed to encrypt final files: ${fileEncryptErr.message}`);
                  }
                  resolve();
                });
              } else {
                reject(new Error(`transcript.json not found for ${meetingId}`));
              }
            } catch (ingestErr) {
              logger.error(`Database ingest failed: ${ingestErr.message}`);
              reject(ingestErr);
            }
          });
        });
      });
    });
  });
};

const ingestMeetingIntoDb = async ({ meetingId, projectId, transcriptData, intelligenceData }) => {
  await sqliteRepo.run("BEGIN TRANSACTION");
  try {
    const healthStr = intelligenceData?.project_health ? JSON.stringify(intelligenceData.project_health) : null;
    const studyStr = intelligenceData?.study_planner ? JSON.stringify(intelligenceData.study_planner) : null;
    const assignmentsStr = intelligenceData?.assignments ? JSON.stringify(intelligenceData.assignments) : null;
    const meetingLanguage = transcriptData?.meeting_language || intelligenceData?.meeting_language || "en";
    const translatedSummary = intelligenceData?.translated_summary || null;
    const translatedTasks = intelligenceData?.translated_tasks ? JSON.stringify(intelligenceData.translated_tasks) : null;
    const meetingTitle = intelligenceData?.lecture_topic || meetingId;

    await sqliteRepo.upsertMeeting({
      meetingId,
      projectId: projectId || null,
      title: meetingTitle,
      summary: intelligenceData?.summary || null,
      healthStr,
      studyStr,
      assignmentsStr,
      meetingLanguage,
      translatedSummary,
      translatedTasks
    });

    await sqliteRepo.clearTranscripts(meetingId);
    await sqliteRepo.clearTasks(meetingId);
    await sqliteRepo.clearDecisions(meetingId);

    for (const seg of transcriptData?.segments || []) {
      await sqliteRepo.insertTranscript({
        transcriptId: seg.transcript_id,
        meetingId: seg.meeting_id,
        speaker: seg.speaker,
        text: seg.text,
        timestampMs: seg.timestamp_ms,
        speakerLanguage: seg.speaker_language,
        languageProbability: seg.language_probability,
        translatedText: seg.translated_text
      });
    }

    for (const task of intelligenceData?.action_items || []) {
      await sqliteRepo.insertTask({
        taskId: task.task_id,
        meetingId: task.meeting_id,
        description: task.description,
        owner: task.owner,
        deadline: task.deadline,
        priority: task.priority,
        status: task.status,
        dependsOn: task.depends_on,
        confidence: task.confidence,
        evidence: task.evidence,
        speaker: task.speaker,
        timestamp: task.timestamp
      });
    }

    for (const decision of intelligenceData?.decisions || []) {
      const decText = typeof decision === "object" ? decision.text : decision;
      const decReason = typeof decision === "object" ? decision.reason : null;
      const decDiscussion = typeof decision === "object" ? decision.discussion : null;
      await sqliteRepo.insertDecision({ meetingId, text: decText, reason: decReason, discussion: decDiscussion });
    }

    await sqliteRepo.run("COMMIT");
    
    // Invalidate caches
    await redisCache.del(`meeting:${meetingId}`);
    await redisCache.del(`meetings:${projectId}`);
  } catch (err) {
    await sqliteRepo.run("ROLLBACK");
    throw err;
  }
};

const sendReminders = async ({ meetingId, projectId, userName, memberEmails, creatorEmail }) => {
  const role = await sqliteRepo.resolveRole(projectId, userName);
  if (role !== "lead" && role !== "Manager" && role !== "Team Lead") {
    throw new Error("Only a project lead can send task reminders");
  }

  const meetingDetails = await getMeetingDetails(meetingId);
  if (!meetingDetails) throw new Error("Meeting not found");

  const openTasks = meetingDetails.tasks.filter(t => t.status === "open");
  if (openTasks.length === 0) return { sentCount: 0, message: "No open tasks to remind owners of!" };

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });

  let sentCount = 0;
  for (const task of openTasks) {
    let ownerEmail = null;
    if (task.owner && memberEmails) {
      ownerEmail = memberEmails[task.owner.toLowerCase().trim()];
    }
    if (!ownerEmail) {
      ownerEmail = creatorEmail || config.smtp.user;
    }

    const mailOptions = {
      from: `"NinaivuNet AI Task Agent" <${config.smtp.user}>`,
      to: ownerEmail,
      subject: `?? Task Deadline Reminder: [${task.priority.toUpperCase()}] "${task.description}"`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; border-radius: 8px;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Action Item Deadline Warning</h2>
          <p>Hi <strong>${task.owner || "Team Member"}</strong>,</p>
          <p>This is an automated notification warning you of an approaching action item commitment deadline recorded during meeting <strong>${meetingDetails.title}</strong>.</p>
          <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0;">
            <p style="margin: 0;"><strong>Task Description:</strong> ${task.description}</p>
            <p style="margin: 5px 0 0 0;"><strong>Deadline:</strong> ${task.deadline || "ASAP"}</p>
            <p style="margin: 5px 0 0 0;"><strong>Priority Level:</strong> <span style="color: ${task.priority === 'high' ? '#ef4444' : '#f59e0b'}">${task.priority.toUpperCase()}</span></p>
          </div>
          <p>Please update your progress in the NinaivuNet AI workspace.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This reminder email was dispatched automatically via the project governance rules on behalf of project coordinator ${userName}.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    sentCount++;
  }

  return { sentCount, message: `Dispatched ${sentCount} task deadline reminders successfully!` };
};

const getMeetingDetails = async (meetingId, { role, userName } = {}) => {
  const cacheKey = `meeting:${meetingId}:${role || 'all'}:${userName || 'all'}`;
  const cached = await redisCache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const meeting = await sqliteRepo.getMeeting(meetingId);
  if (!meeting) return null;

  const transcripts = await sqliteRepo.getTranscripts(meetingId);
  
  let tasks;
  if (role === "member" && userName) {
    tasks = await sqliteRepo.getTasksForUser(meetingId, userName);
  } else {
    tasks = await sqliteRepo.getTasks(meetingId);
  }

  const decisions = await sqliteRepo.getDecisions(meetingId);

  let projectHealthObj = null;
  let studyPlannerObj = null;
  let assignmentsObj = null;

  try { if (meeting.project_health) projectHealthObj = JSON.parse(meeting.project_health); } catch(e) {}
  try { if (meeting.study_planner) studyPlannerObj = JSON.parse(meeting.study_planner); } catch(e) {}
  try { if (meeting.assignments) assignmentsObj = JSON.parse(meeting.assignments); } catch(e) {}

  const parsedTasks = tasks.map(t => {
    let dependsOnObj = null;
    try { if (t.depends_on) dependsOnObj = JSON.parse(t.depends_on); } catch(e) {}
    return { ...t, depends_on: dependsOnObj };
  });

  const decryptedTranscripts = transcripts.map((t) => ({
    ...t,
    text: cryptoHelper.decryptText(t.text),
    translated_text: t.translated_text ? cryptoHelper.decryptText(t.translated_text) : null
  }));

  const decryptedDecisions = decisions.map((d) => ({
    text: cryptoHelper.decryptText(d.text),
    reason: cryptoHelper.decryptText(d.reason),
    discussion: cryptoHelper.decryptText(d.discussion)
  }));

  const result = {
    ...meeting,
    project_health: projectHealthObj,
    study_planner: studyPlannerObj,
    assignments: assignmentsObj,
    transcripts: decryptedTranscripts,
    tasks: parsedTasks,
    decisions: decryptedDecisions
  };

  await redisCache.set(cacheKey, JSON.stringify(result), 600); // 10 minutes TTL
  return result;
};

const applyDataRetentionPolicy = () => {
  logger.info(`Scanning raw audio recordings for files older than ${config.retentionDays} days...`);
  if (!fs.existsSync(RECORDINGS_DIR)) return;

  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;

  try {
    const meetingDirs = fs.readdirSync(RECORDINGS_DIR);
    let purgedCount = 0;
    for (const meetingId of meetingDirs) {
      const meetingPath = path.join(RECORDINGS_DIR, meetingId);
      if (fs.statSync(meetingPath).isDirectory()) {
        const stats = fs.statSync(meetingPath);
        const ageDays = (now - stats.birthtime) / msInDay;
        if (ageDays > config.retentionDays) {
          const userDirs = fs.readdirSync(meetingPath);
          for (const udir of userDirs) {
            const userPath = path.join(meetingPath, udir);
            if (fs.statSync(userPath).isDirectory()) {
              const combinedPath = path.join(userPath, "combined.webm");
              if (fs.existsSync(combinedPath)) {
                fs.unlinkSync(combinedPath);
                purgedCount++;
              }
            }
          }
        }
      }
    }
    if (purgedCount > 0) {
      logger.info(`Purged ${purgedCount} expired raw audio files according to retention policy.`);
    } else {
      logger.info("No expired raw audio recordings found.");
    }
  } catch (e) {
    logger.error(`Error applying data retention policy: ${e.message}`);
  }
};

module.exports = {
  decryptMeetingFiles,
  encryptMeetingFiles,
  triggerAutoIngest,
  ingestMeetingIntoDb,
  sendReminders,
  getMeetingDetails,
  applyDataRetentionPolicy
};
