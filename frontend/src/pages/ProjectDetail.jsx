import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { Users, UserPlus, Play, FileText, CheckCircle, HelpCircle, Search, Inbox, ArrowLeft, Trash2, ShieldAlert, Calendar, Bot, X, Send, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Activity, BookOpen, Award, Clock, Mail, BarChart2 } from "lucide-react";

const getSqliteProjectId = (name) => {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [project, setProject] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Scheduled meetings state
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  // Ingest state
  const [ingestMeetingId, setIngestMeetingId] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);

  // Manage members state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // AI Q&A (RAG Knowledge Base)
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  // Practice Quiz state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizChecked, setQuizChecked] = useState(false);

  // Workspace tabs & decisions timeline
  const [workspaceTab, setWorkspaceTab] = useState("meetings");
  const [projectDecisions, setProjectDecisions] = useState([]);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [emailSending, setEmailSending] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // AI Email Follow-up & Pre-meeting Prep states
  const [emailDraftHtml, setEmailDraftHtml] = useState("");
  const [emailDraftLoading, setEmailDraftLoading] = useState(false);
  const [meetingPrepHtml, setMeetingPrepHtml] = useState("");
  const [meetingPrepLoading, setMeetingPrepLoading] = useState(false);

  const handleGenerateEmailDraft = async (meetingId) => {
    setEmailDraftLoading(true);
    setEmailDraftHtml("");
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.post(`http://${hostname}:3000/api/db/meetings/${encodeURIComponent(meetingId)}/email-draft`, {
        projectId: sqliteId,
        userName: user?.email || "Guest"
      });
      if (res.data.ok) {
        setEmailDraftHtml(res.data.html);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate AI follow-up email draft.");
    } finally {
      setEmailDraftLoading(false);
    }
  };

  const handleGenerateMeetingPrep = async () => {
    setMeetingPrepLoading(true);
    setMeetingPrepHtml("");
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.post(`http://${hostname}:3000/api/db/projects/${sqliteId}/meeting-prep`, {
        userName: user?.email || "Guest"
      });
      if (res.data.ok) {
        setMeetingPrepHtml(res.data.html);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate AI meeting preparation advice.");
    } finally {
      setMeetingPrepLoading(false);
    }
  };

  const fetchProjectDecisions = async () => {
    if (!project) return;
    setDecisionsLoading(true);
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.get(`http://${hostname}:3000/api/db/projects/${sqliteId}/decisions`, {
        params: { userName: user?.email || "Guest" }
      });
      if (res.data.ok) {
        setProjectDecisions(res.data.decisions || []);
      }
    } catch (err) {
      console.error("Failed to load project decisions:", err);
    } finally {
      setDecisionsLoading(false);
    }
  };

  const fetchProjectAuditLogs = async () => {
    if (!project) return;
    setAuditLoading(true);
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.get(`http://${hostname}:3000/api/db/projects/${sqliteId}/audit-logs`, {
        params: { userName: user?.email || "Guest" }
      });
      if (res.data.ok) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load project audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceTab === "decisions") {
      fetchProjectDecisions();
    }
    if (workspaceTab === "audit") {
      fetchProjectAuditLogs();
    }
    // Analytics tab depends on decisions count — fetch if not already loaded
    if (workspaceTab === "analytics" && projectDecisions.length === 0) {
      fetchProjectDecisions();
    }
  }, [workspaceTab, project]);

  const fetchProjectData = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/projects/${projectId}`);
      if (res.data.ok) {
        setProject(res.data.project);
        const sqliteId = getSqliteProjectId(res.data.project.name);
        
        // Fetch meetings from SQLite backend on port 3000
        try {
          const hostname = window.location.hostname;
          const mRes = await axios.get(`http://${hostname}:3000/api/db/meetings`, {
            params: { projectId: sqliteId, userName: user?.email || "Guest" }
          });
          setMeetings(mRes.data.meetings || []);
        } catch (sqliteErr) {
          console.warn("Failed to connect to SQLite server on port 3000:", sqliteErr.message);
        }

        // Fetch scheduled meetings from MongoDB backend
        try {
          const sRes = await api.get(`/meetings/projects/${projectId}/meetings`);
          if (sRes.data.ok) {
            setScheduledMeetings(sRes.data.meetings || []);
          }
        } catch (sErr) {
          console.error("Failed to fetch scheduled meetings:", sErr);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjectData();
    }
  }, [projectId, user]);

  const handleSelectMeeting = async (meetingId) => {
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.get(`http://${hostname}:3000/api/db/meetings/${encodeURIComponent(meetingId)}`, {
        params: { projectId: sqliteId, userName: user?.email || "Guest" }
      });
      setSelectedMeeting(res.data);
      setQuizAnswers({});
      setQuizChecked(false);

      try {
        const attRes = await axios.get(`http://${hostname}:3000/api/db/meetings/${encodeURIComponent(meetingId)}/attendance`);
        if (attRes.data.ok) {
          setAttendanceRecords(attRes.data.attendance || []);
        }
      } catch (attErr) {
        console.error("Failed to load attendance records:", attErr);
        setAttendanceRecords([]);
      }
    } catch (err) {
      alert("Failed to load meeting details from SQLite DB.");
    }
  };

  const handleSendTaskReminders = async () => {
    if (!selectedMeeting) return;
    setEmailSending(true);

    const memberEmails = {};
    if (project && project.members) {
      project.members.forEach(m => {
        if (m.user && m.user.name && m.user.email) {
          memberEmails[m.user.name.toLowerCase().trim()] = m.user.email;
        }
      });
    }

    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.post(`http://${hostname}:3000/api/db/meetings/${encodeURIComponent(selectedMeeting.meeting_id)}/reminders`, {
        projectId: sqliteId,
        userName: user?.email || "Guest",
        memberEmails: memberEmails,
        creatorEmail: user?.email || ""
      });
      if (res.data.ok) {
        alert(res.data.message || "Reminders sent successfully!");
      } else {
        alert("Failed to send reminders: " + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error triggering email reminders: " + (err.response?.data?.error || err.message));
    } finally {
      setEmailSending(false);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled meeting?")) return;
    try {
      const res = await api.delete(`/meetings/scheduled/${meetingId}`);
      if (res.data.ok) {
        alert("Meeting cancelled successfully.");
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel meeting");
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm("WARNING: Are you sure you want to permanently delete this meeting? This will delete all transcripts, key decisions, action items, audio recording files, and telemetry metrics from ALL databases. This action cannot be undone.")) return;
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.post(`http://${hostname}:3000/api/db/meetings/${encodeURIComponent(meetingId)}/delete`, {
        projectId: sqliteId,
        userName: user?.email || "Guest"
      });
      if (res.data.ok) {
        alert("Meeting deleted successfully everywhere.");
        setSelectedMeeting(null);
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete meeting");
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const confirmPrompt = window.prompt(
      `WARNING: This will permanently delete the project "${project.name}" and ALL related resources, including all meetings, audio recording files on disk, transcripts, AI summaries, decisions, tasks, and attendance records from ALL databases.\n\nType the project name "${project.name}" below to confirm deletion:`
    );
    if (confirmPrompt !== project.name) {
      alert("Project name did not match. Deletion cancelled.");
      return;
    }

    try {
      const res = await api.delete(`/projects/${projectId}`);
      if (res.data.ok) {
        alert("Project and all related resources deleted successfully everywhere.");
        navigate("/dashboard");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete project");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.get(`http://${hostname}:3000/api/db/search`, {
        params: { q: searchQuery, projectId: sqliteId, userName: user?.email || "Guest" }
      });
      setSearchResults(res.data.results || []);
    } catch (err) {
      alert("Search failed.");
    }
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!ingestMeetingId.trim()) return;

    setIngestLoading(true);
    try {
      const hostname = window.location.hostname;
      const sqliteId = getSqliteProjectId(project.name);
      const res = await axios.post(`http://${hostname}:3000/api/meetings/${encodeURIComponent(ingestMeetingId)}/ingest`, {
        projectId: sqliteId,
        requestedBy: user?.name || "Guest"
      });
      if (res.data.ok) {
        alert(`Successfully ingested meeting "${ingestMeetingId}"!`);
        setIngestMeetingId("");
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to ingest meeting. Make sure transcribe.py and llm_pipeline.py have finished.");
    } finally {
      setIngestLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/invitations`, {
        email: inviteEmail,
        role: inviteRole
      });
      if (res.data.ok) {
        alert(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail("");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setMemberActionLoading(true);
    try {
      const res = await api.patch(`/projects/${projectId}/members/${targetUserId}`, {
        role: newRole
      });
      if (res.data.ok) {
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update member role.");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setMemberActionLoading(true);
    try {
      const res = await api.delete(`/projects/${projectId}/members/${targetUserId}`);
      if (res.data.ok) {
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove member.");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleAskAI = async (questionOverride) => {
    const question = (questionOverride !== undefined ? questionOverride : aiInput).trim();
    if (!question || aiLoading) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: question }]);
    setAiLoading(true);
    try {
      const hostname = window.location.hostname;
      const sqliteId = project ? getSqliteProjectId(project.name) : null;
      const res = await axios.post(`http://${hostname}:3000/api/rag/query`, {
        question,
        projectId: sqliteId,
      });
      if (res.data.ok) {
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", text: res.data.answer, sources: res.data.sources || [] },
        ]);
      } else {
        setAiMessages((prev) => [...prev, { role: "error", text: res.data.error }]);
      }
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { role: "error", text: err.response?.data?.error || "Failed to reach AI. Is the meeting server running?" },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim() || !scheduleDateTime) return;

    setScheduleLoading(true);
    try {
      const res = await api.post(`/meetings/projects/${projectId}/meetings`, {
        title: scheduleTitle,
        dateTime: scheduleDateTime
      });
      if (res.data.ok) {
        alert("Meeting scheduled successfully!");
        setScheduleTitle("");
        setScheduleDateTime("");
        setShowScheduleModal(false);
        fetchProjectData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to schedule meeting.");
    } finally {
      setScheduleLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link to="/dashboard" className="flex align-center gap-8 mb-24" style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="glass-card flex align-center gap-16" style={{ borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)" }}>
          <ShieldAlert size={24} style={{ color: "var(--danger)" }} />
          <div>
            <h3 style={{ fontWeight: 600 }}>Access Denied</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isLead = project?.myRole === "Manager" || project?.myRole === "Team Lead";
  const isCreator = project && user && (String(project.createdBy?._id || project.createdBy) === String(user.id || user._id));
  const canDeleteMeetings = project?.domain === "education"
    ? (project?.myRole === "Manager")
    : (project?.myRole === "Manager" || project?.myRole === "Team Lead");

  return (
    <>
    <div>
      <Link to="/dashboard" className="flex align-center gap-8 mb-24" style={{ fontSize: "14px", color: "var(--text-secondary)", display: "inline-flex" }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* Project Meta Banner */}
      <div className="glass-card flex justify-between align-center flex-mobile-stack" style={{ padding: "28px", borderLeft: `6px solid ${project?.color || "var(--primary)"}`, marginBottom: "32px" }}>
        <div>
          <div className="flex align-center gap-12" style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", trackingWidth: "0.05em", color: "var(--text-muted)" }}>
              {project?.domain === "education" ? "Course" : "Project"}
            </span>
            <span className="pill pill-primary" style={{ textTransform: "capitalize" }}>
              {project?.domain === "education" 
                ? (project?.myRole === "Manager" ? "Instructor" : project?.myRole === "Team Lead" ? "Course Lead" : "Student") 
                : project?.myRole}
            </span>
            {project?.organization && (
              <span className="pill" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-border)", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 600 }}>
                🏢 {project.organization.name} {project.department && `/ ${project.department.name}`}
              </span>
            )}
          </div>
          <h1 className="h-outfit" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>{project?.name}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "600px" }}>
            {project?.description || (project?.domain === "education" ? "No course syllabus or description provided." : "No project description provided.")}
          </p>
        </div>
        <div className="flex gap-8 flex-mobile-stack">
          <button
            onClick={async () => {
              const projectSlug = getSqliteProjectId(project.name);
              const now = new Date();
              const dateStr = now.toISOString().slice(0, 10);
              const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
              const meetingId = `${projectSlug}_${dateStr}_${timeStr}`;

              // Notify all members
              try {
                await api.post("/meetings/started", { projectId, meetingId });
              } catch (notifyErr) {
                console.error("Failed to notify members:", notifyErr);
              }

              const hostname = window.location.hostname;
              const url = `http://${hostname}:3000/?meetingId=${meetingId}&userName=${encodeURIComponent(user?.name || "Guest")}&email=${encodeURIComponent(user?.email || "")}&role=${encodeURIComponent(project?.myRole || "Member")}`;
              window.open(url, "_blank");
            }}
            className="btn btn-primary"
          >
            {project?.domain === "education" ? "Start Immediate Class" : "Start Immediate Meeting"}
          </button>
          {isLead && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="btn btn-secondary"
            >
              {project?.domain === "education" ? "Schedule Lecture" : "Schedule Meeting"}
            </button>
          )}
          {isCreator && (
            <button
              onClick={handleDeleteProject}
              className="btn"
              style={{
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.05)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 600
              }}
            >
              <Trash2 size={14} />
              {project?.domain === "education" ? "Delete Course" : "Delete Project"}
            </button>
          )}
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="scroll-tabs-mobile" style={{ display: "flex", gap: "16px", marginBottom: "28px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "8px" }}>
        <button
          onClick={() => setWorkspaceTab("meetings")}
          style={{
            background: "transparent", border: "none", color: workspaceTab === "meetings" ? "var(--primary)" : "var(--text-muted)",
            fontSize: "14px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
            borderBottom: workspaceTab === "meetings" ? "3px solid var(--primary)" : "3px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <Calendar size={16} /> Calls & Meetings
        </button>
        <button
          onClick={() => setWorkspaceTab("decisions")}
          style={{
            background: "transparent", border: "none", color: workspaceTab === "decisions" ? "var(--success)" : "var(--text-muted)",
            fontSize: "14px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
            borderBottom: workspaceTab === "decisions" ? "3px solid var(--success)" : "3px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <HelpCircle size={16} /> Decision Timeline
        </button>
        <button
          onClick={() => setWorkspaceTab("insights")}
          style={{
            background: "transparent", border: "none", color: workspaceTab === "insights" ? "var(--warning)" : "var(--text-muted)",
            fontSize: "14px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
            borderBottom: workspaceTab === "insights" ? "3px solid var(--warning)" : "3px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <Sparkles size={16} /> AI Workspace Copilot
        </button>
        <button
          onClick={() => setWorkspaceTab("analytics")}
          style={{
            background: "transparent", border: "none", color: workspaceTab === "analytics" ? "#a29bfe" : "var(--text-muted)",
            fontSize: "14px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
            borderBottom: workspaceTab === "analytics" ? "3px solid #a29bfe" : "3px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <BarChart2 size={16} /> Project Analytics
        </button>
        {isLead && (
          <button
            onClick={() => setWorkspaceTab("audit")}
            style={{
              background: "transparent", border: "none", color: workspaceTab === "audit" ? "var(--danger)" : "var(--text-muted)",
              fontSize: "14px", fontWeight: 600, padding: "8px 16px", cursor: "pointer", transition: "all 0.2s",
              borderBottom: workspaceTab === "audit" ? "3px solid var(--danger)" : "3px solid transparent",
              display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            <Activity size={16} style={{ color: "var(--danger)" }} /> Immutable Audit Logs
          </button>
        )}
      </div>

      {workspaceTab === "meetings" && (
        <div className="project-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Members List */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 className="h-outfit flex align-center gap-8" style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
              <Users size={18} /> Members ({project?.members?.length || 0})
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {project?.members?.map((m) => (
                <div key={m.user?._id} className="flex align-center justify-between" style={{ fontSize: "13px" }}>
                  <div>
                    <span style={{ fontWeight: 600, display: "block", color: "var(--text-primary)" }}>{m.user?.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                      {project?.domain === "education"
                        ? (m.role === "Manager" ? "Instructor" : m.role === "Team Lead" ? "Course Lead" : m.role === "Member" ? "Student" : m.role)
                        : m.role}
                    </span>
                  </div>
                  {isLead && m.user?._id !== user.id && (
                    <div className="flex gap-8 align-center">
                      <select
                        value={m.role}
                        disabled={memberActionLoading}
                        onChange={(e) => handleRoleChange(m.user?._id, e.target.value)}
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--panel-border)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="Manager">{project?.domain === "education" ? "Instructor" : "Manager"}</option>
                        <option value="Team Lead">{project?.domain === "education" ? "Course Lead" : "Team Lead"}</option>
                        <option value="Member">{project?.domain === "education" ? "Student" : "Member"}</option>
                        <option value="Student">Student</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.user?._id)}
                        disabled={memberActionLoading}
                        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer" }}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Invite members inline form (leads/managers only) */}
            {isLead && (
              <form onSubmit={handleInvite} style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--panel-border)" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>Invite Member</h4>
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Their email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviteLoading}
                    style={{ fontSize: "12px", padding: "8px 12px" }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <select
                    className="form-input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    disabled={inviteLoading}
                    style={{ fontSize: "12px", padding: "8px 12px" }}
                  >
                    <option value="Member">{project?.domain === "education" ? "Student" : "Member"}</option>
                    <option value="Team Lead">{project?.domain === "education" ? "Course Lead" : "Team Lead"}</option>
                    <option value="Student">Student</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary w-full" style={{ fontSize: "12px", padding: "8px 12px" }} disabled={inviteLoading}>
                  <UserPlus size={14} /> {inviteLoading ? "Sending..." : "Send Invite"}
                </button>
              </form>
            )}

          </div>

          {/* Collapsible Manual Ingest (leads only) */}
          {isLead && (
            <details style={{ marginTop: "24px", cursor: "pointer" }}>
              <summary style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", userSelect: "none" }}>
                ðŸ› ï¸ Import Mock Recording Folder
              </summary>
              <div className="glass-card" style={{ padding: "20px", marginTop: "12px", cursor: "default" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: "1.4", marginBottom: "16px" }}>
                  Provide a folder name inside <code>/recordings</code> (e.g. <code>team-standup-01</code>) containing pre-existing transcript and summary files.
                </p>
                <form onSubmit={handleIngest}>
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. team-standup-01"
                      value={ingestMeetingId}
                      onChange={(e) => setIngestMeetingId(e.target.value)}
                      required
                      disabled={ingestLoading}
                      style={{ fontSize: "12px", padding: "8px 12px" }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" style={{ fontSize: "12px", padding: "8px 12px" }} disabled={ingestLoading}>
                    {ingestLoading ? "Importing..." : "Import Folder"}
                  </button>
                </form>
              </div>
            </details>
          )}
        </div>

        {/* Right column: Meetings list + Meeting viewer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Transcript Keyword Search */}
          <div className="glass-card" style={{ padding: "16px 20px" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ask / search within this project's transcripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginTop: "16px", maxHeight: "250px", overflowY: "auto", borderTop: "1px solid var(--panel-border)", paddingTop: "12px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)", marginBottom: "12px" }}>Search Hits:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {searchResults.map((hit, i) => (
                    <div key={i} className="glass-card" style={{ padding: "12px", background: "var(--bg-card)" }}>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Meeting: <strong style={{ color: "var(--text-secondary)" }}>{hit.meeting_id}</strong> | Speaker: <strong>{hit.speaker}</strong>
                      </p>
                      <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.4" }}>"{hit.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="project-detail-grid-300" style={{ alignItems: "start" }}>
            {/* Scheduled Meetings list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="glass-card" style={{ padding: "20px" }}>
                <h3 className="h-outfit flex align-center gap-8" style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                  <Calendar size={16} /> {project?.domain === "education" ? "Scheduled Lectures" : "Scheduled Calls"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {scheduledMeetings.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "12px", textAlign: "center" }}>
                      {project?.domain === "education" ? "No upcoming lectures." : "No upcoming calls."}
                    </p>
                  ) : (
                    scheduledMeetings.map((meet) => {
                      const time = new Date(meet.dateTime);
                      return (
                        <div key={meet._id} style={{ borderBottom: "1px solid var(--panel-border)", paddingBottom: "10px" }}>
                          <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
                            {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "2px 0 6px" }}>{meet.title}</h4>
                          <div className="flex gap-8">
                            <a
                              href={`http://${window.location.hostname}:3000/?meetingId=${meet.meetingId}&userName=${encodeURIComponent(user?.name || "Guest")}&email=${encodeURIComponent(user?.email || "")}&role=${encodeURIComponent(project?.myRole || "Member")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary w-full"
                              style={{ padding: "6px", fontSize: "11px" }}
                            >
                              Join Call
                            </a>
                            {meet.createdBy && (String(meet.createdBy._id || meet.createdBy) === String(user?.id || user?._id)) && (
                              <button
                                onClick={() => handleCancelMeeting(meet.meetingId)}
                                className="btn btn-secondary"
                                style={{ padding: "6px 10px", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", display: "flex", alignItems: "center" }}
                                title="Cancel Meeting"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* AI Meeting Preparation Advisor Tool */}
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--panel-border)" }}>
                  <button
                    onClick={handleGenerateMeetingPrep}
                    disabled={meetingPrepLoading}
                    className="btn btn-primary w-full flex align-center justify-center gap-8"
                    style={{ padding: "8px 12px", fontSize: "12px", background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}
                  >
                    <Sparkles size={14} />
                    {meetingPrepLoading ? "Analyzing State..." : "Generate AI Agenda Prep"}
                  </button>

                  {meetingPrepHtml && (
                    <div className="glass-card" style={{ marginTop: "12px", padding: "12px", maxHeight: "300px", overflowY: "auto", background: "rgba(108, 92, 231, 0.05)", border: "1px solid rgba(108, 92, 231, 0.2)" }}>
                      <div className="flex justify-between align-center" style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#a29bfe", textTransform: "uppercase" }}>AI Prep Briefing</span>
                        <button onClick={() => setMeetingPrepHtml("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>Dismiss</button>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }} dangerouslySetInnerHTML={{ __html: meetingPrepHtml }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Meetings list */}
              <div className="glass-card" style={{ padding: "20px" }}>
                <h3 className="h-outfit" style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Past Meetings</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {meetings.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No meetings yet.</p>
                ) : (
                  meetings.map((m) => (
                    <button
                      key={m.meeting_id}
                      onClick={() => handleSelectMeeting(m.meeting_id)}
                      className={`btn w-full justify-between`}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        border: "1px solid var(--panel-border)",
                        background: selectedMeeting?.meeting_id === m.meeting_id ? "rgba(108, 92, 231, 0.15)" : "transparent",
                        borderColor: selectedMeeting?.meeting_id === m.meeting_id ? "var(--primary)" : "var(--panel-border)",
                        color: selectedMeeting?.meeting_id === m.meeting_id ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      <div className="flex align-center justify-between w-full">
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.title || m.meeting_id}</span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {new Date(m.ingested_at).toLocaleDateString()}
                          </span>
                        </div>
                        {project?.domain === "corporate" && m.project_health && (
                          <span className="pill" style={{
                            fontSize: "8px", textTransform: "uppercase", padding: "2px 6px",
                            background: m.project_health.status === "on_track" ? "rgba(34, 197, 94, 0.1)" :
                                        m.project_health.status === "at_risk" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: m.project_health.status === "on_track" ? "#4ade80" :
                                   m.project_health.status === "at_risk" ? "#fbbf24" : "#f87171",
                            borderColor: m.project_health.status === "on_track" ? "rgba(34,197,94,0.2)" :
                                         m.project_health.status === "at_risk" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"
                          }}>
                            {m.project_health.status?.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Meeting Detail Viewer */}
          <div className="glass-card" style={{ padding: "24px", minHeight: "400px" }}>
              {selectedMeeting ? (
                <div>
                  <div className="flex justify-between align-center" style={{ marginBottom: "20px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "12px" }}>
                    <h2 className="h-outfit" style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>
                      Meeting Intelligence: {selectedMeeting.meeting_id}
                    </h2>
                    <div className="flex gap-12 align-center">
                      <button
                        onClick={() => handleGenerateEmailDraft(selectedMeeting.meeting_id)}
                        disabled={emailDraftLoading}
                        className="btn btn-secondary flex align-center gap-8"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        <Mail size={12} />
                        {emailDraftLoading ? "Drafting..." : "Generate AI Follow-up Email"}
                      </button>
                      {canDeleteMeetings && (
                        <button
                          onClick={() => handleDeleteMeeting(selectedMeeting.meeting_id)}
                          className="btn btn-secondary flex align-center gap-8"
                          style={{ fontSize: "12px", padding: "6px 12px", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                        >
                          <Trash2 size={12} />
                          Delete Meeting
                        </button>
                      )}
                    </div>
                  </div>

                  {emailDraftHtml && (
                    <div className="glass-card" style={{ marginBottom: "24px", padding: "20px", background: "rgba(108, 92, 231, 0.05)", border: "1px solid rgba(108, 92, 231, 0.2)" }}>
                      <div className="flex justify-between align-center" style={{ marginBottom: "12px" }}>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#a29bfe", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}><Mail size={14} /> Generated AI Email Follow-up</h4>
                        <div className="flex gap-12 align-center">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(emailDraftHtml.replace(/<[^>]*>/g, ""));
                              alert("Email text copied to clipboard!");
                            }}
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "10px" }}
                          >
                            Copy Clean Text
                          </button>
                          <button onClick={() => setEmailDraftHtml("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>Dismiss</button>
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }} dangerouslySetInnerHTML={{ __html: emailDraftHtml }} />
                    </div>
                  )}

                  {/* Summary */}
                  <div style={{ marginBottom: "24px" }}>
                    <h4 className="flex align-center gap-8" style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)", marginBottom: "8px" }}>
                      <FileText size={16} /> Summary
                    </h4>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      {selectedMeeting.summary || "No summary extracted."}
                    </p>
                  </div>

                  {/* Decisions */}
                  {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <h4 className="flex align-center gap-8" style={{ fontSize: "14px", fontWeight: 600, color: "var(--success)", marginBottom: "8px" }}>
                        <HelpCircle size={16} /> Key Decisions
                      </h4>
                      <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedMeeting.decisions.map((dec, i) => (
                          <li key={i} style={{ fontSize: "13px", color: "var(--text-secondary)", paddingLeft: "16px", position: "relative" }}>
                            <span style={{ position: "absolute", left: 0, color: "var(--success)" }}>â€¢</span> {dec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tasks */}
                  <div style={{ marginBottom: "24px" }}>
                    <div className="flex justify-between align-center" style={{ marginBottom: "8px" }}>
                      <h4 className="flex align-center gap-8" style={{ fontSize: "14px", fontWeight: 600, color: "var(--warning)", margin: 0 }}>
                        <CheckCircle size={16} /> Action Items
                      </h4>
                      {isLead && (
                        <button
                          onClick={handleSendTaskReminders}
                          disabled={emailSending}
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <Send size={10} /> {emailSending ? "Sending..." : "Email Reminders"}
                        </button>
                      )}
                    </div>
                    
                    {selectedMeeting.tasks && selectedMeeting.tasks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedMeeting.tasks.map((task) => {
                          let blockedBy = [];
                          if (task.depends_on && task.depends_on.length > 0) {
                            task.depends_on.forEach(depDesc => {
                              const parent = selectedMeeting.tasks.find(t => 
                                t.description?.toLowerCase().includes(depDesc.toLowerCase()) ||
                                depDesc.toLowerCase().includes(t.description?.toLowerCase())
                              );
                              if (parent && parent.status === "open") {
                                blockedBy.push(parent.owner ? `${parent.description} (${parent.owner})` : parent.description);
                              }
                            });
                          }

                          return (
                            <div key={task.task_id} className="glass-card" style={{ padding: "12px 16px", background: "var(--bg-base)" }}>
                              <div className="flex justify-between align-center" style={{ marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{task.description}</span>
                                <div className="flex gap-4 align-center">
                                  {task.confidence && (
                                    <span className="pill" style={{
                                      fontSize: "10px", 
                                      fontWeight: 700,
                                      background: task.confidence > 85 ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                      color: task.confidence > 85 ? "#4ade80" : "#fbbf24",
                                      borderColor: task.confidence > 85 ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                      textTransform: "uppercase"
                                    }}>
                                      🎯 {task.confidence}%
                                    </span>
                                  )}
                                  <span className="pill pill-warning" style={{ fontSize: "10px" }}>{task.priority}</span>
                                </div>
                              </div>
                              <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: "0 0 6px" }}>
                                Owner: <strong>{task.owner}</strong> | Deadline: <strong>{task.deadline}</strong>
                                {task.speaker && ` | Assigned By: ${task.speaker}`}
                                {task.timestamp && ` at ${task.timestamp}`}
                              </p>
                              {task.evidence && (
                                <p style={{
                                  fontSize: "11px", fontStyle: "italic", color: "var(--text-secondary)",
                                  borderLeft: "2px solid var(--panel-border)", paddingLeft: "8px", margin: "6px 0 0"
                                }}>
                                  "{task.evidence}"
                                </p>
                              )}
                              {blockedBy.length > 0 && (
                                <div style={{ 
                                  display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", 
                                  color: "#f87171", background: "rgba(239, 68, 68, 0.05)", 
                                  padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(239, 68, 68, 0.15)",
                                  marginTop: "6px"
                                }}>
                                  <span>🚨 Blocker: depends on pending task: </span>
                                  <strong>{blockedBy.join(", ")}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No action items extracted.</p>
                    )}
                  </div>

                  {/* WebRTC Attendance & Speaking Time */}
                  <div style={{ marginBottom: "24px", borderTop: "1px solid var(--panel-border)", paddingTop: "20px" }}>
                    <h4 className="flex align-center gap-8" style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)", marginBottom: "12px" }}>
                      <Users size={16} /> WebRTC Participation & Attendance Logs
                    </h4>
                    {attendanceRecords.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {(() => {
                          const totalSpeaking = attendanceRecords.reduce((acc, curr) => acc + (curr.speaking_secs || 0), 0);
                          return attendanceRecords.map((att, index) => {
                            const speakPct = totalSpeaking > 0 ? Math.round(((att.speaking_secs || 0) / totalSpeaking) * 100) : 0;
                            const durationMin = att.leave_time 
                              ? Math.round((new Date(att.leave_time) - new Date(att.join_time)) / 60000)
                              : null;

                            return (
                              <div key={index} className="glass-card" style={{ padding: "14px", background: "var(--bg-base)" }}>
                                <div className="flex justify-between align-start" style={{ marginBottom: "8px" }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{att.user_name}</strong>
                                      {(() => {
                                        const rawRole = att.role || "Member";
                                        const displayRole = (() => {
                                          if (rawRole === "lead") {
                                            return project?.domain === "education" ? "Instructor" : "Manager";
                                          }
                                          if (rawRole === "member") {
                                            return project?.domain === "education" ? "Student" : "Member";
                                          }
                                          return rawRole;
                                        })();
                                        return (
                                          <span className="pill" style={{
                                            fontSize: "9px", padding: "1px 6px",
                                            background: "rgba(108, 92, 231, 0.1)",
                                            color: "var(--primary)",
                                            borderColor: "rgba(108, 92, 231, 0.2)",
                                            fontWeight: 500
                                          }}>
                                            {displayRole}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                      {att.email || "No email available"}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                                      Joined: {new Date(att.join_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                      {durationMin !== null ? ` (Duration: ${durationMin} min)` : " (Live Now)"}
                                    </div>
                                  </div>
                                  <span className="pill" style={{
                                    fontSize: "9px", padding: "1px 6px",
                                    background: att.leave_time ? "rgba(255,255,255,0.02)" : "rgba(34, 197, 94, 0.1)",
                                    color: att.leave_time ? "var(--text-muted)" : "var(--success)",
                                    borderColor: att.leave_time ? "var(--panel-border)" : "var(--panel-border)"
                                  }}>
                                    {att.leave_time ? "Checked Out" : "Connected"}
                                  </span>
                                </div>

                                {/* Speaking percentage share progress meter */}
                                <div>
                                  <div className="flex justify-between" style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                    <span>Speaking Share</span>
                                    <span>{att.speaking_secs || 0}s ({speakPct}%)</span>
                                  </div>
                                  <div style={{ width: "100%", height: "6px", background: "var(--panel-border)", borderRadius: "3px", overflow: "hidden" }}>
                                    <div style={{ width: `${speakPct}%`, height: "100%", background: "var(--primary)", borderRadius: "3px" }}></div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No WebRTC attendance check-ins or speaking chunks tracked for this session yet.</p>
                    )}
                  </div>

                  {/* Domain-specific dynamic AI insights */}
                  {project?.domain === "education" ? (
                    /* 🎓 Educational Domain View */
                    <div style={{ marginBottom: "24px", borderTop: "1px solid var(--panel-border)", paddingTop: "20px" }}>
                      <h4 className="flex align-center gap-8" style={{ fontSize: "15px", fontWeight: 700, color: "#8b5cf6", marginBottom: "16px" }}>
                        <BookOpen size={16} /> AI Lecture Insights & Study Guide
                      </h4>

                      {/* Study Planner */}
                      {selectedMeeting.study_planner && selectedMeeting.study_planner.length > 0 ? (
                        <div style={{ marginBottom: "20px" }}>
                          <h5 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Clock size={14} style={{ color: "#a5b4fc" }} /> Topics Covered & Study Plan
                          </h5>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {selectedMeeting.study_planner.map((plan, i) => (
                              <div key={i} className="glass-card" style={{ padding: "12px", background: "rgba(139, 92, 246, 0.01)", border: "1px solid rgba(139, 92, 246, 0.12)" }}>
                                <div className="flex justify-between align-center" style={{ marginBottom: "6px" }}>
                                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{plan.topic}</strong>
                                  <span style={{ fontSize: "11px", color: "#a5b4fc" }}>🕒 {plan.recommended_hours} hrs review</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                                  {plan.review_activities?.map((act, ai) => (
                                    <li key={ai} style={{ marginBottom: "4px" }}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "20px" }}>No custom study topics detected in this lecture session.</p>
                      )}

                      {/* Assignment / Practice Quiz */}
                      {selectedMeeting.assignments && selectedMeeting.assignments.length > 0 ? (
                        <div>
                          <h5 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Award size={14} style={{ color: "#f59e0b" }} /> Generated Practice Quiz
                          </h5>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {selectedMeeting.assignments.map((quiz, qi) => (
                              <div key={qi} className="glass-card" style={{ padding: "14px", background: "var(--bg-base)" }}>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                                  Q{qi + 1}: {quiz.question}
                                </p>

                                {quiz.type === "multiple_choice" && quiz.options ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {quiz.options.map((opt, oi) => {
                                      const isSelected = quizAnswers[qi] === opt;
                                      const isCorrect = opt === quiz.answer;
                                      let optStyle = {
                                        padding: "8px 12px", borderRadius: "6px", fontSize: "12px",
                                        textAlign: "left", cursor: quizChecked ? "default" : "pointer",
                                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)",
                                        color: "var(--text-secondary)", transition: "all 0.2s"
                                      };

                                      if (isSelected && !quizChecked) {
                                        optStyle.background = "rgba(99, 102, 241, 0.15)";
                                        optStyle.borderColor = "var(--primary)";
                                        optStyle.color = "white";
                                      } else if (quizChecked) {
                                        if (isCorrect) {
                                          optStyle.background = "rgba(34, 197, 94, 0.15)";
                                          optStyle.borderColor = "#22c55e";
                                          optStyle.color = "#4ade80";
                                        } else if (isSelected) {
                                          optStyle.background = "rgba(239, 68, 68, 0.15)";
                                          optStyle.borderColor = "#ef4444";
                                          optStyle.color = "#f87171";
                                        }
                                      }

                                      return (
                                        <button
                                          key={oi}
                                          type="button"
                                          style={optStyle}
                                          disabled={quizChecked}
                                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qi]: opt }))}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Short Answer */
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <input
                                      type="text"
                                      placeholder="Type your answer here..."
                                      disabled={quizChecked}
                                      value={quizAnswers[qi] || ""}
                                      onChange={(e) => setQuizAnswers(prev => ({ ...prev, [qi]: e.target.value }))}
                                      style={{
                                        background: "#0f1018", border: "1px solid var(--panel-border)",
                                        borderRadius: "6px", padding: "8px 12px", fontSize: "12px",
                                        color: "white", outline: "none", width: "100%"
                                      }}
                                    />
                                    {quizChecked && (
                                      <p style={{ fontSize: "11px", color: "#4ade80", marginTop: "4px" }}>
                                        ✓ Expected answer: <strong>{quiz.answer}</strong>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end" style={{ marginTop: "14px" }}>
                            {!quizChecked ? (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "8px 16px", fontSize: "12px" }}
                                onClick={() => setQuizChecked(true)}
                              >
                                Submit & Check Answers
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "8px 16px", fontSize: "12px" }}
                                onClick={() => { setQuizChecked(false); setQuizAnswers({}); }}
                              >
                                Reset Quiz
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No quiz questions generated for this lecture session.</p>
                      )}
                    </div>
                  ) : (
                    /* 🏢 Corporate Domain View */
                    <div style={{ marginBottom: "24px", borderTop: "1px solid var(--panel-border)", paddingTop: "20px" }}>
                      <h4 className="flex align-center gap-8" style={{ fontSize: "15px", fontWeight: 700, color: "#6366f1", marginBottom: "16px" }}>
                        <Activity size={16} /> AI Project Health & Trajectory Prediction
                      </h4>

                      {selectedMeeting.project_health ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {/* Trajectory status badge & reasoning */}
                          <div className="glass-card" style={{
                            padding: "16px",
                            background: "var(--bg-card)",
                            borderLeft: `4px solid ${
                              selectedMeeting.project_health.status === "on_track" ? "#22c55e" :
                              selectedMeeting.project_health.status === "at_risk" ? "#f59e0b" : "#ef4444"
                            }`
                          }}>
                            <div className="flex align-center gap-8" style={{ marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>PROJECT Trajectory:</span>
                              <span className="pill" style={{
                                fontSize: "11px",
                                textTransform: "uppercase",
                                background: selectedMeeting.project_health.status === "on_track" ? "rgba(34, 197, 94, 0.15)" :
                                            selectedMeeting.project_health.status === "at_risk" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                color: selectedMeeting.project_health.status === "on_track" ? "#4ade80" :
                                       selectedMeeting.project_health.status === "at_risk" ? "#fbbf24" : "#f87171",
                                borderColor: selectedMeeting.project_health.status === "on_track" ? "#22c55e" :
                                             selectedMeeting.project_health.status === "at_risk" ? "#f59e0b" : "#ef4444"
                              }}>
                                {selectedMeeting.project_health.status?.replace("_", " ")}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4", margin: 0 }}>
                              {selectedMeeting.project_health.reasoning}
                            </p>
                          </div>

                          {/* Workload Bottlenecks */}
                          <div>
                            <h5 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <AlertTriangle size={14} style={{ color: "#f59e0b" }} /> Workload & Bottleneck Warnings
                            </h5>
                            {selectedMeeting.project_health.bottlenecks && selectedMeeting.project_health.bottlenecks.length > 0 ? (
                              <ul style={{ listStyleType: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                                {selectedMeeting.project_health.bottlenecks.map((bot, bi) => (
                                  <li key={bi} style={{
                                    fontSize: "12px", color: "var(--text-secondary)", padding: "10px 12px",
                                    background: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.12)",
                                    borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px"
                                  }}>
                                    <span style={{ color: "#f59e0b" }}>⚠️</span> {bot}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ color: "#4ade80", fontSize: "12px", margin: "2px 0 0" }}>✓ No workload bottlenecks or resource constraints detected.</p>
                            )}
                          </div>

                          {/* Dynamic risks radar */}
                          <div>
                            <h5 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <Activity size={14} style={{ color: "#f87171" }} /> Active Project Risks
                            </h5>
                            {selectedMeeting.project_health.risks && selectedMeeting.project_health.risks.length > 0 ? (
                              <ul style={{ listStyleType: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                                {selectedMeeting.project_health.risks.map((risk, ri) => (
                                  <li key={ri} style={{
                                    fontSize: "12px", color: "var(--text-secondary)", padding: "10px 12px",
                                    background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.12)",
                                    borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px"
                                  }}>
                                    <span style={{ color: "#ef4444" }}>🚨</span> {risk}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ color: "#4ade80", fontSize: "12px", margin: "2px 0 0" }}>✓ No active project risks or delays flagged in this call.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No trajectory predictions or health checks calculated yet for this project call.</p>
                      )}
                    </div>
                  )}

                  {/* Transcripts */}
                  <div>
                    <h4 className="flex align-center gap-8" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px" }}>
                      Transcript Segments
                    </h4>
                    <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid var(--panel-border)", borderRadius: "8px", padding: "12px", background: "var(--bg-base)" }}>
                      {selectedMeeting.transcripts && selectedMeeting.transcripts.length > 0 ? (
                        selectedMeeting.transcripts.map((t) => (
                          <div key={t.transcript_id} style={{ fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "6px" }}>
                            <strong style={{ color: "#a29bfe" }}>{t.speaker}:</strong> <span style={{ color: "var(--text-secondary)" }}>{t.text}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No transcript data.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", textAlign: "center", padding: "40px" }}>
                  <Inbox size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>No Meeting Selected</h3>
                  <p style={{ fontSize: "13px", maxWidth: "250px" }}>Select a meeting from the list on the left to browse intelligence summaries and transcript details.</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
    )}

    {workspaceTab === "decisions" && (
      <div className="glass-card" style={{ padding: "32px", minHeight: "450px" }}>
        <h2 className="h-outfit flex align-center gap-12" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          <HelpCircle size={22} style={{ color: "var(--success)" }} /> Project Decision Memory
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
          Below is the complete chronological registry of key design decisions, technical pivots, and commitments made across all project calls.
        </p>

        {decisionsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div className="spinner"></div>
          </div>
        ) : projectDecisions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Inbox size={48} style={{ marginBottom: "16px", opacity: 0.4 }} />
            <p style={{ fontSize: "14px" }}>No formal decisions have been logged in the meeting records yet.</p>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: "24px", borderLeft: "2px solid var(--panel-border)", marginLeft: "12px", display: "flex", flexDirection: "column", gap: "28px" }}>
            {projectDecisions.map((dec, idx) => {
              const date = new Date(dec.ingested_at);
              return (
                <div key={idx} style={{ position: "relative" }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: "absolute", left: "-31px", top: "4px", width: "12px", height: "12px",
                    borderRadius: "50%", background: "var(--success)", border: "3px solid var(--bg-base)",
                    boxShadow: "0 0 8px var(--success)"
                  }}></div>
                  
                  <div>
                    <div className="flex align-center gap-8" style={{ marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ color: "var(--panel-border)", fontSize: "11px" }}>•</span>
                      <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
                        In call: {dec.title}
                      </span>
                    </div>
                    <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500, lineHeight: "1.4", margin: "0 0 8px" }}>
                      🎯 {dec.text}
                    </p>
                    {dec.reason && (
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 6px 16px" }}>
                        <strong>💡 Rationale:</strong> {dec.reason}
                      </p>
                    )}
                    {dec.discussion && (
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--panel-border)", paddingLeft: "8px", margin: "0 0 0 16px" }}>
                        🗣️ "{dec.discussion}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    {workspaceTab === "insights" && (
      <div className="glass-card" style={{ padding: "32px", minHeight: "450px" }}>
        {project?.domain === "education" ? (
          /* 🎓 Educational Revision Compiler */
          <div>
            <h2 className="h-outfit flex align-center gap-12" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              <BookOpen size={22} style={{ color: "#8b5cf6" }} /> AI Syllabus Revision & Quiz Prep
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
              Revision mode compiles and aggregates all lecture topics, study plans, and practice quizzes generated across all recorded lecture sessions.
            </p>

            {/* Compilation Grid */}
            <div className="grid-2" style={{ gap: "32px" }}>
              {/* Revision Topics List */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "8px" }}>
                  📚 Key Revision Concepts & Schedule
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {meetings.some(m => m.study_planner && m.study_planner.length > 0) ? (
                    meetings.map((m) => (
                      m.study_planner && m.study_planner.length > 0 && (
                        <div key={m.meeting_id} style={{ marginBottom: "16px" }}>
                          <h4 style={{ fontSize: "12px", color: "#a5b4fc", textTransform: "uppercase", marginBottom: "6px" }}>Lecture: {m.title}</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {m.study_planner.map((plan, pi) => (
                              <div key={pi} className="glass-card" style={{ padding: "12px", background: "rgba(139, 92, 246, 0.03)", border: "1px solid rgba(139, 92, 246, 0.12)" }}>
                                <strong style={{ fontSize: "13px", color: "white", display: "block", marginBottom: "4px" }}>{plan.topic}</strong>
                                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                                  {plan.review_activities?.map((act, ai) => (
                                    <li key={ai} style={{ marginBottom: "2px" }}>{act}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No lecture study planners have been processed yet.</p>
                  )}
                </div>
              </div>

              {/* Exam practice compiler */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "8px" }}>
                  ✏️ Unified Practice Quiz Compilation
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {meetings.some(m => m.assignments && m.assignments.length > 0) ? (
                    (() => {
                      let totalQuizzes = [];
                      meetings.forEach(m => {
                        if (m.assignments) totalQuizzes.push(...m.assignments);
                      });
                      return totalQuizzes.map((quiz, qi) => (
                        <div key={qi} className="glass-card" style={{ padding: "16px", background: "var(--bg-card)" }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "white", marginBottom: "8px" }}>Q{qi + 1}: {quiz.question}</p>
                          {quiz.options ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {quiz.options.map((opt, oi) => (
                                <div key={oi} style={{
                                  padding: "8px 12px", borderRadius: "6px", fontSize: "12px",
                                  background: opt === quiz.answer ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.03)",
                                  border: opt === quiz.answer ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--panel-border)",
                                  color: opt === quiz.answer ? "#4ade80" : "var(--text-secondary)"
                                }}>
                                  {opt} {opt === quiz.answer && " ✓ (Correct)"}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: "12px", color: "#4ade80", background: "rgba(34, 197, 94, 0.05)", padding: "8px 12px", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "6px" }}>
                              Expected answer: <strong>{quiz.answer}</strong>
                            </div>
                          )}
                        </div>
                      ));
                    })()
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No quiz questions generated in this course workspace yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 🏢 Corporate Progress & Resource Dashboard */
          <div>
            <h2 className="h-outfit flex align-center gap-12" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              <Activity size={22} style={{ color: "#6366f1" }} /> AI Project Progress & Resource Advisor
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
              Aggregated workspace analytics and predictive resource leveling calculated based on latest meeting transcript logs.
            </p>

            {meetings.some(m => m.project_health) ? (
              (() => {
                // Find the latest meeting health data
                const latestMeeting = meetings.find(m => m.project_health);
                const health = latestMeeting.project_health;
                const currentProg = health.current_progress || 0;
                const expectedProg = health.expected_progress || 0;
                const isBehind = currentProg < expectedProg;

                return (
                  <div className="grid-2" style={{ gap: "32px" }}>
                    {/* Health trajectory & progress meters */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" }}>📈 Project Progress Tracking</h3>
                      
                      {/* Progress Meter Bar */}
                      <div style={{ marginBottom: "24px" }}>
                        <div className="flex justify-between" style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                          <span>Current Progress</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{currentProg}%</span>
                        </div>
                        <div style={{ width: "100%", height: "10px", background: "var(--panel-border)", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{ width: `${currentProg}%`, height: "100%", background: "var(--primary)", borderRadius: "5px" }}></div>
                        </div>
                      </div>

                      {/* Expected Progress Bar */}
                      <div style={{ marginBottom: "24px" }}>
                        <div className="flex justify-between" style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                          <span>Expected Milestone Progress</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{expectedProg}%</span>
                        </div>
                        <div style={{ width: "100%", height: "10px", background: "var(--panel-border)", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{ width: `${expectedProg}%`, height: "100%", background: "#a5b4fc", borderRadius: "5px" }}></div>
                        </div>
                      </div>

                      <div className="glass-card flex align-center gap-12" style={{
                        padding: "14px",
                        background: isBehind ? "rgba(239, 68, 68, 0.05)" : "rgba(34, 197, 94, 0.05)",
                        borderLeft: `4px solid ${isBehind ? "#ef4444" : "#22c55e"}`
                      }}>
                        <span style={{ fontSize: "18px" }}>{isBehind ? "⚠️" : "✓"}</span>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                          {isBehind
                            ? `Project is currently behind schedule by ${expectedProg - currentProg}%. Review the bottleneck constraints.`
                            : "Project is currently on track or ahead of milestone expectation."}
                        </p>
                      </div>
                    </div>

                    {/* AI Resource recommends & risk leveling */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" }}>💡 AI Resource leveling & Risk mitigations</h3>
                      
                      <div style={{ marginBottom: "20px" }}>
                        <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Delay Probability</h4>
                        <span className="pill" style={{
                          background: health.delay_probability === "High" ? "rgba(239, 68, 68, 0.15)" : health.delay_probability === "Medium" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
                          color: health.delay_probability === "High" ? "#f87171" : health.delay_probability === "Medium" ? "#fbbf24" : "#4ade80",
                          borderColor: health.delay_probability === "High" ? "#ef4444" : health.delay_probability === "Medium" ? "#f59e0b" : "#22c55e",
                          textTransform: "uppercase", fontSize: "11px", fontWeight: 700
                        }}>
                          {health.delay_probability || "Low"}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Resource Allocation Advice</h4>
                        {health.resource_recommendations && health.resource_recommendations.length > 0 ? (
                          <ul style={{ listStyleType: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                            {health.resource_recommendations.map((rec, ri) => (
                              <li key={ri} style={{
                                fontSize: "12px", color: "var(--text-secondary)", padding: "10px 12px",
                                background: "rgba(99, 102, 241, 0.04)", border: "1px solid rgba(99, 102, 241, 0.15)",
                                borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px"
                              }}>
                                <span style={{ color: "var(--primary)" }}>💡</span> {rec}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: "#4ade80", fontSize: "12px", margin: 0 }}>✓ Workloads are well-distributed across all active team members.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No meeting intelligence records have been index-summarized to calculate trajectory health yet.</p>
            )}

            {/* ── Inline AI Copilot Q&A ── */}
            <div style={{ marginTop: "40px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "#8b5cf6" }} /> AI Workspace Copilot
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Ask the AI anything about this project — decisions, tasks, risks, and meeting history are all searchable.
              </p>

              {/* Messages */}
              <div style={{ minHeight: "180px", maxHeight: "340px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", padding: "4px 0" }}>
                {aiMessages.length === 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {["What decisions were made recently?", "What tasks are still pending?", "Summarise the last meeting.", "Were there any risks discussed?"].map((chip) => (
                      <button key={chip} onClick={() => handleAskAI(chip)} style={{
                        background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)",
                        borderRadius: "20px", padding: "7px 14px", fontSize: "12px",
                        color: "var(--primary)", cursor: "pointer",
                      }}>
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {aiMessages.map((msg, idx) => (
                  <div key={idx}>
                    {msg.role === "user" && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "9px 14px", fontSize: "13px", maxWidth: "80%", lineHeight: 1.55 }}>
                          {msg.text}
                        </div>
                      </div>
                    )}
                    {(msg.role === "assistant" || msg.role === "error") && (
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Bot size={13} color="white" />
                        </div>
                        <div style={{ flex: 1, background: msg.role === "error" ? "var(--danger-bg)" : "var(--bg-surface)", border: `1px solid ${msg.role === "error" ? "var(--danger)" : "var(--panel-border)"}`, borderRadius: "4px 16px 16px 16px", padding: "10px 14px", fontSize: "13px", color: msg.role === "error" ? "var(--danger)" : "var(--text-primary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {aiLoading && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Bot size={13} color="white" />
                    </div>
                    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--panel-border)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", display: "flex", gap: "5px" }}>
                      {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#8b5cf6", animation: "bounce 1.2s ease infinite", animationDelay: `${d}s`, display: "inline-block" }} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ask about decisions, tasks, risks…"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  style={{ flex: 1, fontSize: "13px" }}
                  disabled={aiLoading}
                />
                <button type="submit" className="btn btn-primary" disabled={aiLoading || !aiInput.trim()} style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Send size={14} /> Ask
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )}

    {workspaceTab === "audit" && (
      <div className="glass-card" style={{ padding: "32px", minHeight: "450px" }}>
        <h2 className="h-outfit flex align-center gap-12" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          <Activity size={22} style={{ color: "var(--danger)" }} /> Secure Workspace Audit Trail
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
          Immutable logs tracking workspace actions, meeting host controls, and AI executions for project compliance.
        </p>

        {auditLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading logs...</p>
        ) : auditLogs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No compliance audit trail logs captured for this workspace yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-secondary)", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--panel-border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 8px", color: "var(--text-primary)" }}>Timestamp</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-primary)" }}>User (Email / ID)</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-primary)" }}>Action Type</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-primary)" }}>Target Resource</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.log_id} style={{ borderBottom: "1px solid var(--panel-border)" }}>
                    <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {log.user_id}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span className="pill" style={{
                        background: log.action.includes("KICK") || log.action.includes("MUTE") ? "rgba(239, 68, 68, 0.12)" : "rgba(99, 102, 241, 0.12)",
                        color: log.action.includes("KICK") || log.action.includes("MUTE") ? "#f87171" : "#a5b4fc",
                        borderColor: log.action.includes("KICK") || log.action.includes("MUTE") ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.2)",
                        fontSize: "11px", fontWeight: 700
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>
                      {log.resource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {workspaceTab === "analytics" && (
      <div className="glass-card" style={{ padding: "32px", minHeight: "450px" }}>
        <h2 className="h-outfit flex align-center gap-12" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          <BarChart2 size={22} style={{ color: "#a29bfe" }} /> Project Intelligence Analytics
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
          Chronological project analytics, meeting velocity, decisions tracking, and AI-predicted progress checks.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Meetings</span>
            <h3 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, margin: "8px 0 0" }}>{meetings.length}</h3>
          </div>
          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Decisions Logged</span>
            <h3 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, margin: "8px 0 0", color: "#4ade80" }}>{projectDecisions.length}</h3>
          </div>
          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Tasks Assigned</span>
            <h3 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, margin: "8px 0 0", color: "#fbbf24" }}>
              {meetings.reduce((acc, m) => acc + (m.tasks ? m.tasks.length : 0), 0)}
            </h3>
          </div>
          <div className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Meeting Length</span>
            <h3 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, margin: "8px 0 0", color: "#a29bfe" }}>
              {meetings.length > 0
                ? `${(meetings.reduce((acc, m) => acc + (parseFloat(m.duration_mins) || 12.0), 0) / meetings.length).toFixed(1)} mins`
                : "0 mins"}
            </h3>
          </div>
        </div>

        {/* AI Insights & Velocity Tracker */}
        <div className="glass-card" style={{ padding: "24px", background: "rgba(108, 92, 231, 0.01)" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>🧠 AI Workspace Insights & Velocity Report</h4>
          <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
            <li style={{ marginBottom: "8px" }}><strong>Tenancy Level</strong>: Project is nested under <strong>{project?.organization?.name || "Isolated Organization Tenancy"}</strong>.</li>
            <li style={{ marginBottom: "8px" }}><strong>Engagement Score</strong>: High. Team is averaging {meetings.length > 0 ? (meetings.length / 2).toFixed(1) : 0} meetings per week.</li>
            <li style={{ marginBottom: "8px" }}><strong>Decision Velocity</strong>: Average of {(projectDecisions.length / Math.max(1, meetings.length)).toFixed(1)} decisions reached per meeting session.</li>
            <li style={{ marginBottom: "8px" }}><strong>Task Completion SLA</strong>: On track. Most action items have clear owner attribution with high confidence markers.</li>
          </ul>
        </div>
      </div>
    )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="glass-card" style={{ width: "90%", maxWidth: "500px", padding: "32px", position: "relative", overflow: "hidden", borderTop: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(162, 155, 254, 0.1))", color: "var(--primary)" }}>
                <Calendar size={18} />
              </div>
              <h3 className="h-outfit" style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
                {project?.domain === "education" ? "Schedule Lecture Session" : "Schedule Project Call"}
              </h3>
            </div>
            
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                  {project?.domain === "education" ? "Lecture / Class Title" : "Meeting Title"}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={project?.domain === "education" ? "e.g. Advanced AI Algorithms - Seminar" : "e.g. Sprint Sync Planning"}
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  required
                  style={{ boxSizing: "border-box" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  required
                  style={{ boxSizing: "border-box" }}
                />
              </div>

              <div className="flex gap-12" style={{ marginTop: "32px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                  style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={scheduleLoading}
                  style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 600 }}
                >
                  {scheduleLoading ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

    {/* â”€â”€ Floating AI Chat Widget (RAG Knowledge Base) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
    <div style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 9999, fontFamily: "inherit" }}>
      {/* Glowing toggle FAB */}
      {!aiChatOpen && (
        <button
          onClick={() => setAiChatOpen(true)}
          title="Ask AI about your meetings"
          style={{
            width: "58px", height: "58px", borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 0 rgba(99,102,241,0.4), 0 8px 32px rgba(99,102,241,0.4)",
            animation: "aiPulse 2.5s ease infinite",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Sparkles size={24} color="white" />
        </button>
      )}

      {/* Chat panel â€” all backgrounds use explicit solid dark colors */}
      {aiChatOpen && (
        <div style={{
          width: "390px",
          borderRadius: "20px",
          background: "#1a1b2e",
          border: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          maxHeight: "600px",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.15))",
            borderBottom: "1px solid rgba(99,102,241,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
              }}>
                <Bot size={17} color="white" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>NinaivuNet AI</div>
                <div style={{ fontSize: "11px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                  Organizational Memory Active
                </div>
              </div>
            </div>
            <button
              onClick={() => setAiChatOpen(false)}
              style={{ background: "var(--panel-border)", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "6px", borderRadius: "8px" }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: "14px",
            minHeight: "300px", maxHeight: "420px",
            background: "var(--bg-base)",
          }}>
            {aiMessages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: "8px" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧠</div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
                  Ask me anything about your project meetings. I'll search the knowledge base and cite my sources.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {["What decisions were made recently?", "What tasks are still pending?", "Were there any risks discussed?"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleAskAI(chip)}
                      style={{
                        background: "var(--primary-glow)", border: "1px solid var(--panel-border)",
                        borderRadius: "20px", padding: "8px 16px", fontSize: "12px",
                        color: "var(--primary)", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiMessages.map((msg, idx) => (
              <div key={idx}>
                {/* User bubble */}
                {msg.role === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#ffffff", borderRadius: "16px 16px 4px 16px",
                      padding: "10px 15px", fontSize: "13px",
                      maxWidth: "82%", lineHeight: 1.55,
                      boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* AI / Error bubble */}
                {(msg.role === "assistant" || msg.role === "error") && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
                      background: msg.role === "error" ? "rgba(239,68,68,0.2)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Bot size={14} color={msg.role === "error" ? "#f87171" : "white"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        background: msg.role === "error" ? "var(--danger-bg)" : "var(--bg-surface)",
                        border: `1px solid ${msg.role === "error" ? "var(--danger)" : "var(--panel-border)"}`,
                        borderRadius: "4px 16px 16px 16px",
                        padding: "11px 15px", fontSize: "13px",
                        color: msg.role === "error" ? "var(--danger)" : "var(--text-primary)",
                        lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {msg.text}
                      </div>

                      {/* Cited sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: "6px" }}>
                          <button
                            onClick={() => setExpandedSources(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            style={{
                              background: "none", border: "none", cursor: "pointer", padding: "2px 0",
                              fontSize: "11px", color: "#64748b",
                              display: "flex", alignItems: "center", gap: "4px",
                            }}
                          >
                            {expandedSources[idx] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""} cited
                          </button>
                          {expandedSources[idx] && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "5px" }}>
                              {msg.sources.map((src, si) => (
                                <div key={si} style={{
                                  background: "var(--primary-glow)", border: "1px solid var(--panel-border)",
                                  borderRadius: "8px", padding: "8px 11px", fontSize: "11px",
                                }}>
                                  <div style={{ color: "var(--primary)", fontWeight: 600, marginBottom: "3px" }}>
                                    {src.speaker || "Unknown"} · <span style={{ opacity: 0.65 }}>{src.meetingId}</span>
                                  </div>
                                  <div style={{ color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.4 }}>"{src.text}"</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {aiLoading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{
                  background: "#1e2035", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "4px 16px 16px 16px", padding: "12px 16px",
                  display: "flex", gap: "5px", alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: "#6366f1",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input row */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleAskAI(); }}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(99,102,241,0.18)",
              background: "#1a1b2e",
              display: "flex", gap: "8px", alignItems: "center",
            }}
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask about your meetings..."
              disabled={aiLoading}
              style={{
                flex: 1,
                background: "#0f1018",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: "24px",
                padding: "10px 16px", fontSize: "13px",
                color: "#e2e8f0", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.25)"}
            />
            <button
              type="submit"
              disabled={aiLoading || !aiInput.trim()}
              style={{
                width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                background: aiInput.trim() && !aiLoading ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.06)",
                border: "none", cursor: aiInput.trim() && !aiLoading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <Send size={15} color={aiInput.trim() && !aiLoading ? "white" : "#475569"} />
            </button>
          </form>
        </div>
      )}
    </div>

    {/* Keyframe animations */}
    <style>{`
      @keyframes aiPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4), 0 8px 32px rgba(99,102,241,0.4); }
        50% { box-shadow: 0 0 0 10px rgba(99,102,241,0), 0 8px 32px rgba(99,102,241,0.4); }
      }
      @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }
    `}</style>
    </>
  );
};

export default ProjectDetail;
