"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BrandIntroSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const showed = sessionStorage.getItem("vs_logo_intro");
    if (showed) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem("vs_logo_intro", "true");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const img = new Image();
    img.src = "/logo.png";

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }

    const particles: Particle[] = [];
    let state: "idle" | "shattering" | "done" = "idle";
    const startTime = Date.now();

    const colors = [
      "rgba(108, 92, 231, 1)",
      "rgba(0, 212, 255, 1)",
      "rgba(162, 155, 254, 1)",
      "rgba(255, 255, 255, 0.9)"
    ];

    const logoSize = 260;
    const centerX = width / 2;
    const centerY = height / 2;

    const initParticles = () => {
      for (let i = 0; i < 650; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * (logoSize / 2);
        particles.push({
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle),
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          size: Math.random() * 3.5 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1
        });
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let animId: number;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      const elapsed = Date.now() - startTime;

      if (state === "idle" && elapsed > 800) {
        state = "shattering";
        initParticles();
        setTimeout(() => {
          setFading(true);
        }, 600);
        setTimeout(() => {
          setVisible(false);
        }, 1200);
      }

      if (state === "idle") {
        ctx.save();
        const floatY = Math.sin(elapsed * 0.005) * 12;
        const scale = 1 + Math.sin(elapsed * 0.002) * 0.02;

        ctx.shadowColor = "rgba(108, 92, 231, 0.35)";
        ctx.shadowBlur = 30;

        try {
          if (img.complete) {
            ctx.drawImage(
              img,
              centerX - (logoSize * scale) / 2,
              centerY - (logoSize * scale) / 2 + floatY,
              logoSize * scale,
              logoSize * scale
            );
          } else {
            ctx.fillStyle = "rgba(108, 92, 231, 0.8)";
            ctx.beginPath();
            ctx.arc(centerX, centerY + floatY, (logoSize * scale) / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } catch (e) {}
        ctx.restore();
      } else if (state === "shattering") {
        const targetX = 40;
        const targetY = 32;

        particles.forEach((p) => {
          if (elapsed > 1950) {
            const dx = targetX - p.x;
            const dy = targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 15) {
              p.vx += (dx / dist) * 1.2;
              p.vy += (dy / dist) * 1.2;
              const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
              const maxSpeed = 26;
              if (speed > maxSpeed) {
                p.vx = (p.vx / speed) * maxSpeed;
                p.vy = (p.vy / speed) * maxSpeed;
              }
            } else {
              p.alpha = 0;
            }
          } else {
            p.vx *= 1.04;
            p.vy *= 1.04;
          }

          p.x += p.vx;
          p.y += p.vy;

          if (p.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#05070D",
        transition: "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}
