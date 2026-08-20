import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("vs_access_token");
      if (accessToken) {
        try {
          const { data } = await api.get("/auth/me");
          if (data.ok) {
            setUser(data.user);
          }
        } catch (err) {
          console.error("Auth initialization failed:", err);
          localStorage.removeItem("vs_access_token");
          localStorage.removeItem("vs_refresh_token");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data && data.ok) {
        localStorage.setItem("vs_access_token", data.accessToken);
        localStorage.setItem("vs_refresh_token", data.refreshToken);
        setUser(data.user);
        return { success: true };
      }
      return {
        success: false,
        error: data?.message || "Login failed",
      };
    } catch (err) {
      if (window.location.hostname !== "localhost") {
        alert("Mobile Debug Info:\nError: " + (err.message || err.toString()) + "\nBaseURL: " + api.defaults.baseURL + "\nRequest URL: " + err.config?.url);
      }
      return {
        success: false,
        error: err.response?.data?.error || err.response?.data?.message || "Login failed",
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      if (data && data.ok) {
        localStorage.setItem("vs_access_token", data.accessToken);
        localStorage.setItem("vs_refresh_token", data.refreshToken);
        setUser(data.user);
        return { success: true };
      }
      return {
        success: false,
        error: data?.message || "Registration failed",
      };
    } catch (err) {
      if (window.location.hostname !== "localhost") {
        alert("Mobile Debug Info:\nError: " + (err.message || err.toString()) + "\nBaseURL: " + api.defaults.baseURL + "\nRequest URL: " + err.config?.url);
      }
      return {
        success: false,
        error: err.response?.data?.error || err.response?.data?.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      localStorage.removeItem("vs_access_token");
      localStorage.removeItem("vs_refresh_token");
      // Redirect to the landing page after logout (avoid setting user null instantly to prevent Navigate flash)
      window.location.href = `http://${window.location.hostname}:3001`;
    }
  };

  const updateProfile = async (name, profilePicture, extraSettings = {}) => {
    try {
      const { data } = await api.patch("/auth/profile", { name, profilePicture, ...extraSettings });
      if (data.ok) {
        setUser(data.user);
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || "Profile update failed",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
