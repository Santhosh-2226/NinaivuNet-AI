"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ShieldAlert, LineChart, BookOpen, ClipboardCheck, Users2 } from "lucide-react";

export default function DomainWorkspaces() {
  const [activeTab, setActiveTab] = useState<"corporate" | "education">("corporate");

  return (
    <section id="workspaces" className="py-20 px-6 max-w-7xl mx-auto border-b border-[#ffffff]/5">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#00D4FF] mb-3 block font-semibold">
          SEGMENTED WORKSPACES
        </span>
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F5F6FA] tracking-tight mb-4">
          Tuned to How Your Team Collaborates
        </h2>
        <p className="text-sm text-[#9BA3B4] leading-relaxed">
          Toggle between dedicated organizational workspaces containing tailored telemetry models, summary templates, and analysis cards.
        </p>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex justify-center mb-10">
        <div className="bg-[#ffffff]/3 border border-[#ffffff]/10 p-1.5 rounded-xl flex gap-1.5">
          <button
            onClick={() => setActiveTab("corporate")}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition-all duration-300 ${
              activeTab === "corporate"
                ? "bg-gradient-to-r from-[#6C5CE7] to-[#00D4FF] text-[#05070D]"
                : "text-[#9BA3B4] hover:text-[#F5F6FA]"
            }`}
          >
            Corporate & Development
          </button>
          <button
            onClick={() => setActiveTab("education")}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition-all duration-300 ${
              activeTab === "education"
                ? "bg-gradient-to-r from-[#6C5CE7] to-[#00D4FF] text-[#05070D]"
                : "text-[#9BA3B4] hover:text-[#F5F6FA]"
            }`}
          >
            Educational Classrooms
          </button>
        </div>
      </div>

      {/* Workspaces Panel */}
      <div className="relative min-h-[320px]">
        <AnimatePresence mode="wait">
          {activeTab === "corporate" ? (
            <motion.div
              key="corporate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Stat 1: Velocity Metrics */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Telemetry 01
                  </span>
                  <BarChart3 className="text-[#6C5CE7]" size={20} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Velocity Metrics
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Track the chronological decision rate and task completion index against sprint deadlines.
                  </p>
                </div>
              </div>

              {/* Stat 2: Risk Heatmaps */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Telemetry 02
                  </span>
                  <ShieldAlert className="text-[#6C5CE7]" size={20} />
                </div>
                {/* Visual grid layout */}
                <div className="grid grid-cols-6 gap-1 w-full max-w-[150px] my-3">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-[2px]"
                      style={{
                        background:
                          i % 5 === 0
                            ? "#ef4444" // red
                            : i % 3 === 0
                            ? "#f59e0b" // amber
                            : "#22c55e", // green
                        opacity: 0.6 + (i % 4) * 0.1,
                      }}
                    />
                  ))}
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Risk Heatmaps
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Visualize organizational risk parameters and blockages across corporate milestones.
                  </p>
                </div>
              </div>

              {/* Stat 3: Bottleneck Forecaster */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Telemetry 03
                  </span>
                  <LineChart className="text-[#6C5CE7]" size={20} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Bottleneck Forecaster
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Predict project delays and developer workloads by correlating talking shares and pending actions.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="education"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Stat 1: Study Guides */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Module 01
                  </span>
                  <BookOpen className="text-[#6C5CE7]" size={20} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Lecture Study Guides
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Generate topic outlines, revision hours, and suggested reading resources from classroom lectures.
                  </p>
                </div>
              </div>

              {/* Stat 2: Practice Quizzes */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Module 02
                  </span>
                  <ClipboardCheck className="text-[#6C5CE7]" size={20} />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Generated Practice Quizzes
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Instantly quiz students on lecture core concepts using automatically formatted choice questions.
                  </p>
                </div>
              </div>

              {/* Stat 3: Speaking Share Meters */}
              <div className="glass-card p-6 flex flex-col justify-between hover:border-[#6C5CE7]/30 min-h-[220px]">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-[#00D4FF] uppercase tracking-wider font-semibold">
                    Module 03
                  </span>
                  <Users2 className="text-[#6C5CE7]" size={20} />
                </div>
                {/* Visual Radial Meter */}
                <div className="relative w-12 h-12 flex items-center justify-center my-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#ffffff]/5"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#00D4FF]"
                      strokeWidth="3.5"
                      strokeDasharray="65, 100"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-bold text-[#F5F6FA] font-mono">65%</span>
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-[#F5F6FA] mb-2">
                    Speaking Share Meters
                  </h4>
                  <p className="text-xs text-[#9BA3B4] leading-relaxed">
                    Track participation distributions across groups to ensure balanced engagement in debates.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
