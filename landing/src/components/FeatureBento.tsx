"use client";

import React from "react";
import { Mic, Activity, Search, Shield, Zap, Palette } from "lucide-react";
import { motion as m } from "framer-motion";

export default function FeatureBento() {
  // Mouse spotlight hover tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--x", `${x}px`);
    e.currentTarget.style.setProperty("--y", `${y}px`);
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const gridContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const cardWipeEven = {
    hidden: { clipPath: "inset(0% 100% 0% 0%)", opacity: 0.5 },
    visible: {
      clipPath: "inset(0% 0% 0% 0%)",
      opacity: 1,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  const cardWipeOdd = {
    hidden: { clipPath: "inset(0% 0% 0% 100%)", opacity: 0.5 },
    visible: {
      clipPath: "inset(0% 0% 0% 0%)",
      opacity: 1,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <section id="bento" className="py-20 px-6 max-w-7xl mx-auto border-b border-[#ffffff]/5">
      <m.div
        variants={headerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="text-left mb-12"
      >
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#00D4FF] mb-3 block">
          PLATFORM ARCHITECTURE
        </span>
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#F5F6FA] tracking-tight">
          Automate Meeting Telemetry
        </h2>
      </m.div>

      <m.div
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 grid-flow-row-dense auto-rows-[220px]"
      >
        
        {/* Card 1: WebRTC Capture */}
        <m.div
          variants={cardWipeEven}
          onMouseMove={handleMouseMove}
          className="glass-card p-6 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00D4FF] col-span-1 md:col-span-2 row-span-1 group cursor-pointer"
          style={{
            background: "radial-gradient(circle 120px at var(--x, -200px) var(--y, -200px), rgba(0, 212, 255, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="flex items-end gap-1.5 h-10 mb-4">
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
            <div className="equalizer-bar" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mic size={16} className="text-[#00D4FF]" />
              <h3 className="font-display text-sm font-bold text-[#F5F6FA]">
                WebRTC real-time dialogue capture
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              High-accuracy speech-to-text processing tracks speaker identities, timestamps, and language patterns, and provides automatic translation.
            </p>
          </div>
        </m.div>

        {/* Card 2: AI Post-Meeting Ingestion (Large, flagship card) */}
        <m.div
          id="ingest-card"
          variants={cardWipeOdd}
          onMouseMove={handleMouseMove}
          className="glass-card p-8 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00D4FF] col-span-1 md:col-span-2 row-span-2 group cursor-pointer"
          style={{
            background: "radial-gradient(circle 180px at var(--x, -200px) var(--y, -200px), rgba(0, 212, 255, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="flex flex-wrap gap-2.5 mb-4">
            {["Summary", "Decisions", "Action items", "Velocity score"].map((badge, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono uppercase tracking-wider font-semibold border border-[#ffffff]/10 px-3 py-1 rounded bg-[#ffffff]/3 text-[#00D4FF] group-hover:border-[#6C5CE7]/30 transition-colors"
              >
                {badge}
              </span>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-[#6C5CE7]" />
              <h3 className="font-display text-base font-bold text-[#F5F6FA]">
                AI post-meeting ingestion
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              Within seconds of meeting completion, our AI pipeline extracts detailed meeting summaries, key decisions, action item tasks, and velocity scores to keep teams aligned.
            </p>
          </div>
        </m.div>

        {/* Card 3: Organizational Memory Timeline */}
        <m.div
          variants={cardWipeEven}
          onMouseMove={handleMouseMove}
          className="glass-card p-6 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00D4FF] col-span-1 md:col-span-2 row-span-1 group cursor-pointer"
          style={{
            background: "radial-gradient(circle 120px at var(--x, -200px) var(--y, -200px), rgba(0, 212, 255, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="w-8 h-8 rounded bg-[#ffffff]/3 border border-[#ffffff]/10 flex items-center justify-center text-[#9BA3B4] group-hover:text-[#00D4FF] transition-colors">
            <Search size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search size={16} className="text-[#00D4FF]" />
              <h3 className="font-display text-sm font-bold text-[#F5F6FA]">
                Organizational memory timeline
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              Search and view the chronological timeline of your company's strategic history. Find transcript quotes, past decisions, and task details instantly using semantic keyword search.
            </p>
          </div>
        </m.div>

        {/* Card 4: Zero-Trust Security (Large, flagship card) */}
        <m.div
          id="security-ingest-card"
          variants={cardWipeOdd}
          onMouseMove={handleMouseMove}
          className="glass-card p-8 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00E6A8] col-span-1 md:col-span-2 row-span-2 group relative overflow-hidden cursor-pointer"
          style={{
            background: "radial-gradient(circle 180px at var(--x, -200px) var(--y, -200px), rgba(0, 230, 168, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#00E6A8]/5 filter blur-[32px] pointer-events-none rounded-full" />
          <div className="mb-4 bg-[#05070D] border border-[#ffffff]/10 p-3 rounded font-mono text-[10px] text-[#9BA3B4] select-none">
            <span className="text-[#00E6A8]">// Masking PII data stream</span>
            <div className="mt-1.5 text-[#F5F6FA] opacity-70">
              user: "Contact analyst at <span className="text-[#00E6A8] font-bold">s••••••@••••••.com</span>"
            </div>
            <div className="text-[#F5F6FA] opacity-50">
              hash: <span className="text-[#6C5CE7]">aes256_cipher_7fc9a1</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-[#00E6A8]" />
              <h3 className="font-display text-base font-bold text-[#00E6A8]">
                Zero-trust security & PII masking
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              Ensure security compliance with AES-256 rest encryption, prompt injection firewalls, user audit logs, and automatic PII scrubbers that mask email/phone data before LLM processing.
            </p>
          </div>
        </m.div>

        {/* Card 5: AI Decision Simulator */}
        <m.div
          variants={cardWipeEven}
          onMouseMove={handleMouseMove}
          className="glass-card p-6 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00D4FF] col-span-1 md:col-span-2 row-span-1 group cursor-pointer"
          style={{
            background: "radial-gradient(circle 120px at var(--x, -200px) var(--y, -200px), rgba(0, 212, 255, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="w-8 h-8 rounded bg-[#ffffff]/3 border border-[#ffffff]/10 flex items-center justify-center text-[#9BA3B4] group-hover:text-[#00D4FF] transition-colors">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-[#00D4FF]" />
              <h3 className="font-display text-sm font-bold text-[#F5F6FA]">
                AI decision simulator
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              Forecast downstream cascade risks before you act. Enter a hypothetical change and preview timeline blockers and recommendations.
            </p>
          </div>
        </m.div>

        {/* Card 6: Whiteboard Analytics */}
        <m.div
          variants={cardWipeOdd}
          onMouseMove={handleMouseMove}
          className="glass-card p-6 flex flex-col justify-between hover:-translate-y-[3px] hover:border-[#00D4FF] col-span-1 md:col-span-2 row-span-1 group cursor-pointer"
          style={{
            background: "radial-gradient(circle 120px at var(--x, -200px) var(--y, -200px), rgba(0, 212, 255, 0.06), transparent), var(--glass)",
          }}
        >
          <div className="w-8 h-8 rounded bg-[#ffffff]/3 border border-[#ffffff]/10 flex items-center justify-center text-[#9BA3B4] group-hover:text-[#00D4FF] transition-colors">
            <Palette size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Palette size={16} className="text-[#00D4FF]" />
              <h3 className="font-display text-sm font-bold text-[#F5F6FA]">
                Interactive whiteboard analytics
              </h3>
            </div>
            <p className="text-xs text-[#9BA3B4] leading-relaxed">
              Collaborate on our canvas drawing board. The AI reads visual sketches, coordinate strokes, and diagrams, translating drafts into clean technical specifications.
            </p>
          </div>
        </m.div>

      </m.div>
    </section>
  );
}
