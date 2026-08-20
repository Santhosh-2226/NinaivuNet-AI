"use client";

import React, { useState, useEffect } from "react";

export default function Navbar() {
  const [loginUrl, setLoginUrl] = useState("http://localhost:5173/login");
  const [registerUrl, setRegisterUrl] = useState("http://localhost:5173/register");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoginUrl(`http://${window.location.hostname}:5173/login`);
      setRegisterUrl(`http://${window.location.hostname}:5173/register`);
    }
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-[#ffffff]/8 bg-[#05070D]/60 backdrop-blur-[16px]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Left Side: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img
            src="/logo.png"
            alt="NinaivuNet AI Logo"
            className="w-14 h-14 object-contain"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="font-display text-lg font-bold text-[#F5F6FA] tracking-tight">
            NinaivuNet AI
          </span>
        </div>

        {/* Center: Links (hidden below 860px) */}
        <nav className="hidden [@media(min-width:860px)]:flex items-center gap-8">
          <button
            onClick={() => handleScrollTo("value-props")}
            className="text-sm font-medium text-[#9BA3B4] hover:text-[#F5F6FA] transition-colors"
          >
            Product
          </button>
          <button
            onClick={() => handleScrollTo("workspaces")}
            className="text-sm font-medium text-[#9BA3B4] hover:text-[#F5F6FA] transition-colors"
          >
            Solutions
          </button>
          <button
            onClick={() => handleScrollTo("security")}
            className="text-sm font-medium text-[#9BA3B4] hover:text-[#F5F6FA] transition-colors"
          >
            Security
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#9BA3B4] hover:text-[#F5F6FA] transition-colors"
          >
            Pricing
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <a
            href={loginUrl}
            className="btn-ghost px-4 py-2 text-sm font-medium transition-all"
          >
            Sign In
          </a>
          <a
            href={registerUrl}
            className="btn-primary px-4 py-2 text-sm font-semibold transition-all"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
