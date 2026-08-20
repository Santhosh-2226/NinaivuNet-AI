import React, { useState, useEffect } from "react";
import axios from "axios";
import { Shield, Activity, Database, Cpu, Link2, Lock, Eye, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

const hostname = window.location.hostname;
const API = `http://${hostname}:3000`;

function StatusBadge({ ok, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
      background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
      color: ok ? "#22c55e" : "#ef4444",
      border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
    }}>
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />} {label}
    </span>
  );
}

export default function GovernancePage() {
  const [gov, setGov] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("security");
  const isMobile = useIsMobile();

  useEffect(() => { loadGov(); }, []);

  async function loadGov() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/db/governance-status`);
      if (res.data.ok) setGov(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const tabs = [
    { id: "security", label: "🛡 Security", icon: Shield },
    { id: "ai", label: "🤖 AI Config", icon: Cpu },
    { id: "data", label: "📊 Data Stats", icon: Database },
    { id: "integrations", label: "🔗 Integrations", icon: Link2 },
    { id: "audit", label: "📋 Audit Logs", icon: Activity },
  ];

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "32px 40px", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={22} color="white" />
          </div>
          <div>
            <h1 className="h-outfit" style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Enterprise Governance</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>Security posture, AI configuration, compliance, and integrations.</p>
          </div>
          <button onClick={loadGov} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.02)", border: "1px solid var(--panel-border)", color: "var(--text-muted)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "80px" }}><div className="spinner"></div></div> : !gov ? (
        <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>Failed to load governance data.</div>
      ) : (
        <>
          {/* Security Posture Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {[
              { label: "Encryption", value: gov.security.encryptionEnabled, icon: "🔐" },
              { label: "PII Masking", value: gov.security.piiMaskingEnabled, icon: "🎭" },
              { label: "Audit Logs", value: gov.security.auditLogsActive, icon: "📋" },
              { label: "RBAC", value: gov.security.rbacEnabled, icon: "🛡" },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{item.icon}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>{item.label}</div>
                <StatusBadge ok={item.value} label={item.value ? "Active" : "Inactive"} />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="scroll-tabs-mobile" style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "rgba(255,255,255,0.01)", padding: "4px", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: "9px 12px", background: activeTab === t.id ? "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(22,163,74,0.08))" : "transparent",
                border: activeTab === t.id ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
                color: activeTab === t.id ? "#22c55e" : "var(--text-muted)", borderRadius: "8px",
                cursor: "pointer", fontSize: "12px", fontWeight: 600, transition: "all 0.2s"
              }}>{t.label}</button>
            ))}
          </div>

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="grid-2" style={{ gap: "20px" }}>
              <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><Lock size={16} color="#22c55e" /> Access Control</h3>
                {[
                  { label: "Zero Trust RBAC", status: true, note: "Role-based access on every endpoint" },
                  { label: "Session Management", status: true, note: "JWT with 24h expiry" },
                  { label: "MFA", status: false, note: "Not configured (recommended)" },
                  { label: "Device Management", status: false, note: "Enterprise plan required" },
                  { label: "Data Retention Policy", status: true, note: `${gov.security.retentionDays} days retention` },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 4 ? "1px solid var(--panel-border)" : "none" }}>
                    <div>
                      <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{item.label}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item.note}</div>
                    </div>
                    <StatusBadge ok={item.status} label={item.status ? "On" : "Off"} />
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><Eye size={16} color="#22c55e" /> Data Protection</h3>
                {[
                  { label: "End-to-End Encryption", status: gov.security.encryptionEnabled, note: "AES-256 for recordings at rest" },
                  { label: "PII Masking (AI)", status: gov.security.piiMaskingEnabled, note: "Emails, phones stripped before AI" },
                  { label: "Prompt Injection Guard", status: true, note: "Firewall on all AI calls" },
                  { label: "Audit Trail", status: gov.security.auditLogsActive, note: "All actions logged with user + timestamp" },
                  { label: "Workspace Isolation", status: true, note: "Project-scoped data separation" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 4 ? "1px solid var(--panel-border)" : "none" }}>
                    <div>
                      <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{item.label}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item.note}</div>
                    </div>
                    <StatusBadge ok={item.status} label={item.status ? "Active" : "Off"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI CONFIG TAB */}
          {activeTab === "ai" && (
            <div className="grid-2" style={{ gap: "20px" }}>
              <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", marginBottom: "20px" }}>🤖 AI Model Router</h3>
                {[
                  { task: "Speech Transcription", model: gov.ai.speechModel, icon: "🎙️", color: "#4d96ff" },
                  { task: "Summarization & Q&A", model: gov.ai.primaryModel, icon: "🧠", color: "#a29bfe" },
                  { task: "Embeddings / RAG", model: gov.ai.embeddingModel, icon: "🔢", color: "#26c6da" },
                  { task: "NER / Extraction", model: gov.ai.nerModel, icon: "🏷️", color: "#f59e0b" },
                  { task: "Local LLM", model: gov.ai.localLlm ? "Enabled" : "Not configured", icon: "💻", color: gov.ai.localLlm ? "#22c55e" : "#6b7280" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < 4 ? "1px solid var(--panel-border)" : "none" }}>
                    <span style={{ fontSize: "20px" }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{m.task}</div>
                      <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{m.model}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }}></div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: "24px" }}>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", marginBottom: "20px" }}>⚙️ AI Policy Settings</h3>
                {[
                  { label: "PII Filter", desc: "Strip sensitive data from prompts", active: true },
                  { label: "Prompt Injection Guard", desc: "Block adversarial inputs", active: true },
                  { label: "AI Response Logging", desc: "Log model I/O for audit", active: false },
                  { label: "User Feedback Learning", desc: "Improve from corrections", active: false, note: "Coming in v3.1" },
                  { label: "Local Model Fallback", desc: "Use local LLM if Gemini fails", active: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < 4 ? "1px solid var(--panel-border)" : "none" }}>
                    <div>
                      <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{s.label}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{s.desc}{s.note ? ` — ${s.note}` : ""}</div>
                    </div>
                    <StatusBadge ok={s.active} label={s.active ? "On" : "Off"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATA STATS TAB */}
          {activeTab === "data" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
              {[
                { label: "Total Meetings", value: gov.stats.totalMeetings, icon: "🎙️", color: "#4d96ff" },
                { label: "Total Tasks", value: gov.stats.totalTasks, icon: "✅", color: "#22c55e" },
                { label: "Decisions Logged", value: gov.stats.totalDecisions, icon: "⚖️", color: "#a29bfe" },
                { label: "Knowledge Vectors", value: gov.stats.totalEmbeddings, icon: "🔢", color: "#26c6da" },
                { label: "Active Users", value: gov.stats.totalUsers, icon: "👥", color: "#f59e0b" },
                { label: "Data Retention", value: `${gov.security.retentionDays}d`, icon: "🗓️", color: "#6bcb77" },
              ].map((s, i) => (
                <div key={i} className="glass-card" style={{ padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>{s.icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: s.color, marginBottom: "4px" }}>{s.value}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === "integrations" && (
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>Connect NinaivuNet to your existing tools. Integration architecture is ready — provide API credentials to activate.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                {gov.integrations.map((intg, i) => (
                  <div key={i} className="glass-card" style={{ padding: "24px", textAlign: "center", position: "relative" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>{intg.icon}</div>
                    <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{intg.name}</h3>
                    <StatusBadge ok={intg.status === "connected"} label={intg.status === "connected" ? "Connected" : "Not Connected"} />
                    <button style={{ display: "block", width: "100%", marginTop: "14px", padding: "9px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--panel-border)", color: "var(--text-muted)", borderRadius: "8px", cursor: "not-allowed", fontSize: "12px", fontWeight: 600 }}>
                      🔗 Connect (Coming Soon)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === "audit" && (
            <div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "16px", fontSize: "16px" }}>Recent Security Events</h3>
              {gov.recentAuditLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>No audit events recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {gov.recentAuditLogs.map((log, i) => (
                    <div key={i} className="glass-card" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: log.action.includes("FAIL") || log.action.includes("DELETE") ? "#ef4444" : "#22c55e", flexShrink: 0 }}></div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{log.action}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>👤 {log.user_id}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
