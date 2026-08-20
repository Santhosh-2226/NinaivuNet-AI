import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { Bell, MailOpen, Check, X, Inbox, Video, Calendar, Eye } from "lucide-react";

const Notifications = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  const fetchData = async () => {
    try {
      setError("");
      const inviteRes = await api.get("/invitations/pending");
      if (inviteRes.data.ok) {
        setInvitations(inviteRes.data.invitations || []);
      }

      const alertRes = await api.get("/notifications");
      if (alertRes.data.ok) {
        setAlerts(alertRes.data.notifications || []);
      }
    } catch (err) {
      setError("Failed to fetch notification data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccept = async (token, projectName) => {
    try {
      const res = await api.post(`/invitations/${token}/accept`);
      if (res.data.ok) {
        alert(`Joined project "${projectName}"!`);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to accept invitation");
    }
  };

  const handleDecline = async (token) => {
    try {
      const res = await api.post(`/invitations/${token}/decline`);
      if (res.data.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Failed to decline invitation");
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await api.patch(`/notifications/${notificationId}/read`);
      if (res.data.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const hasNotifications = invitations.length > 0 || alerts.length > 0;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: isMobile ? "0 4px" : "0" }}>
      <div style={{ marginBottom: isMobile ? "20px" : "32px" }}>
        <h1 className="h-outfit flex align-center gap-12" style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: 700, marginBottom: "8px" }}>
          <Bell size={isMobile ? 22 : 28} /> Notification Center
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "13px" : "15px" }}>
          Respond to invitations and view live project call alerts.
        </p>
      </div>

      {error && (
        <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "var(--danger)", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {!hasNotifications ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <Inbox size={48} style={{ color: "var(--text-muted)", marginBottom: "16px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>All Caught Up!</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>You don't have any pending alerts or invitations right now.</p>
          </div>
        ) : (
          <>
            {/* 1. Pending Workspace Invitations */}
            {invitations.map((invite) => (
              <div
                key={invite._id}
                className="glass-card flex justify-between align-center flex-mobile-stack"
                style={{
                  padding: "20px 24px",
                  borderLeft: `4px solid ${invite.project?.color || "var(--primary)"}`,
                }}
              >
                <div className="flex align-center gap-16">
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justify: "center" }}>
                    <MailOpen size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                      Invitation to join "{invite.project?.name}"
                    </h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Invited as <span style={{ color: "var(--primary)", fontWeight: 600 }}>{invite.role}</span> by <strong>{invite.invitedBy?.name}</strong> ({invite.invitedBy?.email})
                    </p>
                  </div>
                </div>

                <div className="flex gap-8">
                  <button
                    onClick={() => handleAccept(invite.token, invite.project?.name)}
                    className="btn btn-primary"
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                  >
                    <Check size={16} /> Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite.token)}
                    className="btn btn-secondary"
                    style={{ padding: "8px 16px", fontSize: "13px", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)" }}
                  >
                    <X size={16} /> Decline
                  </button>
                </div>
              </div>
            ))}

            {/* 2. Project Activity Alerts */}
            {alerts.map((alertItem) => (
              <div
                key={alertItem._id}
                className="glass-card flex justify-between align-center flex-mobile-stack"
                style={{
                  padding: "20px 24px",
                  borderLeft: `4px solid ${alertItem.project?.color || "var(--primary)"}`,
                  opacity: alertItem.isRead ? 0.6 : 1,
                  boxShadow: alertItem.type === "meeting_started" && !alertItem.isRead ? "0 0 15px rgba(239, 68, 68, 0.25)" : "none",
                  borderColor: alertItem.type === "meeting_started" && !alertItem.isRead ? "var(--danger)" : "rgba(255, 255, 255, 0.05)"
                }}
              >
                <div className="flex align-center gap-16">
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: alertItem.type === "meeting_started" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      color: alertItem.type === "meeting_started" ? "var(--danger)" : "var(--warning)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {alertItem.type === "meeting_started" ? <Video size={20} /> : <Calendar size={20} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                      {alertItem.type === "meeting_started" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          Live Meeting Started <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)", display: "inline-block", animation: "pulse 1s infinite alternate" }}></span>
                        </span>
                      ) : "Call Scheduled"}
                    </h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      {alertItem.message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-8">
                  <a
                    href={`http://${window.location.hostname}:3000/?meetingId=${alertItem.link}&userName=${encodeURIComponent(user?.name || "Guest")}&email=${encodeURIComponent(user?.email || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleMarkAsRead(alertItem._id)}
                    className="btn btn-primary"
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      background: alertItem.type === "meeting_started" ? "var(--danger)" : "var(--primary)"
                    }}
                  >
                    <Video size={16} /> Join Call
                  </a>
                  {!alertItem.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(alertItem._id)}
                      className="btn btn-secondary"
                      style={{ padding: "8px 16px", fontSize: "13px" }}
                      title="Dismiss"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Embedded Pulse Keyframes */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default Notifications;
