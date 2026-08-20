"use client";

import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function BottomCta() {
  const [registerUrl, setRegisterUrl] = useState("http://localhost:5173/register");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRegisterUrl(`http://${window.location.hostname}:5173/register`);
    }
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs for high-fidelity magnetic bounce back
  const springX = useSpring(x, { stiffness: 120, damping: 15 });
  const springY = useSpring(y, { stiffness: 120, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Position of cursor relative to button center
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Shift coordinates toward cursor up to ~8px
    const factor = 0.16;
    const targetX = Math.max(-8, Math.min(8, mouseX * factor));
    const targetY = Math.max(-8, Math.min(8, mouseY * factor));

    x.set(targetX);
    y.set(targetY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section
      id="cta"
      className="py-28 px-6 text-center max-w-4xl mx-auto border-b border-[#ffffff]/5"
    >
      <motion.div
        variants={contentVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="font-display text-3xl lg:text-[40px] font-bold text-[#F5F6FA] tracking-tight leading-tight mb-4">
          Ready to synchronize your team's intelligence?
        </h2>
        <p className="text-base text-[#9BA3B4] max-w-2xl mx-auto leading-relaxed mb-8">
          Create an account now to set up your first project and unlock automated workspace briefings.
        </p>
        <div className="flex justify-center">
          <motion.a
            href={registerUrl}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: springX, y: springY }}
            className="btn-primary py-3.5 px-10 text-sm font-semibold tracking-wide block select-none"
          >
            Sign Up Now
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
