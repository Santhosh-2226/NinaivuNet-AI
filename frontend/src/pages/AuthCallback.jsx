import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access && refresh) {
      localStorage.setItem("vs_access_token", access);
      localStorage.setItem("vs_refresh_token", refresh);
      // Redirect to dashboard (this will trigger initAuth to fetch the profile)
      window.location.href = "/dashboard";
    } else {
      navigate("/login?error=oauth_callback_failed");
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--text-primary)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
        <p style={{ fontWeight: 600 }}>Authenticating with Google...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
