import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const result = await register(name, email, password);
      if (result && result.success) {
        navigate("/dashboard");
      } else {
        setError(result?.error || "Registration failed. Please check inputs.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const hostname = window.location.hostname;
    window.location.href = `http://${hostname}:4000/api/auth/google`;
  };

  return (
    <div className="glass-card glow-hover" style={{ padding: "var(--auth-card-padding, 40px)" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <img
          src="/logo.png"
          alt="NinaivuNet AI Logo"
          style={{
            width: "var(--auth-logo-size, 150px)",
            height: "var(--auth-logo-size, 150px)",
            objectFit: "contain",
            marginBottom: "16px",
            mixBlendMode: "screen"
          }}
        />
        <h2 style={{ fontSize: "28px", fontWeight: 700, fontFamily: "Outfit", color: "var(--text-primary)", marginBottom: "8px" }}>
          Get Started
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Create an account to manage your projects
        </p>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Santhosh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            placeholder="e.g. name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          style={{ padding: "12px", fontSize: "15px", marginTop: "8px", display: "block" }}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div style={{ position: "relative", margin: "24px 0", textAlign: "center" }}>
        <span style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "var(--panel-border)", zIndex: 1 }}></span>
        <span style={{ position: "relative", zIndex: 2, background: "var(--bg-card)", padding: "0 12px", fontSize: "12px", color: "var(--text-muted)" }}>OR SIGN UP WITH</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn btn-secondary w-full"
        style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "14px" }}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.827-6.357-6.314s2.848-6.314 6.357-6.314c1.614 0 3.15.586 4.35 1.625l3.125-3.086C18.847 1.838 15.682 1 12.24 1 6.033 1 1 5.922 1 12s5.033 11 11.24 11c6.545 0 10.87-4.542 10.87-10.978 0-.67-.06-1.3-.175-1.737H12.24Z" />
        </svg>
        Google
      </button>

      <p style={{ marginTop: "32px", textAlign: "center", fontSize: "14px", color: "var(--text-secondary)" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ fontWeight: 600 }}>
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default Register;
