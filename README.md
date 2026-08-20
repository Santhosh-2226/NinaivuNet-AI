# 🌟 NinaivuNet AI (VisionSync)

> **Autonomous Organizational Intelligence & Video Conferencing Platform**  
> Real-time mesh WebRTC meetings, per-participant audio stream separation, AI-driven transcription & summarization, RAG transcript search, and Executive Copilot.

---

## 🚀 Key Features

- **Mesh WebRTC Video Conferencing:** Low-latency live video and audio calling with Socket.io signaling.
- **Per-Participant Audio Capture:** Captures clean, isolated single-speaker audio chunks per participant for perfect speaker attribution.
- **AI Meeting Reasoning & Summarization:** Extracts action items, decisions, confidence scores, and attendance automatically using Google Gemini.
- **RAG Meeting Search:** Query past meeting discussions with semantic vector embeddings.
- **Executive Copilot:** Real-time chatbot for project risk analysis, timelines, and organizational intelligence.
- **Modern UI Suite:** Fast Vite React SPA application paired with a 3D Next.js landing showcase.

---

## 🏗️ Architecture & Services

| Service | Port | Description |
|---|---|---|
| **Meeting & WebRTC Server** | `http://localhost:3000` | Real-time signaling, audio ingestion, RAG search & SQLite repository |
| **Backend API Gateway** | `http://localhost:4000` | Authentication (JWT / Google OAuth), project & member management |
| **Main Web App** | `http://localhost:5173` | React / Vite Dashboard, Meeting room, Intelligence Center |
| **Landing Showcase** | `http://localhost:3001` | Next.js 3D landing page |

---

## 🛠️ Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Santhosh-2226/NinaivuNet-AI.git
cd NinaivuNet-AI
```

### 2. Environment Configuration
Create the environment files from the examples:

**Root `.env` (Meeting Server & AI Keys):**
```bash
cp .env.example .env
```
*(Add your free `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com))*

**Backend `.env` (API & Database):**
```bash
cp backend/.env.example backend/.env
```

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install landing dependencies
cd landing && npm install && cd ..
```

### 4. Run the Applications

Start each service in separate terminal windows:

```bash
# Terminal 1: Meeting & Signaling Server (Port 3000)
node server.js

# Terminal 2: Backend API Server (Port 4000)
cd backend && node server.js

# Terminal 3: Main Frontend App (Port 5173)
cd frontend && npm run dev

# Terminal 4 (Optional): Landing Page (Port 3001)
cd landing && npm run dev
```

Open [**http://localhost:5173**](http://localhost:5173) in your browser to start using the platform!

---

## 🔒 Security & Privacy

- All sensitive keys and `.env` credentials are excluded from version control via `.gitignore`.
- In-flight PII masking and prompt injection firewalls guard all AI reasoning gateways.

