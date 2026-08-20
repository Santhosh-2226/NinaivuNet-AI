import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Folder, Plus, ArrowRight } from "lucide-react";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        if (res.data.ok) {
          setProjects(res.data.projects);
        }
      } catch (err) {
        setError("Failed to fetch project list.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between align-center flex-mobile-stack" style={{ marginBottom: "32px" }}>
        <div>
          <h1 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
            My Projects
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
            Manage and access all of your active project workspaces.
          </p>
        </div>
        <Link to="/projects/create" className="btn btn-primary">
          <Plus size={16} />
          Create Project
        </Link>
      </div>

      {error && (
        <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "var(--danger)", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Folder size={48} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No Projects Found</h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto 24px" }}>
            You haven't created or joined any workspaces yet. Create one to get started.
          </p>
          <Link to="/projects/create" className="btn btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className="grid-2">
          {projects.map((proj) => (
            <div
              key={proj._id || proj.id}
              onClick={() => navigate(`/projects/${proj._id || proj.id}`)}
              className="glass-card glow-hover"
              style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" }}
            >
              <div>
                <div className="flex justify-between align-center" style={{ marginBottom: "16px" }}>
                  <div className="flex align-center gap-8">
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: proj.color || "var(--primary)" }}></div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, trackingWidth: "0.05em" }}>
                      {proj.domain}
                    </span>
                  </div>
                  <span className="pill pill-primary" style={{ textTransform: "capitalize" }}>{proj.myRole}</span>
                </div>
                <h3 className="h-outfit" style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>{proj.name}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "20px" }}>
                  {proj.description || "No project description provided."}
                </p>
              </div>
              <div className="flex justify-between align-center" style={{ paddingTop: "12px", borderTop: "1px solid var(--panel-border)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Joined {new Date(proj.joinedAt || proj.createdAt).toLocaleDateString()}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>
                  Open Workspace <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
