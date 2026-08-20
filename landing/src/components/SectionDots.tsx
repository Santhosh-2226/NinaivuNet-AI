"use client";

import React, { useState, useEffect } from "react";

const SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "value-props", label: "Value Props" },
  { id: "bento", label: "Features" },
  { id: "workspaces", label: "Workspaces" },
  { id: "security", label: "Security" },
  { id: "cta", label: "CTA" },
];

export default function SectionDots() {
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let nearestSection = "hero";
      let minDistance = Infinity;

      SECTIONS.forEach((sec) => {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const elementCenter = window.scrollY + rect.top + rect.height / 2;
          const dist = Math.abs(viewportCenter - elementCenter);
          if (dist < minDistance) {
            minDistance = dist;
            nearestSection = sec.id;
          }
        }
      });

      setActiveSection(nearestSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDotClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden [@media(min-width:860px)]:flex flex-col gap-4 items-center bg-[#05070D]/40 p-2.5 rounded-full border border-white/5 backdrop-blur-md">
      {SECTIONS.map((sec) => {
        const isActive = activeSection === sec.id;
        const isSecurity = activeSection === "security";
        const accentColor = isSecurity ? "#00E6A8" : "#00D4FF";

        return (
          <button
            key={sec.id}
            onClick={() => handleDotClick(sec.id)}
            title={sec.label}
            className="group relative flex items-center justify-center w-6 h-6 border-none bg-transparent cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/20 rounded-full"
          >
            {/* Visual Dot */}
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: isActive ? "10px" : "6px",
                height: isActive ? "10px" : "6px",
                backgroundColor: isActive ? accentColor : "rgba(255, 255, 255, 0.2)",
                boxShadow: isActive ? `0 0 10px ${accentColor}` : "none",
              }}
            />

            {/* Label Tooltip */}
            <span className="absolute right-9 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0B0F1A] border border-white/10 text-[#F5F6FA] text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
              {sec.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
