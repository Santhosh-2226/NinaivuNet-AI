import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { User, Key, Check, Globe } from "lucide-react";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();

  const [name, setName] = useState(user?.name || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || "en");
  const [autoTranslate, setAutoTranslate] = useState(user?.autoTranslate !== false);
  const [translateCaptions, setTranslateCaptions] = useState(user?.translateCaptions !== false);
  const [translateDashboard, setTranslateDashboard] = useState(user?.translateDashboard !== false);
  const [translateEmails, setTranslateEmails] = useState(user?.translateEmails !== false);
  const [translateAI, setTranslateAI] = useState(user?.translateAI !== false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError("");
    setLoading(true);

    const res = await updateProfile(name, profilePicture, {
      preferredLanguage,
      autoTranslate,
      translateCaptions,
      translateDashboard,
      translateEmails,
      translateAI
    });

    if (res.success) {
      setSuccess(true);
      i18n.changeLanguage(preferredLanguage);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ta", label: "Tamil (தமிழ்)" },
    { code: "hi", label: "Hindi (हिन्दी)" },
    { code: "es", label: "Spanish (Español)" },
    { code: "fr", label: "French (Français)" },
    { code: "de", label: "German (Deutsch)" },
    { code: "zh", label: "Chinese (中文)" },
    { code: "ja", label: "Japanese (日本語)" },
    { code: "ar", label: "Arabic (العربية)" },
  ];

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="h-outfit" style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
          {t("profile")}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
          Update your account details and profile preferences.
        </p>
      </div>

      {success && (
        <div className="flex align-center gap-8" style={{ padding: "16px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "var(--success)", marginBottom: "24px" }}>
          <Check size={18} /> {t("save_success")}
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "var(--danger)", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <form onSubmit={handleSubmit} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 className="h-outfit flex align-center gap-8" style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
            <User size={18} /> General Information
          </h3>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Cannot change)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ""}
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Profile Image URL (Optional)</label>
            <input
              type="url"
              className="form-input"
              placeholder="e.g. https://example.com/avatar.jpg"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              disabled={loading}
            />
          </div>

          <h3 className="h-outfit flex align-center gap-8" style={{ fontSize: "18px", fontWeight: 600, borderTop: "1px solid var(--panel-border)", paddingTop: "20px", margin: 0 }}>
            <Globe size={18} /> {t("profile_settings")}
          </h3>

          <div className="form-group">
            <label className="form-label">{t("preferred_language")}</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="form-input"
              disabled={loading}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {[
              { id: "autoTranslate", label: t("auto_translate"), checked: autoTranslate, setter: setAutoTranslate },
              { id: "translateCaptions", label: t("translate_captions"), checked: translateCaptions, setter: setTranslateCaptions },
              { id: "translateDashboard", label: t("translate_dashboard"), checked: translateDashboard, setter: setTranslateDashboard },
              { id: "translateEmails", label: t("translate_emails"), checked: translateEmails, setter: setTranslateEmails },
              { id: "translateAI", label: t("translate_ai"), checked: translateAI, setter: setTranslateAI },
            ].map((setting) => (
              <label key={setting.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={setting.checked}
                  onChange={(e) => setting.setter(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  disabled={loading}
                />
                {setting.label}
              </label>
            ))}
          </div>

          <div className="flex justify-end" style={{ marginTop: "12px" }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : t("save")}
            </button>
          </div>
        </form>

        <div className="glass-card">
          <h3 className="h-outfit flex align-center gap-8" style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "var(--text-muted)", margin: 0 }}>
            <Key size={18} /> Security Credentials
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
            Password reset and email verification flows are enabled for verified cloud deployments. To update your password, contact your workspace Administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
