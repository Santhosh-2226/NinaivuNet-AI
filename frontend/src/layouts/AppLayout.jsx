import React, { useState, useEffect } from "react";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { LayoutDashboard, FolderKanban, Bell, User, LogOut, Menu, X, Brain, BookOpen, Shield, Sun, Moon } from "lucide-react";
import api from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

const AppLayout = () => {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isMobile = useIsMobile();

  // Poll unread notifications count — only once on mount, then every 12s
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/notifications");
        if (data.ok && data.notifications) {
          const unread = data.notifications.filter(n => !n.isRead).length;
          setUnreadNotifications(unread);
        }
      } catch (err) {
        console.error("Failed to load notifications count:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 12000);
    return () => clearInterval(interval);
  }, [isAuthenticated]); // ← removed location.pathname: was firing on every page nav

  // Dual-Theme state and effect persistence hooks
  const [theme, setTheme] = useState(localStorage.getItem("vs_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vs_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    if (user?.preferredLanguage) {
      i18n.changeLanguage(user.preferredLanguage);
    }
  }, [user?.preferredLanguage, i18n]);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const primaryNav = [
    { name: t("dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("projects"), path: "/projects", icon: FolderKanban },
    { name: t("intelligence"), path: "/intelligence", icon: Brain },
    { name: t("memory"), path: "/memory", icon: BookOpen },
    { name: t("governance"), path: "/governance", icon: Shield },
  ];

  const secondaryNav = [
    { name: t("notifications"), path: "/notifications", icon: Bell },
    { name: t("profile"), path: "/profile", icon: User },
  ];

  const getInitials = (name) => {
    if (!name) return "VS";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isMobile) {
    return (
      <div className="app-container" style={{ paddingBottom: "80px" }}>
        {/* Mobile Header */}
        <header className="main-header-mobile" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-surface)", borderBottom: "1px solid var(--panel-border)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>NinaivuNet AI</span>
          <Link to="/notifications" style={{ position: "relative", display: "flex", alignItems: "center", color: "var(--text-primary)" }}>
            <Bell size={22} />
            {unreadNotifications > 0 && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "var(--danger)",
                color: "white",
                borderRadius: "50%",
                padding: "2px 5px",
                fontSize: "9px",
                fontWeight: "bold",
                minWidth: "14px",
                textAlign: "center",
                lineHeight: "1"
              }}>
                {unreadNotifications}
              </span>
            )}
          </Link>
        </header>

        {/* Mobile Side Drawer (collapsible secondary actions) */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} style={{ zIndex: 110 }}>
          <div className="sidebar-header">
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "18px" }}>Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ display: "flex", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
            >
              <X size={20} />
            </button>
          </div>
          <nav className="sidebar-nav">
            <Link to="/profile" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname.startsWith("/profile") ? "active" : ""}`}>
              <User size={16} /> {t("profile")}
            </Link>
            <Link to="/governance" onClick={() => setSidebarOpen(false)} className={`nav-link ${location.pathname.startsWith("/governance") ? "active" : ""}`}>
              <Shield size={16} /> {t("governance")}
            </Link>
          </nav>
          <div className="sidebar-footer">
            <div className="user-profile-widget" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "12px" }}>
              <div className="flex align-center gap-12" style={{ minWidth: 0, flex: 1 }}>
                <div className="user-avatar">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <div className="user-info">
                  <p className="user-name">{user?.name}</p>
                  <p className="user-email">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary w-full"
              style={{ padding: "8px 12px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <LogOut size={15} />
              {t("logout")}
            </button>
          </div>
        </aside>

        {/* View content wrapper */}
        <main className="content-wrapper" style={{ padding: "16px 12px" }}>
          <Outlet />
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="bottom-nav-mobile">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Backdrop overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 90
            }}
          ></div>
        )}
      </div>
    );
  }

  // Desktop layout (existing sidebar design)
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: "30px",
                height: "30px",
                objectFit: "contain",
                borderRadius: "6px",
                filter: theme === "light" ? "url(#key-out-black)" : "none",
                mixBlendMode: theme === "light" ? "normal" : "screen"
              }}
            />
            <span>NinaivuNet AI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ display: "flex", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
            className="md-hide"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            );
          })}

          <div style={{ height: "1px", background: "var(--panel-border)", margin: "8px 12px" }}></div>

          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link ${isActive ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon size={16} />
                  {item.name}
                </div>
                {item.path === "/notifications" && unreadNotifications > 0 && (
                  <span style={{
                    background: "var(--danger)",
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    minWidth: "16px",
                    textAlign: "center",
                    lineHeight: "1"
                  }}>
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-widget" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div className="flex align-center gap-12" style={{ minWidth: 0, flex: 1 }}>
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
              <div className="user-info">
                <p className="user-name">{user?.name}</p>
                <p className="user-email">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                transition: "background var(--duration-fast)"
              }}
              className="glow-hover"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary w-full"
            style={{ padding: "8px 12px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <LogOut size={15} />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main-content">
        {/* Mobile Navbar Header */}
        <header className="main-header-mobile">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer" }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "18px" }}>NinaivuNet AI</span>
          <div className="user-avatar" style={{ width: "32px", height: "32px", fontSize: "11px" }}>
            {getInitials(user?.name)}
          </div>
        </header>

        {/* View content wrapper */}
        <main className="content-wrapper">
          <Outlet />
        </main>
      </div>

      {/* Mobile Backdrop overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 90
          }}
        ></div>
      )}
      {/* SVG Chroma Key Filter for Black Background Logos */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="key-out-black" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              3 3 3 0 -0.1
            "/>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default AppLayout;
