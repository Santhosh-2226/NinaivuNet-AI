"use client";

import React from "react";
import { ShieldCheck, EyeOff, FileText, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function SecurityPosture() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Encryption standard",
      desc: "AES-256 Rest and TLS 1.3 Transit.",
    },
    {
      icon: EyeOff,
      title: "Privacy compliance",
      desc: "In-memory PII filtering masks user identity prior to AI evaluations.",
    },
    {
      icon: FileText,
      title: "Security event trails",
      desc: "Granular audit logs tracking every permission change, signup, and room entry.",
    },
    {
      icon: UserCheck,
      title: "RBAC controls",
      desc: "Strict zero-trust role-based authorization (Manager, Team Lead, Member, Student, Viewer).",
    },
  ];

  const headerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const drawShield = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: 0.15, type: "spring" as const, duration: 1.6, bounce: 0 },
        opacity: { delay: 0.15, duration: 0.25 }
      }
    }
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } },
  };

  return (
    <section
      id="security"
      className="relative py-24 px-6 overflow-hidden border-b border-[#ffffff]/5"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(0,230,168,0.08), transparent 60%)",
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div className="text-left">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#00E6A8] mb-3 block font-semibold">
              ZERO-TRUST SECURITY COMPLIANCE
            </span>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F5F6FA] tracking-tight">
              Enterprise Governance Layer
            </h2>
          </div>

          {/* Signature Detail: Self-Drawing SVG Shield Icon */}
          <div className="flex items-center justify-start md:justify-end">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-[#00E6A8] filter drop-shadow-[0_0_8px_rgba(0,230,168,0.4)]"
            >
              <motion.path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                variants={drawShield}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
              />
            </svg>
          </div>
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
                className="p-6 flex flex-col items-start gap-4 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[#ffffff]/2 to-[#ffffff]/4 cursor-pointer"
                style={{
                  borderRadius: "14px",
                  border: "1px solid rgba(0, 230, 168, 0.15)",
                }}
              >
                {/* Mint Icon Container */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#00E6A8]/10 text-[#00E6A8] border border-[#00E6A8]/20">
                  <Icon size={20} className="stroke-[2]" />
                </div>

                {/* Content */}
                <h3 className="font-display text-sm font-bold text-[#F5F6FA] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-[#9BA3B4] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
