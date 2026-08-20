import React, { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, Search, GitBranch, Zap, Loader, Clock, CheckSquare, Lightbulb, BarChart2 } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

const hostname = window.location.hostname;
const API = `http://${hostname}:3000`;

const typeConfig = {
  decision: { label: "Decision", color: "#a29bfe", icon: "⚖️", bg: "rgba(162,155,254,0.08)" },
  task_completed: { label: "Task Done", color: "#22c55e", icon: "✅", bg: "rgba(34,197,94,0.08)" },
  meeting_summary: { label: "Meeting", color: "#4d96ff", icon: "🎙️", bg: "rgba(77,150,255,0.08)" },
  lesson: { label: "Lesson Learned", color: "#f59e0b", icon: "💡", bg: "rgba(245,158,11,0.08)" },
  technical: { label: "Technical", color: "#26c6da", icon: "🔧", bg: "rgba(38,198,218,0.08)" },
  risk: { label: "Risk", color: "#ef4444", icon: "⚠️", bg: "rgba(239,68,68,0.08)" },
  process: { label: "Process", color: "#6bcb77", icon: "📋", bg: "rgba(107,203,119,0.08)" },
};

function getTypeConfig(type) {
  return typeConfig[type] || { label: type, color: "#a29bfe", icon: "📌", bg: "rgba(162,155,254,0.08)" };
}

