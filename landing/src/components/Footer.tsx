"use client";

import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 px-6 border-t border-[#ffffff]/5 bg-[#05070D]">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display text-sm font-bold text-[#F5F6FA]/50 tracking-tight">
          NinaivuNet
        </span>
        <p className="text-xs text-[#9BA3B4]/60 font-mono text-center">
          &copy; {currentYear} NinaivuNet. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
