import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Brain, Send, AlertTriangle, TrendingUp, Users, Loader, RefreshCw, ChevronRight } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

const hostname = window.location.hostname;
const API = `http://${hostname}:3000`;

const riskColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
const riskBg = { high: "rgba(239,68,68,0.08)", medium: "rgba(245,158,11,0.08)", low: "rgba(34,197,94,0.08)" };
const riskBorder = { high: "rgba(239,68,68,0.25)", medium: "rgba(245,158,11,0.25)", low: "rgba(34,197,94,0.25)" };

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState("copilot");
  const [question, setQuestion] = useState("");
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState([
    { role: "ai", text: `<p>👋 I'm your <strong>AI Executive Copilot</strong>. Ask me anything about your organization:</p><ul style="margin:8px 0 0 16px;font-size:13px;color:var(--text-secondary);"><li>Which projects are at risk this month?</li><li>Which team has the highest workload?</li><li>What major decisions were taken this quarter?</li><li>Show all delayed deliverables.</li></ul>` }
  ]);
  const [loading, setLoading] = useState(false);
  const [riskMap, setRiskMap] = useState([]);
  const [scores, setScores] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadData() {
    setDataLoading(true);
    try {
      const [risk, collab, pred] = await Promise.all([
        axios.get(`${API}/api/db/org-risk-map`),
        axios.get(`${API}/api/db/collaboration-scores`),
        axios.get(`${API}/api/db/predictive-analytics`),
      ]);
      if (risk.data.ok) setRiskMap(risk.data.riskMap);
      if (collab.data.ok) setScores(collab.data.scores);
      if (pred.data.ok) setPredictions(pred.data.predictions);
    } catch (e) { console.error(e); }
    setDataLoading(false);
  }

  async function askCopilot(e) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/db/executive-copilot`, { question: q });
      setMessages(prev => [...prev, { role: "ai", text: res.data.answer || "I couldn't find a clear answer." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: `<span style="color:#f87171">⚠ Error: ${e.response?.data?.error || e.message}</span>` }]);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "copilot", label: "🤖 AI Copilot", icon: Brain },
    { id: "risk", label: "🗺 Risk Map", icon: AlertTriangle },
    { id: "analytics", label: "📈 Predictions", icon: TrendingUp },
    { id: "scores", label: "🏆 Collaboration", icon: Users },
  ];

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "32px 40px", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={22} color="white" />
          </div>
          <div>
            <h1 className="h-outfit" style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>AI Intelligence Center</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>Autonomous Organizational Intelligence — NinaivuNet AI 3.0</p>
          </div>
          <button onClick={loadData} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.01)", border: "1px solid var(--panel-border)", color: "var(--text-muted)", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="scroll-tabs-mobile" style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "rgba(255,255,255,0.01)", padding: "4px", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "10px 16px", background: activeTab === t.id ? "linear-gradient(135deg,rgba(108,92,231,0.3),rgba(162,155,254,0.1))" : "transparent",
            border: activeTab === t.id ? "1px solid rgba(162,155,254,0.3)" : "1px solid transparent",
            color: activeTab === t.id ? "#a29bfe" : "var(--text-muted)", borderRadius: "8px",
            cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* === COPILOT TAB === */}
      {activeTab === "copilot" && (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "65vh" }}>
          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start" }}>
                {msg.role === "ai" && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Brain size={16} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: "75%", padding: "14px 18px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg,#6c5ce7,#a29bfe)" : "var(--bg-surface)",
                  border: msg.role === "ai" ? "1px solid var(--panel-border)" : "none",
                  color: msg.role === "user" ? "white" : "var(--text-primary)", fontSize: "14px", lineHeight: "1.6"
                }}>
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Brain size={16} color="white" />
                </div>
                <div style={{ padding: "14px 18px", background: "var(--bg-surface)", border: "1px solid var(--panel-border)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: "6px", alignItems: "center" }}>
                  <Loader size={14} color="#a29bfe" className="spin" />
                  <span style={{ color: "#a29bfe", fontSize: "13px" }}>Analyzing org data...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input */}
          <form onSubmit={askCopilot} style={{ padding: "16px 24px", borderTop: "1px solid var(--panel-border)", display: "flex", gap: "12px" }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask anything about your organization... (e.g. 'Which projects are at risk?')"
              style={{ flex: 1, background: "var(--bg-base)", border: "1px solid var(--panel-border)", color: "var(--text-primary)", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none" }}
            />
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", border: "none", color: "white", padding: "12px 20px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
              <Send size={16} /> Ask
            </button>
          </form>
        </div>
      )}

      {/* === RISK MAP TAB === */}
      {activeTab === "risk" && (
        <div>
          <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
            {["high","medium","low"].map(r => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: riskColor[r] }}></div>
                {r.charAt(0).toUpperCase() + r.slice(1)} Risk ({riskMap.filter(p => p.riskLevel === r).length})
              </div>
            ))}
          </div>
          {dataLoading ? <div style={{ textAlign: "center", padding: "60px" }}><div className="spinner"></div></div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {riskMap.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No projects found. Create projects to see the risk map.</p> : riskMap.map(p => (
                <div key={p.project_id} className="glass-card" style={{ padding: "24px", borderLeft: `4px solid ${riskColor[p.riskLevel]}`, background: riskBg[p.riskLevel], border: `1px solid ${riskBorder[p.riskLevel]}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{p.name}</h3>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", background: riskBg[p.riskLevel], color: riskColor[p.riskLevel], border: `1px solid ${riskBorder[p.riskLevel]}` }}>{p.riskLevel}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.01)", borderRadius: "6px" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: p.openTasks > 5 ? "var(--warning)" : "var(--text-primary)" }}>{p.openTasks}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Open Tasks</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.01)", borderRadius: "6px" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: p.overdueTasks > 0 ? "var(--danger)" : "var(--text-primary)" }}>{p.overdueTasks}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Overdue</div>
                    </div>
                  </div>
                  {p.riskReasons.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: "14px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      {p.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                  {p.lastActivity && <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "10px 0 0" }}>Last activity: {new Date(p.lastActivity).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === PREDICTIONS TAB === */}
      {activeTab === "analytics" && (
        <div>
          {dataLoading ? <div style={{ textAlign: "center", padding: "60px" }}><div className="spinner"></div></div> : (
            predictions.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No project data yet for predictions.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {predictions.map(p => {
                  const burn = p.burnoutRisk;
                  const burnColor = burn === "high" ? "#ef4444" : burn === "medium" ? "#f59e0b" : "#22c55e";
                  const forecastColor = p.completionForecast === "at risk" ? "#ef4444" : p.completionForecast === "slight delay" ? "#f59e0b" : "#22c55e";
                  return (
                    <div key={p.project_id} className="glass-card" style={{ padding: "24px" }}>
                      <div className="flex justify-between align-center flex-mobile-stack" style={{ marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{p.name}</h3>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: `${forecastColor}20`, color: forecastColor, border: `1px solid ${forecastColor}40` }}>{p.completionForecast.toUpperCase()}</span>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: `${burnColor}20`, color: burnColor, border: `1px solid ${burnColor}40` }}>🔥 Burnout: {burn}</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                          <span>Task Completion Rate</span><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.completionRate}%</span>
                        </div>
                        <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p.completionRate}%`, background: "linear-gradient(90deg,#6c5ce7,#a29bfe)", borderRadius: "4px", transition: "width 1s ease" }}></div>
                        </div>
                      </div>
                      <div className="grid-4" style={{ gap: "8px" }}>
                        {[
                          { label: "Open Tasks", value: p.openTasks, color: p.openTasks > 10 ? "var(--warning)" : "var(--text-primary)" },
                          { label: "Overdue", value: p.overdueTasks, color: p.overdueTasks > 0 ? "var(--danger)" : "var(--success)" },
                          { label: "Members", value: p.memberCount, color: "var(--text-primary)" },
                          { label: "Meetings", value: p.meetingFrequency, color: "var(--text-primary)" },
                        ].map((stat, i) => (
                          <div key={i} style={{ textAlign: "center", padding: "10px", background: "rgba(255,255,255,0.01)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "22px", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* === COLLABORATION SCORES TAB === */}
      {activeTab === "scores" && (
        <div>
          {dataLoading ? <div style={{ textAlign: "center", padding: "60px" }}><div className="spinner"></div></div> : (
            scores.length === 0 ? (
              <div className="glass-card" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                <Users size={48} style={{ marginBottom: "16px", opacity: 0.4 }} />
                <p>No attendance data yet. Scores will appear after team members join meetings.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "8px" }}>
                  🔒 Collaboration scores are visible only to project leads. These measure team health, not individual performance.
                </p>
                {scores.map((s, i) => (
                  <div key={s.user} className="glass-card flex-mobile-stack" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `hsl(${(i * 47) % 360}, 60%, 50%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: "14px", flexShrink: 0 }}>
                      {s.user.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "15px" }}>{s.user}</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, color: s.overallScore >= 70 ? "var(--success)" : s.overallScore >= 40 ? "var(--warning)" : "var(--danger)" }}>{s.overallScore}<span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>/100</span></span>
                      </div>
                      <div className="grid-3" style={{ gap: "8px" }}>
                        {[
                          { label: "Participation", value: s.participationScore },
                          { label: "Follow-Through", value: s.followThroughScore ?? "N/A" },
                          { label: "Engagement", value: s.speakingScore },
                        ].map((metric, mi) => (
                          <div key={mi}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                              <span>{metric.label}</span><span style={{ color: "var(--text-primary)" }}>{metric.value}{typeof metric.value === "number" ? "%" : ""}</span>
                            </div>
                            <div style={{ height: "4px", background: "rgba(0,0,0,0.04)", borderRadius: "2px" }}>
                              <div style={{ height: "100%", width: `${metric.value || 0}%`, background: "linear-gradient(90deg,#6c5ce7,#a29bfe)", borderRadius: "2px" }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
