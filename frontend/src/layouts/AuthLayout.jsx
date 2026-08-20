import React, { useState, useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Calendar } from "lucide-react";

const ThreeDGlobe = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let width = canvas.width = containerRef.current.clientWidth;
    let height = canvas.height = containerRef.current.clientHeight;
    
    // Generate 3D points on a sphere
    const points = [];
    const numPoints = 85;
    const radius = Math.min(width, height) * 0.38;
    
    for (let i = 0; i < numPoints; i++) {
      const theta = Math.acos(Math.random() * 2 - 1);
      const phi = Math.random() * Math.PI * 2;
      points.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(theta),
      });
    }
    
    let angleX = 0.003;
    let angleY = 0.003;
    
    const handleMouseMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      angleY = x * 0.00003;
      angleX = y * 0.00003;
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      
      const projected = points.map(p => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;
        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;
        
        p.x = x1;
        p.y = y2;
        p.z = z2;
        
        const distance = 350;
        const scale = distance / (distance + z2);
        return {
          x: x1 * scale + width / 2,
          y: y2 * scale + height / 2,
          z: z2,
          scale,
        };
      });
      
      // Draw links
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < radius * 0.65) {
            const alpha = (1 - dist / (radius * 0.65)) * 0.12;
            ctx.strokeStyle = `rgba(108, 92, 231, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }
      
      // Draw nodes
      projected.forEach(p => {
        const alpha = Math.max(0.1, (radius - p.z) / (radius * 2));
        ctx.fillStyle = `rgba(108, 92, 231, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.scale * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    const handleResize = () => {
      if (!containerRef.current) return;
      width = canvas.width = containerRef.current.clientWidth;
      height = canvas.height = containerRef.current.clientHeight;
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  
  return (
    <div ref={containerRef} style={{ width: "100%", height: "280px", position: "relative", margin: "20px 0" }}>
      <canvas ref={canvasRef} style={{ display: "block", position: "absolute", inset: 0 }} />
    </div>
  );
};

const FeatureCarousel = () => {
  const slides = [
    {
      icon: "🎙️",
      title: "Real-time Transcription",
      desc: "WebRTC aggregates conversation streams in chunks, automatically transcribing, translating, and mapping speakers."
    },
    {
      icon: "🧠",
      title: "Post-Meeting AI Summaries",
      desc: "Instantly extracts chronological decisions, structured action items, study planners, and project trajectory velocity assessments."
    },
    {
      icon: "🌳",
      title: "Digital Twin & Collaboration Index",
      desc: "Simulates and monitors organizational memory, tracking collaboration indexes and risk bottlenecks dynamically."
    },
    {
      icon: "🛡️",
      title: "Enterprise Governance Guardrails",
      desc: "Zero-trust RBAC permissions, automatic PII masking prior to prompts, and chronological secure audit trail compliance."
    }
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ minHeight: "110px", transition: "all 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "24px" }}>{slides[index].icon}</span>
          <h4 className="h-outfit" style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {slides[index].title}
          </h4>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
          {slides[index].desc}
        </p>
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? "18px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: i === index ? "var(--primary)" : "var(--panel-border)",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
          />
        ))}
      </div>
    </div>
  );
};

const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "20px 12px" : "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "50%", height: "50%", backgroundColor: "var(--primary)", opacity: 0.06, filter: "blur(120px)", borderRadius: "50%" }}></div>
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "50%", height: "50%", backgroundColor: "var(--primary)", opacity: 0.06, filter: "blur(120px)", borderRadius: "50%" }}></div>

      <div style={{ width: "100%", maxWidth: "1100px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1.3fr", gap: isMobile ? "20px" : "40px", alignItems: "center", position: "relative", zIndex: 10 }}>
        {/* Left Column: Form */}
        <div style={{ width: "100%", maxWidth: "440px", justifySelf: "center", padding: isMobile ? "0 4px" : "0" }}>
          <Outlet />
        </div>

        {/* Right Column: Features Panel & 3D Globe (widescreen only) */}
        {!isMobile && (
          <div className="glass-card" style={{ padding: "40px", height: "100%", minHeight: "560px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", borderLeft: "4px solid var(--primary)", background: "rgba(255,255,255,0.01)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <img
                  src="/logo.png"
                  alt="NinaivuNet AI"
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "contain",
                    mixBlendMode: "screen"
                  }}
                />
                <div>
                  <span className="h-outfit" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>NinaivuNet AI</span>
                  <span style={{ fontSize: "10px", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginLeft: "6px", verticalAlign: "middle" }}>Enterprise AI</span>
                </div>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                Enterprise intelligence platform transforming audio streams, meetings, and team workflows into structured knowledge telemetry.
              </p>
            </div>

            <ThreeDGlobe />

            <FeatureCarousel />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
