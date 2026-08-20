import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import axios from "axios";
import { Folder, Plus, Calendar, MailOpen, UserCheck, Check, X, ArrowRight, Video, CheckCircle, Circle, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const Dashboard = () => {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [calendarMeetings, setCalendarMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("meetings"); // "meetings" | "tasks"
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const hostname = window.location.hostname;

      // Fire all 3 requests in parallel — no more sequential waterfalling
      const [dashRes, calRes, tasksRes] = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/meetings/my-calendar"),
        axios.get(`http://${hostname}:3000/api/db/tasks`, {
          params: { userName: currentUser?.name || "Guest" }
        }),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value.data.ok) {
        setData(dashRes.value.data);
      }
      if (calRes.status === "fulfilled" && calRes.value.data.ok) {
        setCalendarMeetings(calRes.value.data.meetings || []);
      }
      if (tasksRes.status === "fulfilled" && tasksRes.value.data.ok) {
        setTasks(tasksRes.value.data.tasks || []);
      }
    } catch (err) {
      setError("Failed to load dashboard statistics.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleTask = async (taskId) => {
    try {
      const hostname = window.location.hostname;
      const res = await axios.post(`http://${hostname}:3000/api/db/tasks/${encodeURIComponent(taskId)}/status`, {
        status: "completed"
      });
      if (res.data.ok) {
        // Remove task from list since it is completed
        setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled meeting?")) return;
    try {
      const res = await api.delete(`/meetings/scheduled/${meetingId}`);
      if (res.data.ok) {
        alert("Meeting cancelled successfully.");
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel meeting");
    }
  };

  const handleAcceptInvite = async (token) => {
    try {
      const res = await api.post(`/invitations/${token}/accept`);
      if (res.data.ok) {
        alert(`Joined project "${res.data.project.name}" as ${res.data.role}!`);
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (token) => {
    try {
      const res = await api.post(`/invitations/${token}/decline`);
      if (res.data.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      alert("Failed to decline invitation");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Welcome & Action */}
        <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "linear-gradient(135deg, rgba(108,92,231,0.1), rgba(162,155,254,0.05))" }}>
          <div>
            <h1 className="h-outfit" style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
              Welcome, {data?.user?.name || "User"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0 0" }}>
              Here is what's happening today.
            </p>
          </div>
          <Link to="/projects/create" className="btn btn-primary w-full" style={{ minHeight: "48px", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Plus size={16} /> Create Project
          </Link>
        </div>

        {error && (
          <div style={{ padding: "12px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", color: "var(--danger)", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="glass-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "11px", fontWeight: 500, margin: 0 }}>Total Workspaces</p>
              <h3 style={{ fontSize: "24px", fontWeight: 700, margin: "4px 0 0", fontFamily: "Outfit", color: "var(--text-primary)" }}>{data?.stats?.totalProjects || 0}</h3>
            </div>
            <span className="dot-indicator" style={{ background: "var(--primary)" }}></span>
          </div>
          <div className="glass-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "11px", fontWeight: 500, margin: 0 }}>Managed Projects</p>
              <h3 style={{ fontSize: "24px", fontWeight: 700, margin: "4px 0 0", fontFamily: "Outfit", color: "var(--text-primary)" }}>{data?.stats?.projectsAsManager || 0}</h3>
            </div>
            <span className="dot-indicator" style={{ background: "var(--success)" }}></span>
          </div>
          <div className="glass-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "11px", fontWeight: 500, margin: 0 }}>Pending Invites</p>
              <h3 style={{ fontSize: "24px", fontWeight: 700, margin: "4px 0 0", fontFamily: "Outfit", color: "var(--text-primary)" }}>{data?.stats?.pendingInvitations || 0}</h3>
            </div>
            <span className="dot-indicator" style={{ background: (data?.stats?.pendingInvitations || 0) > 0 ? "var(--warning)" : "var(--text-muted)" }}></span>
          </div>
        </div>

        {/* Pending Invitations */}
        {data?.pendingInvitations && data.pendingInvitations.length > 0 && (
          <div className="glass-card" style={{ padding: "16px" }}>
            <h3 className="h-outfit" style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
              Pending Invitations ({data.pendingInvitations.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.pendingInvitations.map((invite) => (
                <div key={invite._id} style={{ padding: "12px", border: "1px solid var(--panel-border)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>{invite.project?.name}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "11px", margin: "0 0 12px" }}>
                    Invited as <strong style={{ color: "var(--primary)" }}>{invite.role}</strong> by {invite.invitedBy?.name}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleAcceptInvite(invite.token)} className="btn btn-primary" style={{ flex: 1, minHeight: "40px", fontSize: "12px" }}>Accept</button>
                    <button onClick={() => handleDeclineInvite(invite.token)} className="btn btn-secondary" style={{ flex: 1, minHeight: "40px", fontSize: "12px", color: "var(--danger)" }}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspace List */}
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 className="h-outfit" style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>My Workspaces</h2>
            <Link to="/projects" style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "2px" }}>
              See all <ArrowRight size={12} />
            </Link>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!data?.projects || data.projects.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                No workspaces found.
              </div>
            ) : (
              data.projects.map((proj) => (
                <div
                  key={proj._id || proj.id}
                  onClick={() => navigate(`/projects/${proj._id || proj.id}`)}
                  style={{ padding: "14px", border: "1px solid var(--panel-border)", borderRadius: "8px", cursor: "pointer", background: "rgba(255,255,255,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{proj.name}</h4>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{proj.myRole}</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Schedule & Tasks */}
        <div className="glass-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="h-outfit" style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Schedule & Tasks</h3>
            <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "6px", padding: "2px", border: "1px solid var(--panel-border)" }}>
              <button
                onClick={() => setActiveTab("meetings")}
                style={{ padding: "4px 8px", fontSize: "11px", border: "none", borderRadius: "4px", background: activeTab === "meetings" ? "rgba(255,255,255,0.06)" : "transparent", color: activeTab === "meetings" ? "var(--text-primary)" : "var(--text-secondary)", cursor: "pointer" }}
              >
                Meetings ({calendarMeetings.length})
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                style={{ padding: "4px 8px", fontSize: "11px", border: "none", borderRadius: "4px", background: activeTab === "tasks" ? "rgba(255,255,255,0.06)" : "transparent", color: activeTab === "tasks" ? "var(--text-primary)" : "var(--text-secondary)", cursor: "pointer" }}
              >
                Tasks ({tasks.length})
              </button>
            </div>
          </div>

          {activeTab === "meetings" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {calendarMeetings.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>No scheduled calls.</div>
              ) : (
                calendarMeetings.map((meet) => (
                  <div key={meet._id} style={{ padding: "12px", border: "1px solid var(--panel-border)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>{meet.title}</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 8px" }}>
                      {new Date(meet.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <a
                        href={`http://${window.location.hostname}:3000/?meetingId=${meet.meetingId}&userName=${encodeURIComponent(currentUser?.name || "Guest")}&email=${encodeURIComponent(currentUser?.email || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ flex: 1, minHeight: "40px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Video size={14} style={{ marginRight: "4px" }} /> Join Call
                      </a>
                      {meet.createdBy === currentUser?.id && (
                        <button onClick={() => handleCancelMeeting(meet._id)} className="btn btn-secondary" style={{ minHeight: "40px", padding: "0 12px", color: "var(--danger)" }}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tasks.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>No tasks assigned.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.task_id} style={{ padding: "12px", border: "1px solid var(--panel-border)", borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start", background: "rgba(255,255,255,0.01)" }}>
                    <button
                      onClick={() => handleToggleTask(task.task_id)}
                      style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                    >
                      <Circle size={22} color="var(--text-muted)" />
                    </button>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{task.task_name || task.description}</h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: 0 }}>Project: {task.project_slug || task.meeting_title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between align-center flex-mobile-stack" style={{ marginBottom: "32px" }}>
        <div>
          <h1 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
            Welcome, {data?.user?.name || "User"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
            Here is what's happening with your projects today.
          </p>
        </div>
        <Link to="/projects/create" className="btn btn-primary">
          <Plus size={16} />
          Create Project
        </Link>
      </div>

      {error && (
        <div style={{ padding: "16px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", color: "var(--danger)", marginBottom: "32px" }}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-3" style={{ marginBottom: "32px" }}>
        <div className="glass-card" style={{ padding: "20px 24px", position: "relative" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 500 }}>Total Workspaces</p>
          <h3 style={{ fontSize: "32px", fontWeight: 700, marginTop: "8px", fontFamily: "Outfit", color: "var(--text-primary)" }}>
            {data?.stats?.totalProjects || 0}
          </h3>
          <div style={{ position: "absolute", top: "20px", right: "24px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="dot-indicator" style={{ background: "var(--primary)" }}></span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Active</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 24px", position: "relative" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 500 }}>Managed Projects</p>
          <h3 style={{ fontSize: "32px", fontWeight: 700, marginTop: "8px", fontFamily: "Outfit", color: "var(--text-primary)" }}>
            {data?.stats?.projectsAsManager || 0}
          </h3>
          <div style={{ position: "absolute", top: "20px", right: "24px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="dot-indicator" style={{ background: "var(--success)" }}></span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Lead Role</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 24px", position: "relative" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 500 }}>Pending Invites</p>
          <h3 style={{ fontSize: "32px", fontWeight: 700, marginTop: "8px", fontFamily: "Outfit", color: "var(--text-primary)" }}>
            {data?.stats?.pendingInvitations || 0}
          </h3>
          <div style={{ position: "absolute", top: "20px", right: "24px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="dot-indicator" style={{ background: (data?.stats?.pendingInvitations || 0) > 0 ? "var(--warning)" : "var(--text-muted)" }}></span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Action</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Active Projects List */}
        <div>
          <div className="flex justify-between align-center" style={{ marginBottom: "16px" }}>
            <h2 className="title-section h-outfit">My Workspaces</h2>
            <Link to="/projects" style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              See all <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="list-row-container" style={{ gap: 0 }}>
            {!data?.projects || data.projects.length === 0 ? (
              <div className="empty-state">
                <Folder size={32} className="empty-state-icon" />
                <h4 className="title-card" style={{ marginBottom: "6px" }}>No workspaces found</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px", maxWidth: "260px" }}>
                  You are not a member of any workspace yet.
                </p>
                <Link to="/projects/create" className="btn btn-secondary" style={{ fontSize: "12px" }}>Create your first project</Link>
              </div>
            ) : (
              data.projects.map((proj) => (
                <div
                  key={proj._id || proj.id}
                  onClick={() => navigate(`/projects/${proj._id || proj.id}`)}
                  className="list-row"
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex align-center gap-12">
                    <span className="dot-indicator" style={{ background: proj.color || "var(--primary)", width: "8px", height: "8px" }}></span>
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>{proj.name}</h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        {proj.domain === "education" ? "Educational Course" : "Enterprise Workspace"}
                      </p>
                    </div>
                  </div>
                  <div className="flex align-center gap-12">
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {proj.domain === "education" ? "Course Mode" : "Corporate Mode"}
                    </span>
                    <span className="pill pill-primary" style={{ textTransform: "capitalize", fontSize: "10px" }}>{proj.myRole}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invitations & Calendar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Pending Invitations */}
          {data?.pendingInvitations && data.pendingInvitations.length > 0 && (
            <div>
              <h2 className="title-section h-outfit" style={{ marginBottom: "12px" }}>
                Pending Invitations ({data.pendingInvitations.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.pendingInvitations.map((invite) => (
                  <div key={invite._id} className="glass-card flex justify-between align-center" style={{ padding: "14px 18px", borderLeft: `3px solid ${invite.project?.color || "var(--primary)"}` }}>
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>{invite.project?.name}</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                        Invited as <strong style={{ color: "var(--primary)" }}>{invite.role}</strong> by {invite.invitedBy?.name}
                      </p>
                    </div>
                    <div className="flex gap-8">
                      <button
                        onClick={() => handleAcceptInvite(invite.token)}
                        className="btn btn-primary"
                        style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "4px" }}
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite.token)}
                        className="btn btn-secondary"
                        style={{ padding: "6px 10px", fontSize: "11px", borderRadius: "4px", color: "var(--danger)" }}
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Schedule & Tasks Widget */}
          <div>
            <div className="flex justify-between align-center" style={{ marginBottom: "16px" }}>
              <h2 className="title-section h-outfit">My Schedule & Tasks</h2>
              <div className="flex gap-4" style={{ background: "rgba(255, 255, 255, 0.02)", borderRadius: "6px", padding: "3px", border: "1px solid var(--panel-border)" }}>
                <button
                  onClick={() => setActiveTab("meetings")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "meetings" ? "rgba(255,255,255,0.06)" : "transparent",
                    color: activeTab === "meetings" ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all var(--duration-fast)"
                  }}
                >
                  Meetings ({calendarMeetings.length})
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "tasks" ? "rgba(255,255,255,0.06)" : "transparent",
                    color: activeTab === "tasks" ? "var(--text-primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all var(--duration-fast)"
                  }}
                >
                  Tasks ({tasks.length})
                </button>
              </div>
            </div>

            {activeTab === "meetings" ? (
              calendarMeetings.length === 0 ? (
                <div className="empty-state">
                  <Calendar size={28} className="empty-state-icon" />
                  <h4 className="title-card" style={{ marginBottom: "4px" }}>No meetings scheduled</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "12px", maxWidth: "260px" }}>
                    There are no upcoming video calls scheduled for your projects today.
                  </p>
                </div>
              ) : (
                <div className="list-row-container" style={{ gap: 0 }}>
                  {calendarMeetings.map((meet) => {
                    const meetingTime = new Date(meet.dateTime);
                    return (
                      <div
                        key={meet._id}
                        className="list-row"
                        style={{ borderLeft: `3px solid ${meet.project?.color || "var(--primary)"}` }}
                      >
                        <div style={{ flex: 1, marginRight: "16px" }}>
                          <div className="flex align-center gap-8" style={{ marginBottom: "2px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {meet.project?.name}
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--primary)", fontWeight: 500 }}>
                              {meetingTime.toLocaleDateString()} at {meetingTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{meet.title}</h4>
                        </div>
                        <div className="flex gap-8 align-center">
                          {meet.createdBy && (String(meet.createdBy._id || meet.createdBy) === String(currentUser?.id || currentUser?._id)) && (
                            <button
                              onClick={() => handleCancelMeeting(meet.meetingId)}
                              className="btn btn-secondary"
                              style={{ padding: "6px", border: "1px solid rgba(239, 68, 68, 0.15)", color: "var(--danger)", borderRadius: "4px" }}
                              title="Cancel Meeting"
                            >
                              <X size={12} />
                            </button>
                          )}
                          <a
                            href={`http://${window.location.hostname}:3000/?meetingId=${meet.meetingId}&userName=${encodeURIComponent(currentUser?.name || "Member")}&email=${encodeURIComponent(currentUser?.email || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "4px" }}
                          >
                            <Video size={12} /> Join Call
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              tasks.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={28} className="empty-state-icon" style={{ color: "var(--success)" }} />
                  <h4 className="title-card" style={{ marginBottom: "4px" }}>All caught up!</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "12px", maxWidth: "260px" }}>
                    You have no pending action items assigned to you in any workspace.
                  </p>
                </div>
              ) : (
                <div className="list-row-container" style={{ gap: 0 }}>
                  {tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className="list-row"
                      style={{ borderLeft: `3px solid ${task.priority === "high" ? "var(--danger)" : task.priority === "medium" ? "var(--warning)" : "var(--primary)"}` }}
                    >
                      <div className="flex align-center gap-12" style={{ flex: 1, marginRight: "16px" }}>
                        <button
                          onClick={() => handleToggleTask(task.task_id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="Mark complete"
                        >
                          <Circle size={18} className="glow-hover" style={{ borderRadius: "50%" }} />
                        </button>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                            {task.description}
                          </p>
                          <div className="flex align-center gap-8" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            <span>In: <strong>{task.meeting_title}</strong></span>
                            <span>•</span>
                            <span style={{ color: task.priority === "high" ? "var(--danger)" : "var(--text-muted)" }}>
                              Deadline: {task.deadline || "None"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`pill pill-${task.priority === "high" ? "danger" : task.priority === "medium" ? "warning" : "primary"}`} style={{ fontSize: "9px" }}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
