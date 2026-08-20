"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import AmbientOrb from "./AmbientOrb";

export default function Hero() {
  const [registerUrl, setRegisterUrl] = useState("http://localhost:5173/register");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRegisterUrl(`http://${window.location.hostname}:5173/register`);
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 750);

    const numPoints = 46;
    const maxDistance = 130;
    const points: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
    }> = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      });
    }

    // Scroll listener to update parallax offset
    const handleScroll = () => {
      // Parallax rate multiplier (0.4 means particles scroll at 40% speed, leaving a 0.6x parallax gap)
      scrollOffsetRef.current = window.scrollY * 0.35;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Offset points by scroll parallax drift
      const offset = scrollOffsetRef.current;

      points.forEach((p) => {
        // Move particles
        p.x += p.vx;
        p.y += p.vy;

        // Bounce boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Calculate parallax y coordinate
        const py = p.y - offset;

        // Render point if inside viewport boundaries
        if (py >= -20 && py <= height + 20) {
          const glowRadius = 8;
          const radialGlow = ctx.createRadialGradient(p.x, py, 1, p.x, py, glowRadius);
          radialGlow.addColorStop(0, "rgba(0, 212, 255, 0.8)");
          radialGlow.addColorStop(0.3, "rgba(0, 212, 255, 0.2)");
          radialGlow.addColorStop(1, "rgba(0, 212, 255, 0)");

          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(p.x, py, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#00D4FF";
          ctx.beginPath();
          ctx.arc(p.x, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw connecting lines with parallax offset
      ctx.lineWidth = 0.8;
      for (let i = 0; i < numPoints; i++) {
        for (let j = i + 1; j < numPoints; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const py1 = points[i].y - offset;
            const py2 = points[j].y - offset;

            if (py1 >= -20 && py1 <= height + 20 && py2 >= -20 && py2 <= height + 20) {
              const alpha = (1 - dist / maxDistance) * 0.28;
              ctx.strokeStyle = `rgba(108, 92, 231, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(points[i].x, py1);
              ctx.lineTo(points[j].x, py2);
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[80vh] flex items-center justify-start overflow-hidden py-24 px-6 lg:px-20 border-b border-[#ffffff]/5 bg-[#05070D]"
    >
      {/* Background Animated Particle Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Content wrapper — 2-column: text left, 3D orb right (only on this section) */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-center">
        <div className="text-left">
          {/* Eyebrow */}
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#00D4FF] mb-5 block font-semibold">
            ENTERPRISE MEETING INTELLIGENCE
          </span>

          {/* Heading with line-level reveal (efficient) */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="font-display text-4xl lg:text-[52px] font-bold text-[#F5F6FA] tracking-tight leading-[1.08] mb-6"
          >
            Turn raw conversations into{" "}
            <span className="bg-gradient-to-r from-[#6C5CE7] to-[#00D4FF] bg-clip-text text-transparent">
              structured enterprise knowledge
            </span>
          </motion.h1>

          {/* Subtext reveal */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="text-base lg:text-lg text-[#9BA3B4] font-normal leading-relaxed mb-8"
          >
            The real-time WebRTC meeting platform that aggregates audio streams, transcribes dialogues, maps collaboration indexes, and preserves organizational memory under a zero-trust governance layer.
          </motion.p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
            <a
              href={registerUrl}
              className="btn-primary py-3.5 px-8 text-center text-sm font-semibold tracking-wide transition-all duration-300"
            >
              Get Started Free
            </a>
            <button
              onClick={() => handleScrollTo("bento")}
              className="btn-ghost py-3.5 px-8 text-center text-sm font-semibold transition-all duration-300"
            >
              Schedule a Demo
            </button>
          </div>

          {/* Tagline */}
          <p className="text-xs text-[#9BA3B4] font-medium font-mono">
            No more forgotten tasks. No lost knowledge.{" "}
            <span className="text-[#00E6A8] font-bold">Fully encrypted.</span>
          </p>
        </div>

        {/* Right Column: Canvas Orb — no Three.js, instant load */}
        <div className="hidden lg:flex items-center justify-center" style={{ height: "380px" }}>
          <AmbientOrb />
        </div>
      </div>
    </section>
  );
}
