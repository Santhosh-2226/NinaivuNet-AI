"use client";

import React, { useState, useEffect, useRef } from "react";
import { MicrophoneIcon, ShieldIcon, ChipIcon, CheckIcon } from "./SectionIcons";

// Pure canvas-based orb — zero Three.js dependency, instant load
export default function AmbientOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Proximity/icon fade states (scroll-driven)
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [ingestionOpacity, setIngestionOpacity] = useState(0);
  const [securityOpacity, setSecurityOpacity] = useState(0);
  const [ctaOpacity, setCtaOpacity] = useState(0);
  const [securityProximity, setSecurityProximity] = useState(0);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const mqHandler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", mqHandler);

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const viewportCenter = window.scrollY + window.innerHeight / 2;

      const getProximity = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const elementCenter = window.scrollY + rect.top + rect.height / 2;
        const dist = Math.abs(viewportCenter - elementCenter);
        return Math.max(0, 1 - dist / (window.innerHeight * 0.55));
      };

      setHeroOpacity(getProximity("hero"));
      setIngestionOpacity(getProximity("ingest-card"));
      setSecurityOpacity(getProximity("security"));
      setCtaOpacity(getProximity("cta"));
      setSecurityProximity(getProximity("security"));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      mq.removeEventListener("change", mqHandler);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Canvas orb animation
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 380;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Icosahedron-like wireframe projected to 2D (20 triangular faces → ~30 edges)
    // Using a simplified geodesic for visual effect
    const NUM_ORBITS = 6;
    const ORBIT_RADII = [68, 80, 92, 104, 116, 128]; // px
    const ORBIT_SPEEDS = [0.8, 1.2, 0.6, 1.0, 0.5, 0.9]; // rad/s
    const ORBIT_TILT = [0.3, -0.4, 0.2, -0.5, 0.1, 0.6]; // x-tilt
    const NODE_COLORS = ["#6C5CE7", "#00D4FF", "#6C5CE7", "#00D4FF", "#6C5CE7", "#00D4FF"];

    // Build icosahedron-like edge list (24 edges for a simple wireframe look)
    const PHI = (1 + Math.sqrt(5)) / 2;
    const icoVerts = [
      [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return [x / len, y / len, z / len] as [number, number, number];
    });

    const icoEdges: [number, number][] = [
      [0,1],[0,5],[0,7],[0,10],[0,11],
      [1,5],[1,7],[1,8],[1,9],
      [2,3],[2,4],[2,6],[2,10],[2,11],
      [3,4],[3,6],[3,8],[3,9],
      [4,5],[4,9],[4,11],
      [5,9],[5,11],
      [6,7],[6,8],[6,10],
      [7,8],[7,10],
      [8,9],[10,11],
    ];

    let startTime = performance.now();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpColor = (c1: string, c2: string, t: number) => {
      const h2d = (s: string) => parseInt(s, 16);
      const r1 = h2d(c1.slice(1, 3)), g1 = h2d(c1.slice(3, 5)), b1 = h2d(c1.slice(5, 7));
      const r2 = h2d(c2.slice(1, 3)), g2 = h2d(c2.slice(3, 5)), b2 = h2d(c2.slice(5, 7));
      return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
    };

    const SHELL_R = 105; // wireframe shell radius in px

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const t = reducedMotion ? 0 : (ts - startTime) / 1000;

      // Rotation angles for wireframe shell
      const rotX = t * 0.05;
      const rotY = t * 0.08;

      // Project 3D vertex with rotation
      const project = ([x, y, z]: [number, number, number]): [number, number, number] => {
        // Rotate Y
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        // Rotate X
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        return [x1 * SHELL_R + cx, y2 * SHELL_R + cy, z2];
      };

      // Draw wireframe shell
      const secProx = securityProximity;
      const shellColor = lerpColor("#00D4FF", "#00E6A8", secProx);

      icoEdges.forEach(([a, b]) => {
        const [ax, ay, az] = project(icoVerts[a]);
        const [bx, by, bz] = project(icoVerts[b]);
        // Depth-based alpha for 3D feel
        const depthAlpha = 0.15 + ((az + bz) / 2 + 1) * 0.12;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = shellColor;
        ctx.globalAlpha = Math.max(0.05, Math.min(0.5, depthAlpha));
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Core glow
      const pulse = 1 + Math.sin(t * 2) * 0.08;
      const coreR = 14 * pulse;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.5);
      glow.addColorStop(0, "rgba(0, 212, 255, 0.9)");
      glow.addColorStop(0.3, "rgba(0, 212, 255, 0.3)");
      glow.addColorStop(1, "rgba(0, 212, 255, 0)");
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = "#00D4FF";
      ctx.globalAlpha = 1;
      ctx.fill();

      // Orbiting nodes
      for (let i = 0; i < NUM_ORBITS; i++) {
        const speed = reducedMotion ? 0 : ORBIT_SPEEDS[i];
        const angle = t * speed + (i * Math.PI) / 3;
        const r = ORBIT_RADII[i];
        const tilt = ORBIT_TILT[i];

        // Elliptical orbit (tilt simulated via y scaling)
        const nx = cx + r * Math.cos(angle);
        const ny = cy + r * Math.sin(angle) * Math.cos(tilt);
        const depth = Math.sin(angle) * Math.sin(tilt);
        const nodeAlpha = 0.5 + depth * 0.5;
        const nodeR = 3 + depth * 1;

        // Line to center
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = NODE_COLORS[i];
        ctx.globalAlpha = nodeAlpha * 0.3;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Node dot with glow
        const nGlow = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeR * 4);
        nGlow.addColorStop(0, NODE_COLORS[i]);
        nGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = nodeAlpha * 0.35;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeR * 4, 0, Math.PI * 2);
        ctx.fillStyle = nGlow;
        ctx.fill();

        ctx.globalAlpha = nodeAlpha;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = NODE_COLORS[i];
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [mounted, reducedMotion, securityProximity]);

  if (!mounted) return null;

  return (
    <div
      style={{
        pointerEvents: "none",
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Canvas orb — pure 2D, no Three.js */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* Cross-fading SVG icons centered in orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center">
          <div className="absolute transition-opacity duration-300" style={{ opacity: heroOpacity }}>
            <MicrophoneIcon className="w-5 h-5 lg:w-7 lg:h-7 text-cyan" />
          </div>
          <div className="absolute transition-opacity duration-300" style={{ opacity: ingestionOpacity }}>
            <ChipIcon className="w-5 h-5 lg:w-7 lg:h-7 text-violet" />
          </div>
          <div className="absolute transition-opacity duration-300" style={{ opacity: securityOpacity }}>
            <ShieldIcon className="w-5 h-5 lg:w-7 lg:h-7 text-mint" />
          </div>
          <div className="absolute transition-opacity duration-300" style={{ opacity: ctaOpacity }}>
            <CheckIcon className="w-5 h-5 lg:w-7 lg:h-7 text-cyan" />
          </div>
        </div>
      </div>
    </div>
  );
}
