"use client";

import React from "react";
import { Database, Zap, ToggleLeft, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function ValueProps() {
  const items = [
    {
      icon: Database,
      title: "Knowledge retention",
      desc: "Conversations shouldn't vanish when a meeting ends. NinaivuNet indexes meeting intelligence permanently.",
    },
    {
      icon: Zap,
      title: "Instant action attribution",
      desc: "Speak a task, and the AI instantly attributes owner, deadline, priority, and transcript evidence.",
    },
    {
      icon: ToggleLeft,
      title: "Domain-specific AI",
      desc: "Toggle between Corporate Mode and Education Mode, each tuned to how that team works.",
    },
    {
      icon: ShieldAlert,
      title: "Guaranteed data privacy",
      desc: "Inputs are heavily scrubbed and secured before any AI model routing.",
    },
  ];

  const headerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as any },
    },
  };

  return (
    <section id="value-props" className="py-20 px-6 max-w-7xl mx-auto border-b border-[#ffffff]/5">
      <motion.div
        variants={headerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="text-left mb-12"
      >
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#00D4FF] mb-3 block">
          CORE CAPABILITIES
        </span>
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F5F6FA] tracking-tight">
          Engineered for Team Alignment
        </h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              variants={cardVariants}
              className="glass-card p-6 flex flex-col items-start gap-4 hover:-translate-y-1 hover:border-[#6C5CE7] group cursor-pointer"
              style={{
                borderRadius: "14px",
              }}
            >
              {/* Gradient Icon Tile */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#6C5CE7] to-[#00D4FF] text-[#05070D] group-hover:scale-105 transition-transform duration-300">
                <Icon size={20} className="stroke-[2.2]" />
              </div>

              {/* Title & Desc */}
              <h3 className="font-display text-base font-bold text-[#F5F6FA] tracking-tight">
                {item.title}
              </h3>
              <p className="text-xs text-[#9BA3B4] leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
