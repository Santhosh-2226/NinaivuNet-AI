import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";
import { useAuth } from "./contexts/AuthContext";

// ── Lazy-load every page so only the current route's JS is downloaded ──
const Login          = lazy(() => import("./pages/Login"));
const Register       = lazy(() => import("./pages/Register"));
const AuthCallback   = lazy(() => import("./pages/AuthCallback"));
const Dashboard      = lazy(() => import("./pages/Dashboard"));
const Projects       = lazy(() => import("./pages/Projects"));
const ProjectDetail  = lazy(() => import("./pages/ProjectDetail"));
const CreateProject  = lazy(() => import("./pages/CreateProject"));
const Profile        = lazy(() => import("./pages/Profile"));
const Notifications  = lazy(() => import("./pages/Notifications"));
const IntelligencePage = lazy(() => import("./pages/IntelligencePage"));
const OrgMemoryPage  = lazy(() => import("./pages/OrgMemoryPage"));
const GovernancePage = lazy(() => import("./pages/GovernancePage"));

// Minimal inline fallback — avoids a separate Spinner component bundle
const PageLoader = () => (
  <div className="spinner-container">
    <div className="spinner"></div>
  </div>
);

const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login"         element={<Login />} />
              <Route path="/register"      element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/projects"           element={<Projects />} />
              <Route path="/projects/create"    element={<CreateProject />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/notifications"      element={<Notifications />} />
              <Route path="/profile"            element={<Profile />} />
              <Route path="/intelligence"       element={<IntelligencePage />} />
              <Route path="/memory"             element={<OrgMemoryPage />} />
              <Route path="/governance"         element={<GovernancePage />} />
            </Route>

            <Route path="/"  element={<RootRoute />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
