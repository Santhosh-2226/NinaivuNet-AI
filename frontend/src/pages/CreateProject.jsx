import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

const CreateProject = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("corporate");
  const [color, setColor] = useState("#6c5ce7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  // Organization & Department state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");

  const [newOrgName, setNewOrgName] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewDept, setShowNewDept] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const res = await api.get("/org/organizations");
        if (res.data.ok) {
          setOrganizations(res.data.organizations || []);
        }
      } catch (err) {
        console.error("Failed to load organizations:", err);
      }
    };
    loadOrgs();
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setDepartments([]);
      setSelectedDept("");
      return;
    }
    const loadDepts = async () => {
      try {
        const res = await api.get(`/org/organizations/${selectedOrg}/departments`);
        if (res.data.ok) {
          setDepartments(res.data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    };
    loadDepts();
  }, [selectedOrg]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const res = await api.post("/org/organizations", { name: newOrgName });
      if (res.data.ok) {
        setOrganizations([...organizations, res.data.organization]);
        setSelectedOrg(res.data.organization._id);
        setNewOrgName("");
        setShowNewOrg(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create organization");
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim() || !selectedOrg) return;
    try {
      const res = await api.post("/org/departments", { name: newDeptName, organizationId: selectedOrg });
      if (res.data.ok) {
        setDepartments([...departments, res.data.department]);
        setSelectedDept(res.data.department._id);
        setNewDeptName("");
        setShowNewDept(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create department");
    }
  };

  const colors = [
    { value: "#6c5ce7", label: "Purple" },
    { value: "#00a8ff", label: "Blue" },
    { value: "#4cd137", label: "Green" },
    { value: "#e84118", label: "Red" },
    { value: "#fbc531", label: "Yellow" },
    { value: "#9c88ff", label: "Lavender" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/projects", { 
        name, 
        description, 
        domain, 
        color,
        organization: selectedOrg || undefined,
        department: selectedDept || undefined
      });
      if (res.data.ok) {
        navigate(`/projects/${res.data.project.id || res.data.project._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: isMobile ? "100%" : "600px", margin: "0 auto", padding: isMobile ? "0 4px" : "0" }}>
      <div style={{ marginBottom: isMobile ? "20px" : "32px" }}>
        <h1 className="h-outfit" style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: 700, marginBottom: "8px" }}>
          Create New Project
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "13px" : "15px" }}>
          Set up a new workspace for your team. You'll automatically become the Manager.
        </p>
      </div>

      {error && (
        <div style={{ padding: "16px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", color: "var(--danger)", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card">
        <div className="form-group">
          <label className="form-label">Project / Course Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Alpha Development Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows="4"
            placeholder="What is this workspace about? Keep your team in the loop."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: "none", fontFamily: "inherit" }}
            disabled={loading}
          ></textarea>
        </div>

        <div className="form-group">
          <label className="form-label">Workspace Domain</label>
          <select
            className="form-input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={loading}
            style={{ cursor: "pointer" }}
          >
            <option value="corporate">Corporate (Manager / Developer)</option>
            <option value="education">Education (Teacher / Student)</option>
          </select>
        </div>

        {/* Organization Layer Selection */}
        <div className="form-group">
          <div className="flex justify-between align-center flex-mobile-stack" style={{ marginBottom: "6px" }}>
            <label className="form-label" style={{ margin: 0 }}>Organization (Optional)</label>
            <button
              type="button"
              onClick={() => setShowNewOrg(!showNewOrg)}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
            >
              {showNewOrg ? "Select Existing" : "+ Create New Org"}
            </button>
          </div>
          {showNewOrg ? (
            <div className="flex gap-8">
              <input
                type="text"
                className="form-input"
                placeholder="New Organization Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={handleCreateOrg}>Add</button>
            </div>
          ) : (
            <select
              className="form-input"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              disabled={loading}
            >
              <option value="">No Organization (Isolated Project)</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>{org.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Department Layer Selection */}
        {selectedOrg && (
          <div className="form-group">
            <div className="flex justify-between align-center flex-mobile-stack" style={{ marginBottom: "6px" }}>
              <label className="form-label" style={{ margin: 0 }}>Department (Optional)</label>
              <button
                type="button"
                onClick={() => setShowNewDept(!showNewDept)}
                style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
              >
                {showNewDept ? "Select Existing" : "+ Create New Dept"}
              </button>
            </div>
            {showNewDept ? (
              <div className="flex gap-8">
                <input
                  type="text"
                  className="form-input"
                  placeholder="New Department Name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleCreateDept}>Add</button>
              </div>
            ) : (
              <select
                className="form-input"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={loading}
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ marginBottom: "12px" }}>Project Workspace Color</label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: c.value,
                  border: color === c.value ? "3px solid white" : "none",
                  cursor: "pointer",
                  transition: "all 0.1s ease",
                  outline: "none",
                }}
                title={c.label}
              ></button>
            ))}
          </div>
        </div>

        <div className="flex gap-12" style={{ marginTop: "32px", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard")}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProject;
