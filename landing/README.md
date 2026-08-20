# 🚀 NinaivuNet Landing Page (Next.js 14+ / App Router)

A high-performance, production-grade landing page for **NinaivuNet**, featuring an interactive WebGL 3D intelligence orb built with React Three Fiber, Framer Motion, and Tailwind CSS.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **3D Render System:** Three.js + React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`)
- **Scroll Tracking & Animations:** Framer Motion (leveraging `useScroll` and `useTransform` vectors)
- **Styling:** Tailwind CSS v4 + custom design tokens mapping (glowing gradients, custom layout properties)
- **Icons:** Lucide React (`lucide-react`)
- **Fonts:** Space Grotesk (display/headings), Inter (body), JetBrains Mono (labels/eyebrows)

---

## ⚡ Setup & Installation

Follow these steps to run the landing page on your local workspace:

1. **Navigate to the landing folder:**
   ```bash
   cd landing
   ```

2. **Install all dependencies:**
   We use `--legacy-peer-deps` to ensure compatibility between React 19 templates and React Three Fiber bindings:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   This launches the development server on `http://localhost:3000` (or the next available port).

4. **Build the production bundle:**
   To validate compiler safety and generate static assets:
   ```bash
   npm run build
   ```

5. **Start production server:**
   ```bash
   npm run start
   ```

---

## 📁 Component Directory Map

The codebase is organized in clean, modular blocks:

- `src/app/page.tsx` — Main landing assembler.
- `src/app/layout.tsx` — Global root layout configuring Google Font loaders, SEO metadata, and custom scroll triggers.
- `src/app/globals.css` — Declarations for Tailwind CSS v4 color tokens, glassmorphism filters, keyframes, and waveform animations.
- `src/components/AmbientOrb.tsx` — Signature scroll-reactive 3D orb. Houses WebGL context detection, camera viewport projection, node orbit sine-wave bobbing, and Framer Motion viewport distance markers.
- `src/components/SectionIcons.tsx` — Vector indicators for microphone, chip, shield, and checkmark.
- `src/components/Navbar.tsx` — Sticky blur header with workspace sign-in and registration links.
- `src/components/Hero.tsx` — Hero text accompanied by a customized, lightweight 2D HTML5 canvas particle background network.
- `src/components/ValueProps.tsx` — 4-card grid highlight panel.
- `src/components/FeatureBento.tsx` — Asymmetrical bento grid detailing core feature vectors.
- `src/components/DomainWorkspaces.tsx` — Segmented workspace tabs (Corporate vs Education telemetry).
- `src/components/SecurityPosture.tsx` — Zero-trust policy compliance panel.
- `src/components/BottomCta.tsx` — Action-inspiring bottom banner.
- `src/components/Footer.tsx` — Minimalist workspace footer.
