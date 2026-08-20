"use client";

import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ValueProps from "../components/ValueProps";
import FeatureBento from "../components/FeatureBento";
import DomainWorkspaces from "../components/DomainWorkspaces";
import SecurityPosture from "../components/SecurityPosture";
import BottomCta from "../components/BottomCta";
import Footer from "../components/Footer";
import ScrollProgress from "../components/ScrollProgress";
import SectionDots from "../components/SectionDots";
import SmoothScroll from "../components/SmoothScroll";
import BrandIntroSplash from "../components/BrandIntroSplash";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Shatter Entry Splash */}
      <BrandIntroSplash />

      {/* 2px fixed top Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Smooth scroll (native CSS, no JS jank) */}
      <SmoothScroll />

      {/* Persistent Wayfinding Dot-Navigation */}
      <SectionDots />

      {/* Sticky Header Navigation */}
      <Navbar />

      {/* Main Sections */}
      <main className="flex-grow">
        {/* Hero has the 3D Orb embedded inside — it stays ONLY on the first section */}
        <Hero />
        <ValueProps />
        <FeatureBento />
        <DomainWorkspaces />
        <SecurityPosture />
        <BottomCta />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