export default function OrgMemoryPage() {
  const [activeTab, setActiveTab] = useState("timeline");
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Digital Twin
  const [twinData, setTwinData] = useState(null);

  // Decision Simulator
  const [scenario, setScenario] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Timeline filter
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadTimeline();
    loadTwin();
    loadProjects();
  }, []);

  async function loadTimeline() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/db/org-memory`);
      if (res.data.ok) setTimeline(res.data.timeline);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadTwin() {
    try {
      const riskRes = await axios.get(`${API}/api/db/org-risk-map`);
      const collabRes = await axios.get(`${API}/api/db/collaboration-scores`);
      if (riskRes.data.ok) setTwinData({ projects: riskRes.data.riskMap, scores: collabRes.data.ok ? collabRes.data.scores : [] });
    } catch (e) { console.error(e); }
  }

  async function loadProjects() {
    try {
      const res = await axios.get(`${API}/api/db/org-risk-map`);
      if (res.data.ok) setProjects(res.data.riskMap);
    } catch (e) { console.error(e); }
  }

  async function runSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await axios.post(`${API}/api/db/global-search`, { query: searchQuery });
      if (res.data.ok) setSearchResults(res.data.results);
    } catch (e) { console.error(e); }
    setSearchLoading(false);
  }

  async function runSimulation(e) {
    e.preventDefault();
    if (!scenario.trim()) return;
    setSimLoading(true);
    setSimulation(null);
    try {
      const res = await axios.post(`${API}/api/db/decision-simulator`, { scenario, projectId });
      if (res.data.ok) setSimulation(res.data.simulation);
    } catch (e) { setSimulation(`<span style="color:#ef4444">Error: ${e.message}</span>`); }
    setSimLoading(false);
  }

  const filteredTimeline = filterType === "all" ? timeline : timeline.filter(t => t.type === filterType);

  const tabs = [
    { id: "timeline", label: "📜 Org Memory", icon: Clock },
    { id: "search", label: "🔍 Global Search", icon: Search },
    { id: "twin", label: "🌳 Digital Twin", icon: GitBranch },
    { id: "simulator", label: "🎲 Decision Simulator", icon: Zap },
  ];

  return (
    <div style={{ padding: isMobile ? "16px 12px" : "32px 40px", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(135deg,#4d96ff,#26c6da)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h1 className="h-outfit" style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Organizational Memory</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>Knowledge never disappears — even when employees leave.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="scroll-tabs-mobile" style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "rgba(255,255,255,0.01)", padding: "4px", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "10px 12px", background: activeTab === t.id ? "linear-gradient(135deg,rgba(77,150,255,0.25),rgba(38,198,218,0.1))" : "transparent",
            border: activeTab === t.id ? "1px solid rgba(77,150,255,0.3)" : "1px solid transparent",
            color: activeTab === t.id ? "#4d96ff" : "var(--text-muted)", borderRadius: "8px",
            cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* === TIMELINE TAB === */}
      {activeTab === "timeline" && (
        <div>
          {/* Type filters */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
            {["all", "decision", "task_completed", "meeting_summary", "lesson", "technical", "risk"].map(type => (
              <button key={type} onClick={() => setFilterType(type)} style={{
                padding: "5px 14px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontWeight: 600,
                background: filterType === type ? (type === "all" ? "linear-gradient(135deg,#4d96ff,#26c6da)" : getTypeConfig(type).bg) : "rgba(255,255,255,0.01)",
                color: filterType === type ? (type === "all" ? "white" : getTypeConfig(type).color) : "var(--text-muted)",
                border: `1px solid ${filterType === type ? (type === "all" ? "#4d96ff" : getTypeConfig(type).color) : "var(--panel-border)"}`,
              }}>{type === "all" ? "All Events" : getTypeConfig(type).icon + " " + getTypeConfig(type).label}</button>
            ))}
          </div>

          {loading ? <div style={{ textAlign: "center", padding: "60px" }}><div className="spinner"></div></div> : (
            filteredTimeline.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
                <BookOpen size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
                <p>No organizational memory yet. Ingest meetings to start building it.</p>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <div className="timeline-vertical-line" style={{ position: "absolute", left: "24px", top: 0, bottom: 0, width: "2px", background: "rgba(77,150,255,0.15)" }}></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {filteredTimeline.map((item, i) => {
                    const cfg = getTypeConfig(item.type);
                    return (
                      <div key={i} className="timeline-item-container" style={{ display: "flex", gap: "20px", paddingLeft: "50px", paddingBottom: "20px", position: "relative" }}>
                        <div className="timeline-marker-indicator" style={{ position: "absolute", left: "17px", top: "4px", width: "16px", height: "16px", borderRadius: "50%", background: cfg.color, border: "3px solid var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", zIndex: 1 }}></div>
                        <div className="glass-card" style={{ flex: 1, padding: "16px 20px", background: cfg.bg, borderLeft: `3px solid ${cfg.color}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "16px" }}>{cfg.icon}</span>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{cfg.label}</span>
                              {item.project && <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", padding: "2px 8px", borderRadius: "10px" }}>📁 {item.project}</span>}
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Unknown date"}</span>
                          </div>
                          <p style={{ color: "var(--text-primary)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>{item.content?.replace(/<[^>]+>/g, "").slice(0, 250)}{item.content?.length > 250 ? "..." : ""}</p>
                          {item.reason && <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "6px 0 0", fontStyle: "italic" }}>Reason: {item.reason}</p>}
                          {item.source && <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: "4px 0 0" }}>📌 Source: {item.source}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* === GLOBAL SEARCH TAB === */}
      {activeTab === "search" && (
        <div>
          <form onSubmit={runSearch} style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search across all meetings, tasks, decisions, transcripts..."
                style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--panel-border)", color: "var(--text-primary)", padding: "13px 16px 13px 40px", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button type="submit" style={{ background: "linear-gradient(135deg,#4d96ff,#26c6da)", border: "none", color: "white", padding: "13px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>Search</button>
          </form>

          {searchLoading && <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner"></div></div>}

          {searchResults && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Found <strong style={{ color: "var(--text-primary)" }}>{searchResults.total}</strong> results for "{searchQuery}"</p>
              {searchResults.total === 0 && <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}><Search size={48} style={{ opacity: 0.3, marginBottom: "16px" }} /><p>No results found.</p></div>}

              {[
                { key: "meetings", label: "📅 Meetings", color: "#4d96ff" },
                { key: "tasks", label: "✅ Tasks", color: "#22c55e" },
                { key: "decisions", label: "⚖️ Decisions", color: "#a29bfe" },
                { key: "transcripts", label: "🎙 Transcripts", color: "#26c6da" },
              ].map(group => {
                const items = searchResults[group.key];
                if (!items?.length) return null;
                return (
                  <div key={group.key}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: group.color, marginBottom: "12px" }}>{group.label} ({items.length})</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {items.map((item, i) => (
                        <div key={i} className="glass-card" style={{ padding: "14px 18px", borderLeft: `3px solid ${group.color}` }}>
                          <p style={{ color: "var(--text-primary)", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
                            {item.text || item.description || item.title || item.summary || item.content || "—"}
                          </p>
                          <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                            {(item.meeting_id || item.project_id || item.project) && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>📁 {item.project_id || item.project || item.meeting_id}</span>}
                            {item.speaker && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>👤 {item.speaker}</span>}
                            {item.owner && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>👤 {item.owner}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!searchResults && !searchLoading && (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
              <Search size={60} style={{ opacity: 0.2, marginBottom: "16px" }} />
              <p style={{ fontSize: "16px", fontWeight: 600 }}>Search Across Your Organization</p>
              <p style={{ fontSize: "13px" }}>Find anything — meetings, tasks, decisions, or transcript quotes.</p>
            </div>
          )}
        </div>
      )}

      {/* === DIGITAL TWIN TAB === */}
      {activeTab === "twin" && (
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px" }}>Live organizational hierarchy with health indicators at each level.</p>
          {!twinData ? <div style={{ textAlign: "center", padding: "60px" }}><div className="spinner"></div></div> : (
            <div>
              {/* Org root */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                <div style={{ background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", padding: "16px 32px", borderRadius: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "white" }}>🏢 Organization</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>{twinData.projects.length} Projects · {twinData.scores.length} Members</div>
                </div>
              </div>

              {/* Projects level */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {twinData.projects.map(p => {
                  const riskColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[p.riskLevel];
                  return (
                    <div key={p.project_id} className="glass-card" style={{ padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0, fontSize: "15px" }}>📁 {p.name}</h4>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: riskColor, boxShadow: `0 0 8px ${riskColor}` }}></div>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                        {p.totalMeetings} meetings · {p.openTasks} open tasks
                      </div>
                      {/* Meetings sub-level */}
                      <div style={{ borderTop: "1px solid var(--panel-border)", paddingTop: "10px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Health Signals</div>
                        {p.riskReasons.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "#22c55e" }}>✅ All clear</div>
                        ) : (
                          p.riskReasons.map((r, i) => (
                            <div key={i} style={{ fontSize: "12px", color: "#f59e0b", marginBottom: "2px" }}>⚠ {r}</div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {twinData.projects.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
                  <GitBranch size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                  <p>No projects found. Create projects to build the organizational twin.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === DECISION SIMULATOR TAB === */}
      {activeTab === "simulator" && (
        <div>
          <div className="glass-card" style={{ padding: "28px", marginBottom: "24px" }}>
            <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "6px", fontSize: "17px" }}>🎲 AI Decision Simulator</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>Describe a hypothetical scenario and AI will simulate the downstream cascade of impacts, risks, and mitigations.</p>
            <form onSubmit={runSimulation}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Scenario</label>
                <textarea
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  placeholder="e.g. 'If Project X is delayed by 2 months...' or 'If we switch from PostgreSQL to MongoDB...' or 'If our lead developer leaves...'"
                  rows={4}
                  style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--panel-border)", color: "var(--text-primary)", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Project Context (Optional)</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: "100%", background: "var(--bg-base)", border: "1px solid var(--panel-border)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: "8px", fontSize: "13px" }}>
                  <option value="">No specific project (org-wide)</option>
                  {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={simLoading} style={{ background: "linear-gradient(135deg,#f59e0b,#ffd93d)", border: "none", color: "#1a1a1a", padding: "12px 28px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                {simLoading ? <><Loader size={16} className="spin" /> Simulating...</> : <><Zap size={16} /> Run Simulation</>}
              </button>
            </form>
          </div>

          {simulation && (
            <div className="glass-card" style={{ padding: "28px", borderLeft: "4px solid #f59e0b", background: "rgba(245,158,11,0.02)" }}>
              <h4 style={{ color: "#f59e0b", fontWeight: 700, marginBottom: "16px", fontSize: "15px" }}>🔮 Impact Simulation Results</h4>
              <div style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: "1.7" }} dangerouslySetInnerHTML={{ __html: simulation }} />
            </div>
          )}

          {!simulation && !simLoading && (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <Zap size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
              <p style={{ fontSize: "15px", fontWeight: 600 }}>Simulate Before You Decide</p>
              <p style={{ fontSize: "13px" }}>Enter any hypothetical scenario and see its ripple effects before acting.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
