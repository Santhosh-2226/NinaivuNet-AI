const nodemailer = require("nodemailer");

let transporter = null;

// Only initialise if SMTP credentials are provided
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("📧 Email service initialised");
} else {
  console.log("ℹ️  Email service disabled (SMTP not configured) - invitations will be in-app only");
}

/**
 * Sends an invitation email to the invitee.
 * Silently skips (no error) if SMTP is not configured.
 */
async function sendInvitationEmail({ toEmail, inviterName, projectName, role, acceptUrl }) {
  if (!transporter) return;

  const html = `
    <div style="font-family:Inter,sans-serif;background:#0a0b0f;color:#e2e8f0;padding:40px;border-radius:12px;max-width:480px;margin:auto">
      <h2 style="color:#a29bfe;margin-bottom:8px">NinaivuNet AI</h2>
      <h3 style="margin-bottom:24px">You've been invited to a project</h3>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${projectName}</strong> as a <strong>${role}</strong>.</p>
      <a href="${acceptUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6c5ce7;color:white;border-radius:8px;text-decoration:none;font-weight:600">
        Accept Invitation
      </a>
      <p style="margin-top:24px;color:#64748b;font-size:13px">This invitation expires in 7 days. If you don't have an account yet, you'll be asked to register first.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "NinaivuNet AI <noreply@ninaivunet.ai>",
    to: toEmail,
    subject: `${inviterName} invited you to "${projectName}" on NinaivuNet AI`,
    html,
  });
}

async function sendMeetingScheduledEmail({ toEmail, creatorName, projectName, meetingTitle, dateTime, joinUrl }) {
  if (!transporter) return;

  const dateObj = new Date(dateTime);
  const dateStr = dateObj.toLocaleDateString();
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format dates for Google Calendar render link: YYYYMMDDTHHmmSSZ
  const formatGCalDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };
  const startTime = formatGCalDate(dateObj);
  const endTimeObj = new Date(dateObj.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  const endTime = formatGCalDate(endTimeObj);

  const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(`Project: ${projectName}\nJoin Link: ${joinUrl}`)}&sf=true&output=xml`;

  const html = `
    <div style="font-family:'Inter',sans-serif;background:#0a0b0f;color:#e2e8f0;padding:40px;border-radius:12px;max-width:480px;margin:auto;border:1px solid #1e293b">
      <h2 style="color:#6c5ce7;margin-bottom:8px">NinaivuNet AI</h2>
      <h3 style="margin-bottom:16px;color:#f8fafc">New Meeting Scheduled</h3>
      <p style="font-size:14px;line-height:1.6;color:#94a3b8">
        <strong>${creatorName}</strong> has scheduled a new meeting for your project <strong>${projectName}</strong>.
      </p>
      
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin:24px 0">
        <p style="margin:0 0 8px;font-size:14px">📅 <strong>Title:</strong> ${meetingTitle}</p>
        <p style="margin:0 0 8px;font-size:14px">⏰ <strong>Time:</strong> ${dateStr} at ${timeStr}</p>
      </div>

      <div style="display:flex;gap:12px;margin-top:24px">
        <a href="${joinUrl}" target="_blank" style="display:inline-block;padding:12px 20px;background:#6c5ce7;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Join Meeting
        </a>
        <a href="${gCalUrl}" target="_blank" style="display:inline-block;padding:12px 20px;background:rgba(255,255,255,0.05);color:#a29bfe;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;border:1px solid rgba(162,155,254,0.2)">
          🗓️ Add to Google Calendar
        </a>
      </div>
      <p style="margin-top:24px;color:#64748b;font-size:12px">This is an automated notification. To check notifications inside the app, go to your Dashboard.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "NinaivuNet AI <noreply@ninaivunet.ai>",
    to: toEmail,
    subject: `[NinaivuNet] New Meeting Scheduled: "${meetingTitle}"`,
    html,
  });
}

module.exports = {
  sendInvitationEmail,
  sendMeetingScheduledEmail,
};
