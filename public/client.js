/**
 * NinaivuNet Meet Client
 * ---------------------
 * High-performance WebRTC client styled like Google Meet.
 */

const socket = io();

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

let localStream = null;
let meetingId = null;
let userId = null;
let userName = null;
let myRole = "member";
let projectDomain = "corporate";
let activeLiveQuiz = null;
let quizResultStats = null;

const peerConnections = new Map(); // socketId -> RTCPeerConnection
const peerNames = new Map();        // socketId -> { userName, role }
const peerStates = new Map();       // socketId -> { micEnabled, camEnabled, handRaised }
const chunkUploadInterval = 5000;

let isMicEnabled = true;
let isCamEnabled = true;
let isHandRaised = false;
let isScreenSharing = false;
let screenStream = null;
let unreadChatCount = 0;

/* ── DOM Selectors ────────────────────────────────────────────────── */
const joinScreen = document.getElementById("join-screen");
const meetingScreen = document.getElementById("meeting-screen");
const videoGrid = document.getElementById("videoGrid");
const meetCode = document.getElementById("meetCode");
const meetClock = document.getElementById("meetClock");

// Buttons & Actions
const joinBtn = document.getElementById("joinBtn");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const screenBtn = document.getElementById("screenBtn");
const handBtn = document.getElementById("handBtn");
const leaveBtn = document.getElementById("leaveBtn");

// Utilities & Sidebar
const infoBtn = document.getElementById("infoBtn");
const showPeopleBtn = document.getElementById("showPeopleBtn");
const showChatBtn = document.getElementById("showChatBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const tabChatBtn = document.getElementById("tabChatBtn");
const tabPeopleBtn = document.getElementById("tabPeopleBtn");
const tabWhiteboardBtn = document.getElementById("tabWhiteboardBtn");

const meetSidebar = document.getElementById("meetSidebar");
const chatView = document.getElementById("chatView");
const peopleView = document.getElementById("peopleView");
const whiteboardView = document.getElementById("whiteboardView");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const peopleList = document.getElementById("peopleList");

const peopleCountBadge = document.getElementById("peopleCountBadge");
const chatCountBadge = document.getElementById("chatCountBadge");
const tabQuizBtn = document.getElementById("tabQuizBtn");
const quizView = document.getElementById("quizView");
const quizContainer = document.getElementById("quizContainer");
const tabDiagBtn = document.getElementById("tabDiagBtn");
const diagView = document.getElementById("diagView");
const diagResult = document.getElementById("diagResult");
const runDiagBtn = document.getElementById("runDiagBtn");

/* ── Event Listeners ──────────────────────────────────────────────── */
joinBtn.addEventListener("click", joinMeeting);
muteBtn.addEventListener("click", toggleMute);
camBtn.addEventListener("click", toggleCamera);
screenBtn.addEventListener("click", toggleScreenShare);
handBtn.addEventListener("click", toggleHandRaise);
leaveBtn.addEventListener("click", leaveMeeting);

infoBtn.addEventListener("click", copyMeetingLink);
showChatBtn.addEventListener("click", () => toggleSidebarTab("chat"));
showPeopleBtn.addEventListener("click", () => toggleSidebarTab("people"));
closeSidebarBtn.addEventListener("click", () => meetSidebar.classList.add("hidden"));

tabChatBtn.addEventListener("click", () => switchSidebarTab("chat"));
tabPeopleBtn.addEventListener("click", () => switchSidebarTab("people"));
tabWhiteboardBtn.addEventListener("click", () => switchSidebarTab("whiteboard"));
tabQuizBtn.addEventListener("click", () => switchSidebarTab("quiz"));
tabDiagBtn.addEventListener("click", () => switchSidebarTab("diag"));
const tabNegotiationBtn = document.getElementById("tabNegotiationBtn");
if (tabNegotiationBtn) tabNegotiationBtn.addEventListener("click", () => switchSidebarTab("negotiation"));
runDiagBtn.addEventListener("click", runAIDiagnostics);

chatForm.addEventListener("submit", sendChatMessage);

/* ── Clock Helper ─────────────────────────────────────────────────── */
function startClock() {
  const updateClock = () => {
    const now = new Date();
    meetClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 30000);
}

/* ── Join / Leave Flows ───────────────────────────────────────────── */
async function joinMeeting() {
  userName = document.getElementById("userName").value.trim() || `Guest`;
  meetingId = document.getElementById("meetingId").value.trim();

  if (!meetingId) {
    alert("Please enter a Meeting ID");
    return;
  }

  userId = `${userName.replace(/\s+/g, "_")}_${Math.random().toString(36).slice(2, 7)}`;
  meetCode.textContent = meetingId;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.warn("Failed to get both video and audio, trying audio-only fallback:", err.message);
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isCamEnabled = false;
    } catch (audioErr) {
      console.warn("Failed to get audio stream, joining with no media:", audioErr.message);
      localStream = new MediaStream();
      isMicEnabled = false;
      isCamEnabled = false;
    }
  }

  joinScreen.classList.add("hidden");
  meetingScreen.classList.remove("hidden");

  // Add Local Video Tile
  addVideoTile("local", `${userName} (You)`, localStream, true);

  // Sync initial mic and camera button states to match device authorization fallbacks
  if (!isCamEnabled) {
    camBtn.classList.remove("active");
    camBtn.classList.add("inactive");
    camBtn.querySelector(".icon-cam").classList.add("hidden");
    camBtn.querySelector(".icon-cam-off").classList.remove("hidden");
    const localTile = document.getElementById("tile-local");
    if (localTile) {
      const avatarPlaceholder = localTile.querySelector(".avatar-placeholder");
      const videoEl = localTile.querySelector("video");
      if (avatarPlaceholder) avatarPlaceholder.classList.remove("hidden");
      if (videoEl) videoEl.style.opacity = 0;
    }
  }
  if (!isMicEnabled) {
    muteBtn.classList.remove("active");
    muteBtn.classList.add("inactive");
    muteBtn.querySelector(".icon-mic").classList.add("hidden");
    muteBtn.querySelector(".icon-mic-off").classList.remove("hidden");
  }

  startClock();
  startLocalAudioCapture();

  // Socket join
  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get("email") || "";
  const roleParam = params.get("role") || "";
  socket.emit("join-meeting", { meetingId, userName, email: emailParam, role: roleParam });
  updateGridSize();
  updatePeopleList();
}

async function leaveMeeting(forceEndAll = false) {
  let endAll = false;
  
  // Read isHost from query parameters dynamically
  const isHost = new URLSearchParams(window.location.search).get("isHost") === "true";
  
  if (isHost && !forceEndAll) {
    const choice = window.confirm(
      "Click [OK] to 'End Call for All' participants.\nClick [Cancel] to just leave the call yourself."
    );
    if (choice) {
      endAll = true;
    }
  }

  // 1. Stop audio capture and upload/finalize first
  await stopLocalAudioCapture();
  await finalizeRecording();

  // 2. Notify socket room/server
  if (endAll || forceEndAll) {
    socket.emit("end-meeting");
  } else {
    socket.emit("leave-meeting");
  }

  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();
  if (localStream) localStream.getTracks().forEach((t) => t.stop());

  window.location.href = "http://" + window.location.hostname + ":5173/dashboard";
}

async function finalizeRecording() {
  try {
    const res = await fetch(
      `/api/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(userId)}/finalize`,
      { method: "POST" }
    );
    const data = await res.json();
    console.log("Recording finalized:", data);
  } catch (err) {
    console.error("Failed to finalize recording", err);
  }
}

/* ── Sidebar Toggles ──────────────────────────────────────────────── */
function toggleSidebarTab(tab) {
  if (meetSidebar.classList.contains("hidden")) {
    meetSidebar.classList.remove("hidden");
    switchSidebarTab(tab);
  } else {
    const btnId = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}Btn`;
    const btn = document.getElementById(btnId);
    const isTabActive = btn && btn.classList.contains("active");
    if (isTabActive) {
      meetSidebar.classList.add("hidden");
    } else {
      switchSidebarTab(tab);
    }
  }
}

function switchSidebarTab(tab) {
  tabChatBtn.classList.remove("active");
  tabPeopleBtn.classList.remove("active");
  tabWhiteboardBtn.classList.remove("active");
  tabQuizBtn.classList.remove("active");
  tabDiagBtn.classList.remove("active");
  if (tabNegotiationBtn) tabNegotiationBtn.classList.remove("active");

  chatView.classList.add("hidden");
  peopleView.classList.add("hidden");
  whiteboardView.classList.add("hidden");
  quizView.classList.add("hidden");
  diagView.classList.add("hidden");
  const negotiationView = document.getElementById("negotiationView");
  if (negotiationView) negotiationView.classList.add("hidden");

  if (tab === "chat") {
    tabChatBtn.classList.add("active");
    chatView.classList.remove("hidden");
    unreadChatCount = 0;
    chatCountBadge.classList.add("hidden");
    chatCountBadge.textContent = "0";
  } else if (tab === "people") {
    tabPeopleBtn.classList.add("active");
    peopleView.classList.remove("hidden");
  } else if (tab === "whiteboard") {
    tabWhiteboardBtn.classList.add("active");
    whiteboardView.classList.remove("hidden");
    initWhiteboard();
  } else if (tab === "quiz") {
    tabQuizBtn.classList.add("active");
    quizView.classList.remove("hidden");
    loadQuizUI();
  } else if (tab === "diag") {
    tabDiagBtn.classList.add("active");
    diagView.classList.remove("hidden");
  } else if (tab === "negotiation") {
    if (tabNegotiationBtn) tabNegotiationBtn.classList.add("active");
    if (negotiationView) negotiationView.classList.remove("hidden");
    setupNegotiationBtn();
  }
}

function copyMeetingLink() {
  const joinUrl = `${window.location.origin}/?meetingId=${encodeURIComponent(meetingId)}`;
  navigator.clipboard.writeText(joinUrl).then(() => {
    alert("Meeting URL copied to clipboard! Share it with teammates to let them join.");
  }).catch(() => {
    alert("Failed to copy URL to clipboard: " + joinUrl);
  });
}

/* ── Full-Screen Premium Whiteboard ──────────────────────────────── */
let whiteboardCanvas = null;
let whiteboardCtx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let shapeStartX = 0;
let shapeStartY = 0;
let drawingPoints = [];
let wbTool = "pen";
let wbColor = "#a29bfe";
let wbBrushSize = 3;
let wbOpacity = 1.0;
let wbBgColor = "#070a1a";
let wbUndoStack = [];
let wbRedoStack = [];
let wbInitialized = false;

// Open the full-screen whiteboard modal
function openWhiteboard() {
  const modal = document.getElementById("whiteboardModal");
  modal.style.display = "flex";
  initFullWhiteboard();
}

function closeWhiteboard() {
  document.getElementById("whiteboardModal").style.display = "none";
}

function initFullWhiteboard() {
  if (wbInitialized) return;
  wbInitialized = true;

  whiteboardCanvas = document.getElementById("whiteboardCanvas");
  const container = document.getElementById("wbCanvasContainer");

  // Size canvas to fill container
  function resizeCanvas() {
    const snapshot = whiteboardCtx ? whiteboardCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height) : null;
    whiteboardCanvas.width = container.offsetWidth;
    whiteboardCanvas.height = container.offsetHeight;
    whiteboardCtx = whiteboardCanvas.getContext("2d");
    // Restore background
    whiteboardCtx.fillStyle = wbBgColor;
    whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
    if (snapshot) whiteboardCtx.putImageData(snapshot, 0, 0);
    applyCtxSettings();
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Brush size slider
  const sizeSlider = document.getElementById("wbBrushSize");
  const sizeLabel = document.getElementById("wbBrushSizeVal");
  sizeSlider.addEventListener("input", () => {
    wbBrushSize = parseInt(sizeSlider.value);
    sizeLabel.textContent = wbBrushSize;
    applyCtxSettings();
  });

  // Opacity slider
  document.getElementById("wbOpacity").addEventListener("input", (e) => {
    wbOpacity = parseInt(e.target.value) / 100;
    applyCtxSettings();
  });

  // Color picker
  document.getElementById("wbColorPicker").addEventListener("input", (e) => {
    setWbColor(e.target.value);
  });

  // Open whiteboard btn in sidebar
  const openBtn = document.getElementById("openWhiteboardBtn");
  if (openBtn) openBtn.addEventListener("click", openWhiteboard);

  // ── Mouse Events ──
  whiteboardCanvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    saveUndoSnapshot();
    const rect = whiteboardCanvas.getBoundingClientRect();
    lastX = shapeStartX = e.clientX - rect.left;
    lastY = shapeStartY = e.clientY - rect.top;

    if (wbTool === "text") {
      placeTextInput(lastX, lastY);
      isDrawing = false;
      return;
    }
  });

  whiteboardCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const rect = whiteboardCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (["pen", "marker", "eraser"].includes(wbTool)) {
      drawStroke(lastX, lastY, x, y);
      socket.emit("draw-line", { x0: lastX, y0: lastY, x1: x, y1: y, tool: wbTool, color: wbColor, size: wbBrushSize, opacity: wbOpacity });
      drawingPoints.push({ x0: Math.round(lastX), y0: Math.round(lastY), x1: Math.round(x), y1: Math.round(y) });
      lastX = x;
      lastY = y;
    } else {
      // Shape preview: restore last snapshot then draw preview
      const snapshot = wbUndoStack[wbUndoStack.length - 1];
      if (snapshot) {
        whiteboardCtx.putImageData(snapshot, 0, 0);
        applyCtxSettings();
      }
      drawShape(shapeStartX, shapeStartY, x, y, wbTool);
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    if (["line", "rect", "circle", "arrow"].includes(wbTool)) {
      const rect = whiteboardCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawShape(shapeStartX, shapeStartY, x, y, wbTool);
      socket.emit("draw-shape", { x0: shapeStartX, y0: shapeStartY, x1: x, y1: y, tool: wbTool, color: wbColor, size: wbBrushSize, opacity: wbOpacity });
    }
  });

  // ── Touch Events ──
  whiteboardCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isDrawing = true;
    saveUndoSnapshot();
    const rect = whiteboardCanvas.getBoundingClientRect();
    const t = e.touches[0];
    lastX = shapeStartX = t.clientX - rect.left;
    lastY = shapeStartY = t.clientY - rect.top;
  }, { passive: false });

  whiteboardCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const rect = whiteboardCanvas.getBoundingClientRect();
    const t = e.touches[0];
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    drawStroke(lastX, lastY, x, y);
    socket.emit("draw-line", { x0: lastX, y0: lastY, x1: x, y1: y, tool: wbTool, color: wbColor, size: wbBrushSize, opacity: wbOpacity });
    drawingPoints.push({ x0: Math.round(lastX), y0: Math.round(lastY), x1: Math.round(x), y1: Math.round(y) });
    lastX = x;
    lastY = y;
  }, { passive: false });

  whiteboardCanvas.addEventListener("touchend", () => { isDrawing = false; });

  // Mark pen as active on open
  setWbTool("pen");
}

function applyCtxSettings() {
  if (!whiteboardCtx) return;
  whiteboardCtx.lineWidth = wbBrushSize;
  whiteboardCtx.lineCap = "round";
  whiteboardCtx.lineJoin = "round";
  whiteboardCtx.globalAlpha = wbOpacity;
}

function drawStroke(x0, y0, x1, y1) {
  if (!whiteboardCtx) return;
  whiteboardCtx.save();
  if (wbTool === "eraser") {
    whiteboardCtx.globalCompositeOperation = "destination-out";
    whiteboardCtx.lineWidth = wbBrushSize * 4;
  } else {
    whiteboardCtx.globalCompositeOperation = "source-over";
    whiteboardCtx.strokeStyle = wbColor;
    whiteboardCtx.lineWidth = wbTool === "marker" ? wbBrushSize * 3 : wbBrushSize;
    whiteboardCtx.globalAlpha = wbTool === "marker" ? 0.5 : wbOpacity;
  }
  whiteboardCtx.beginPath();
  whiteboardCtx.moveTo(x0, y0);
  whiteboardCtx.lineTo(x1, y1);
  whiteboardCtx.stroke();
  whiteboardCtx.restore();
}

function drawShape(x0, y0, x1, y1, tool) {
  if (!whiteboardCtx) return;
  whiteboardCtx.save();
  whiteboardCtx.strokeStyle = wbColor;
  whiteboardCtx.lineWidth = wbBrushSize;
  whiteboardCtx.globalAlpha = wbOpacity;
  whiteboardCtx.globalCompositeOperation = "source-over";
  whiteboardCtx.beginPath();
  if (tool === "line") {
    whiteboardCtx.moveTo(x0, y0);
    whiteboardCtx.lineTo(x1, y1);
    whiteboardCtx.stroke();
  } else if (tool === "rect") {
    whiteboardCtx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  } else if (tool === "circle") {
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    whiteboardCtx.ellipse(x0 + (x1 - x0) / 2, y0 + (y1 - y0) / 2, rx, ry, 0, 0, Math.PI * 2);
    whiteboardCtx.stroke();
  } else if (tool === "arrow") {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const angle = Math.atan2(dy, dx);
    const headLen = Math.max(14, wbBrushSize * 4);
    whiteboardCtx.moveTo(x0, y0);
    whiteboardCtx.lineTo(x1, y1);
    whiteboardCtx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 6), y1 - headLen * Math.sin(angle - Math.PI / 6));
    whiteboardCtx.moveTo(x1, y1);
    whiteboardCtx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 6), y1 - headLen * Math.sin(angle + Math.PI / 6));
    whiteboardCtx.stroke();
  }
  whiteboardCtx.restore();
}

function placeTextInput(x, y) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = "Type here...";
  inp.style.cssText = `
    position: absolute; left: ${x}px; top: ${y - 14}px;
    background: transparent; border: none; border-bottom: 2px solid ${wbColor};
    color: ${wbColor}; font-size: ${Math.max(16, wbBrushSize * 4)}px;
    outline: none; min-width: 120px; z-index: 10; pointer-events: all;
    font-family: 'Outfit', sans-serif; caret-color: ${wbColor};
  `;
  const container = document.getElementById("wbCanvasContainer");
  container.appendChild(inp);
  inp.focus();
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inp.value.trim()) {
      saveUndoSnapshot();
      whiteboardCtx.save();
      whiteboardCtx.fillStyle = wbColor;
      whiteboardCtx.globalAlpha = wbOpacity;
      whiteboardCtx.font = `${Math.max(16, wbBrushSize * 4)}px 'Outfit', sans-serif`;
      whiteboardCtx.fillText(inp.value, x, y);
      whiteboardCtx.restore();
      socket.emit("draw-text", { x, y, text: inp.value, color: wbColor, size: Math.max(16, wbBrushSize * 4), opacity: wbOpacity });
      drawingPoints.push({ type: "text", x, y, text: inp.value });
      inp.remove();
    }
    if (e.key === "Escape") inp.remove();
  });
}

function addStickyNote() {
  if (!wbInitialized) openWhiteboard();
  const colors = ["#ffd93d", "#ff6b6b", "#6bcb77", "#4d96ff", "#a29bfe"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const container = document.getElementById("wbCanvasContainer");
  const note = document.createElement("div");
  const x = 80 + Math.random() * (container.offsetWidth - 250);
  const y = 80 + Math.random() * (container.offsetHeight - 180);
  note.style.cssText = `
    position:absolute; left:${x}px; top:${y}px; width:180px; min-height:120px;
    background:${color}; border-radius:4px; padding:12px; z-index:20;
    box-shadow: 3px 3px 12px rgba(0,0,0,0.4); cursor: move; pointer-events:all;
    font-family: 'Outfit', sans-serif; color: #1a1a1a; resize: both; overflow: hidden;
  `;
  note.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:11px;font-weight:700;opacity:0.6;">📌 Sticky Note</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:14px;opacity:0.5;">✕</button>
    </div>
    <div contenteditable="true" style="font-size:13px;line-height:1.4;outline:none;min-height:70px;">Click to type...</div>
  `;
  // Drag support
  let ox = 0, oy = 0, drag = false;
  note.addEventListener("mousedown", (e) => { if (e.target.tagName === "BUTTON" || e.target.contentEditable === "true") return; drag = true; ox = e.clientX - note.offsetLeft; oy = e.clientY - note.offsetTop; });
  window.addEventListener("mousemove", (e) => { if (!drag) return; note.style.left = (e.clientX - ox) + "px"; note.style.top = (e.clientY - oy) + "px"; });
  window.addEventListener("mouseup", () => { drag = false; });
  container.appendChild(note);
}

function setWbTool(tool) {
  wbTool = tool;
  document.querySelectorAll(".wb-tool").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("wb" + tool.charAt(0).toUpperCase() + tool.slice(1));
  if (btn) btn.classList.add("active");
  if (whiteboardCanvas) {
    whiteboardCanvas.style.cursor = tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair";
  }
}

function setWbColor(color) {
  wbColor = color;
  document.getElementById("wbColorPicker").value = color;
}

function setWbBg(color) {
  wbBgColor = color;
  if (whiteboardCtx) {
    saveUndoSnapshot();
    whiteboardCtx.save();
    whiteboardCtx.globalCompositeOperation = "destination-over";
    whiteboardCtx.fillStyle = color;
    whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
    whiteboardCtx.restore();
  }
}

function saveUndoSnapshot() {
  if (!whiteboardCtx) return;
  wbUndoStack.push(whiteboardCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height));
  if (wbUndoStack.length > 40) wbUndoStack.shift();
  wbRedoStack = [];
}

function wbUndo() {
  if (!whiteboardCtx || wbUndoStack.length === 0) return;
  wbRedoStack.push(whiteboardCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height));
  whiteboardCtx.putImageData(wbUndoStack.pop(), 0, 0);
}

function wbRedo() {
  if (!whiteboardCtx || wbRedoStack.length === 0) return;
  wbUndoStack.push(whiteboardCtx.getImageData(0, 0, whiteboardCanvas.width, whiteboardCanvas.height));
  whiteboardCtx.putImageData(wbRedoStack.pop(), 0, 0);
}

function clearLocalWhiteboard(broadcast = false) {
  if (!whiteboardCtx) { wbInitialized = false; initFullWhiteboard(); return; }
  saveUndoSnapshot();
  whiteboardCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
  whiteboardCtx.fillStyle = wbBgColor;
  whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
  drawingPoints = [];
  const resultEl = document.getElementById("whiteboardAnalysisResult");
  if (resultEl) resultEl.innerHTML = "";
  document.getElementById("wbAnalysisPanel").style.display = "none";
  if (broadcast) socket.emit("clear-whiteboard");
}

function downloadWhiteboard() {
  if (!whiteboardCanvas) return;
  const link = document.createElement("a");
  link.download = `ninaivunet-whiteboard-${Date.now()}.png`;
  link.href = whiteboardCanvas.toDataURL("image/png");
  link.click();
}

async function runAIWhiteboardAnalysis() {
  if (!meetingId) { alert("Join a meeting first to use AI analysis."); return; }
  if (drawingPoints.length === 0) { alert("Whiteboard is empty! Please draw something first."); return; }
  const panel = document.getElementById("wbAnalysisPanel");
  const resultEl = document.getElementById("whiteboardAnalysisResult");
  panel.style.display = "block";
  resultEl.innerHTML = "<span style='color:#a29bfe;'>🤖 AI is analyzing your diagram...</span>";
  try {
    const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}/analyze-whiteboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawingPoints })
    });
    const data = await res.json();
    if (data.ok) {
      resultEl.innerHTML = data.analysis;
    } else {
      resultEl.innerHTML = `<span style="color:#f87171">⚠ Error: ${data.error}</span>`;
    }
  } catch (err) {
    resultEl.innerHTML = `<span style="color:#f87171">⚠ Analysis failed: ${err.message}</span>`;
  }
}

// Socket.io relay listeners for whiteboard
socket.on("draw-line", ({ x0, y0, x1, y1, tool: remoteTool, color: remoteColor, size: remoteSize, opacity: remoteOpacity }) => {
  if (!whiteboardCtx) return;
  const prevTool = wbTool, prevColor = wbColor, prevSize = wbBrushSize, prevOpacity = wbOpacity;
  wbTool = remoteTool || "pen";
  wbColor = remoteColor || "#a29bfe";
  wbBrushSize = remoteSize || 3;
  wbOpacity = remoteOpacity || 1;
  drawStroke(x0, y0, x1, y1);
  wbTool = prevTool; wbColor = prevColor; wbBrushSize = prevSize; wbOpacity = prevOpacity;
  drawingPoints.push({ x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) });
});

socket.on("draw-shape", ({ x0, y0, x1, y1, tool: remoteTool, color: remoteColor, size: remoteSize, opacity: remoteOpacity }) => {
  if (!whiteboardCtx) return;
  const prevTool = wbTool, prevColor = wbColor, prevSize = wbBrushSize, prevOpacity = wbOpacity;
  wbTool = remoteTool; wbColor = remoteColor; wbBrushSize = remoteSize; wbOpacity = remoteOpacity;
  drawShape(x0, y0, x1, y1, remoteTool);
  wbTool = prevTool; wbColor = prevColor; wbBrushSize = prevSize; wbOpacity = prevOpacity;
});

socket.on("draw-text", ({ x, y, text, color: remoteColor, size: remoteSize, opacity: remoteOpacity }) => {
  if (!whiteboardCtx) return;
  whiteboardCtx.save();
  whiteboardCtx.fillStyle = remoteColor || "#a29bfe";
  whiteboardCtx.globalAlpha = remoteOpacity || 1;
  whiteboardCtx.font = `${remoteSize || 20}px 'Outfit', sans-serif`;
  whiteboardCtx.fillText(text, x, y);
  whiteboardCtx.restore();
  drawingPoints.push({ type: "text", x, y, text });
});

socket.on("clear-whiteboard", () => {
  clearLocalWhiteboard(false);
});

// Trigger open when sidebar open button is used
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openWhiteboardBtn");
  if (openBtn) openBtn.addEventListener("click", openWhiteboard);
});

/* ── WebRTCMesh Signaling ─────────────────────────────────────────── */
socket.on("existing-peers", async (peers) => {
  for (const peer of peers) {
    peerNames.set(peer.socketId, { userName: peer.userName, role: peer.role });
    peerStates.set(peer.socketId, { micEnabled: true, camEnabled: true, handRaised: false });
    await createPeerConnection(peer.socketId, peer.userName, true);
  }
  updatePeopleList();
  updateGridSize();
});

socket.on("peer-joined", async ({ socketId, userName: remoteName, role }) => {
  peerNames.set(socketId, { userName: remoteName, role });
  peerStates.set(socketId, { micEnabled: true, camEnabled: true, handRaised: false });
  await createPeerConnection(socketId, remoteName, false);
  updatePeopleList();
  updateGridSize();
});

socket.on("peer-left", ({ socketId }) => {
  const pc = peerConnections.get(socketId);
  if (pc) pc.close();
  peerConnections.delete(socketId);
  peerNames.delete(socketId);
  peerStates.delete(socketId);
  removeVideoTile(socketId);
  updatePeopleList();
  updateGridSize();
});

socket.on("signal", async ({ from, data }) => {
  let pc = peerConnections.get(from);
  if (!pc) {
    const peerData = peerNames.get(from) || { userName: "Teammate" };
    pc = await createPeerConnection(from, peerData.userName, false);
  }

  if (data.type === "offer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { to: from, data: pc.localDescription });
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data));
  } else if (data.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data));
    } catch (e) {
      console.warn("ICE candidate error", e);
    }
  }
});

async function createPeerConnection(socketId, remoteName, isInitiator) {
  if (peerConnections.has(socketId)) return peerConnections.get(socketId);

  const pc = new RTCPeerConnection(STUN_SERVERS);
  peerConnections.set(socketId, pc);

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { to: socketId, data: event.candidate });
    }
  };

  pc.ontrack = (event) => {
    addVideoTile(socketId, remoteName, event.streams[0], false);
    // sync current mic/cam state to this new peer
    socket.emit("peer-state-change", { micEnabled: isMicEnabled, camEnabled: isCamEnabled, handRaised: isHandRaised });
  };

  pc.onconnectionstatechange = () => {
    if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
      removeVideoTile(socketId);
    }
  };

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { to: socketId, data: pc.localDescription });
  }

  return pc;
}

/* ── UI Video Grid Management ─────────────────────────────────────── */
function addVideoTile(id, label, stream, isLocal) {
  removeVideoTile(id);

  const tile = document.createElement("div");
  tile.className = `video-tile ${isLocal ? "local" : "remote"}`;
  tile.id = `tile-${id}`;

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  if (isLocal) video.muted = true;
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play().catch((err) => {
      console.warn("Playback blocked by browser autoplay policy:", err.message);
    });
  };

  const labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.textContent = label;

  // Avatar placeholder for when camera is off
  const avatarPlaceholder = document.createElement("div");
  avatarPlaceholder.className = "avatar-placeholder hidden";
  const avatarCircle = document.createElement("div");
  avatarCircle.className = "avatar-circle";
  // Select color gradient based on user name length
  const colors = ["var(--avatar-blue)", "var(--avatar-green)", "var(--avatar-purple)"];
  avatarCircle.style.background = colors[label.length % colors.length];
  avatarCircle.textContent = label.charAt(0).toUpperCase();
  avatarPlaceholder.appendChild(avatarCircle);

  // Status badge overlays (mute indicators, raised hands)
  const tileStatus = document.createElement("div");
  tileStatus.className = "tile-status";

  const muteBadge = document.createElement("div");
  muteBadge.className = "tile-badge danger hidden";
  muteBadge.id = `muteBadge-${id}`;
  muteBadge.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 11v-1M19 10v1a7 7 0 0 1-.07 1"/></svg>`;
  tileStatus.appendChild(muteBadge);

  const handBadge = document.createElement("div");
  handBadge.className = "tile-badge hidden";
  handBadge.id = `handBadge-${id}`;
  handBadge.style.color = "var(--primary)";
  handBadge.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7.5M6 13V9.5a1.5 1.5 0 0 0-3 0v10A4.5 4.5 0 0 0 7.5 24h6a7.5 7.5 0 0 0 7.5-7.5v-3a1.5 1.5 0 0 0-3 0V11h-3"/></svg>`;
  tileStatus.appendChild(handBadge);

  tile.appendChild(video);
  tile.appendChild(avatarPlaceholder);
  tile.appendChild(labelEl);
  tile.appendChild(tileStatus);

  videoGrid.appendChild(tile);
  updateGridSize();
}

function removeVideoTile(id) {
  const el = document.getElementById(`tile-${id}`);
  if (el) {
    el.remove();
    updateGridSize();
  }
}

function updateGridSize() {
  const tiles = videoGrid.children.length;
  videoGrid.className = "video-grid"; // reset

  if (tiles === 1) {
    videoGrid.classList.add("one-peer");
  } else if (tiles === 2) {
    videoGrid.classList.add("two-peers");
  } else {
    videoGrid.classList.add("multi-peers");
  }
}

/* ── In-call Messaging (Chat) ─────────────────────────────────────── */
function sendChatMessage(e) {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Render outgoing message locally
  appendMessage(userName, text, true);
  chatInput.value = "";

  // Broadcast to peers
  socket.emit("chat-message", text);
}

socket.on("chat-message", ({ from, text, time }) => {
  appendMessage(from, text, false);

  // Increment unread chat count if sidebar is closed
  if (meetSidebar.classList.contains("hidden") || !chatView.classList.contains("hidden") === false) {
    unreadChatCount++;
    chatCountBadge.textContent = unreadChatCount;
    chatCountBadge.classList.remove("hidden");
  }
});

function appendMessage(sender, text, isOutgoing) {
  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${isOutgoing ? "outgoing" : "incoming"}`;

  const senderEl = document.createElement("span");
  senderEl.className = "msg-sender";
  senderEl.textContent = isOutgoing ? "You" : sender;

  const textEl = document.createElement("span");
  textEl.textContent = text;

  const timeEl = document.createElement("span");
  timeEl.className = "msg-time";
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bubble.appendChild(senderEl);
  bubble.appendChild(textEl);
  bubble.appendChild(timeEl);

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight; // auto scroll
}

/* ── Interactive Call Toggles ────────────────────────────────────── */
function toggleMute() {
  isMicEnabled = !isMicEnabled;
  const track = localStream.getAudioTracks()[0];
  if (track) track.enabled = isMicEnabled;

  // Toggle button icons
  if (isMicEnabled) {
    muteBtn.classList.remove("inactive");
    muteBtn.classList.add("active");
    muteBtn.querySelector(".icon-mic").classList.remove("hidden");
    muteBtn.querySelector(".icon-mic-off").classList.add("hidden");
    document.getElementById("muteBadge-local").classList.add("hidden");
  } else {
    muteBtn.classList.remove("active");
    muteBtn.classList.add("inactive");
    muteBtn.querySelector(".icon-mic").classList.add("hidden");
    muteBtn.querySelector(".icon-mic-off").classList.remove("hidden");
    document.getElementById("muteBadge-local").classList.remove("hidden");
  }

  // Sync to peers
  socket.emit("peer-state-change", { micEnabled: isMicEnabled, camEnabled: isCamEnabled, handRaised: isHandRaised });
}

function toggleCamera() {
  isCamEnabled = !isCamEnabled;
  const track = localStream.getVideoTracks()[0];
  if (track) track.enabled = isCamEnabled;

  const localTile = document.getElementById("tile-local");
  const avatarPlaceholder = localTile.querySelector(".avatar-placeholder");
  const videoEl = localTile.querySelector("video");

  if (isCamEnabled) {
    camBtn.classList.remove("inactive");
    camBtn.classList.add("active");
    camBtn.querySelector(".icon-cam").classList.remove("hidden");
    camBtn.querySelector(".icon-cam-off").classList.add("hidden");
    avatarPlaceholder.classList.add("hidden");
    videoEl.style.opacity = 1;
  } else {
    camBtn.classList.remove("active");
    camBtn.classList.add("inactive");
    camBtn.querySelector(".icon-cam").classList.add("hidden");
    camBtn.querySelector(".icon-cam-off").classList.remove("hidden");
    avatarPlaceholder.classList.remove("hidden");
    videoEl.style.opacity = 0;
  }

  // Sync to peers
  socket.emit("peer-state-change", { micEnabled: isMicEnabled, camEnabled: isCamEnabled, handRaised: isHandRaised });
}

async function toggleScreenShare() {
  if (!isScreenSharing) {
    try {
      // Request screen stream from browser
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace the video track on all active peer connections
      peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Update local video element srcObject to display the screen stream
      const localVideo = document.querySelector("#tile-local video");
      if (localVideo) {
        localVideo.srcObject = screenStream;
        localVideo.style.transform = "scaleX(1)"; // Screen share should NOT be mirrored
      }

      isScreenSharing = true;
      screenBtn.classList.add("active");
      screenBtn.style.color = "var(--primary)";

      // Revert to camera if they stop screen sharing from browser bar
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Failed to start screen share:", err);
    }
  } else {
    stopScreenShare();
  }
}

function stopScreenShare() {
  if (!isScreenSharing) return;

  // Stop screen sharing tracks
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }

  // Restore camera track in stream
  const cameraTrack = localStream.getVideoTracks()[0];

  // Replace track on all peer connections
  peerConnections.forEach((pc) => {
    const sender = pc.getSenders().find((s) => s.track.kind === "video");
    if (sender && cameraTrack) {
      sender.replaceTrack(cameraTrack);
    }
  });

  // Restore local video element back to camera stream
  const localVideo = document.querySelector("#tile-local video");
  if (localVideo) {
    localVideo.srcObject = localStream;
    localVideo.style.transform = "scaleX(-1)"; // mirror camera stream back
  }

  isScreenSharing = false;
  screenBtn.classList.remove("active");
  screenBtn.style.color = "var(--text-primary)";
}

function toggleHandRaise() {
  isHandRaised = !isHandRaised;

  if (isHandRaised) {
    handBtn.classList.add("active");
    document.getElementById("handBadge-local").classList.remove("hidden");
  } else {
    handBtn.classList.remove("active");
    document.getElementById("handBadge-local").classList.add("hidden");
  }

  // Sync to peers
  socket.emit("peer-state-change", { micEnabled: isMicEnabled, camEnabled: isCamEnabled, handRaised: isHandRaised });
}

/* ── Socket State updates ─────────────────────────────────────────── */
socket.on("peer-state-change", ({ from, micEnabled, camEnabled, handRaised }) => {
  const peerTile = document.getElementById(`tile-${from}`);
  if (!peerTile) return;

  peerStates.set(from, { micEnabled, camEnabled, handRaised });

  // Update mic badge
  const muteBadge = document.getElementById(`muteBadge-${from}`);
  if (muteBadge) {
    if (!micEnabled) muteBadge.classList.remove("hidden");
    else muteBadge.classList.add("hidden");
  }

  // Update hand badge
  const handBadge = document.getElementById(`handBadge-${from}`);
  if (handBadge) {
    if (handRaised) handBadge.classList.remove("hidden");
    else handBadge.classList.add("hidden");
  }

  // Update video display / avatar placeholder
  const avatarPlaceholder = peerTile.querySelector(".avatar-placeholder");
  const videoEl = peerTile.querySelector("video");
  if (avatarPlaceholder && videoEl) {
    if (!camEnabled) {
      avatarPlaceholder.classList.remove("hidden");
      videoEl.style.opacity = 0;
    } else {
      avatarPlaceholder.classList.add("hidden");
      videoEl.style.opacity = 1;
    }
  }
});

socket.on("hand-raise", ({ from, isRaised }) => {
  const badge = document.getElementById(`handBadge-${from}`);
  if (badge) {
    if (isRaised) badge.classList.remove("hidden");
    else badge.classList.add("hidden");
  }
});

/* ── Participants List Rendering ─────────────────────────────────── */
function updatePeopleList() {
  peopleList.innerHTML = "";

  // Add Local
  addPersonItem("local", `${userName} (You)`, myRole);

  // Add Remote
  peerNames.forEach((peerObj, socketId) => {
    addPersonItem(socketId, peerObj.userName, peerObj.role);
  });

  const count = 1 + peerConnections.size;
  peopleCountBadge.textContent = count;
}

function addPersonItem(id, name, role) {
  const item = document.createElement("div");
  item.className = "person-item";
  item.style.display = "flex";
  item.style.justifyContent = "space-between";
  item.style.alignItems = "center";
  item.style.padding = "8px 0";

  const info = document.createElement("div");
  info.className = "person-info";
  info.style.display = "flex";
  info.style.alignItems = "center";
  info.style.gap = "10px";

  const avatar = document.createElement("div");
  avatar.className = "person-avatar";
  avatar.textContent = name.charAt(0).toUpperCase();

  const nameEl = document.createElement("span");
  nameEl.className = "person-name";
  nameEl.textContent = name;
  if (role) {
    nameEl.textContent += ` (${role})`;
  }

  info.appendChild(avatar);
  info.appendChild(nameEl);
  item.appendChild(info);

  if (id !== "local" && myRole === "lead") {
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";

    const muteBtn = document.createElement("button");
    muteBtn.innerHTML = "🔇";
    muteBtn.title = "Force Mute";
    muteBtn.style.background = "rgba(255,255,255,0.05)";
    muteBtn.style.border = "none";
    muteBtn.style.cursor = "pointer";
    muteBtn.style.padding = "4px 8px";
    muteBtn.style.borderRadius = "4px";
    muteBtn.onclick = () => {
      socket.emit("control-mute", { targetSocketId: id });
    };

    const kickBtn = document.createElement("button");
    kickBtn.innerHTML = "❌";
    kickBtn.title = "Kick Participant";
    kickBtn.style.background = "rgba(239, 68, 68, 0.1)";
    kickBtn.style.color = "#ef4444";
    kickBtn.style.border = "none";
    kickBtn.style.cursor = "pointer";
    kickBtn.style.padding = "4px 8px";
    kickBtn.style.borderRadius = "4px";
    kickBtn.onclick = () => {
      const confirmKick = window.confirm(`Are you sure you want to remove ${name} from this meeting?`);
      if (confirmKick) {
        socket.emit("control-kick", { targetSocketId: id });
      }
    };

    controls.appendChild(muteBtn);
    controls.appendChild(kickBtn);
    item.appendChild(controls);
  }

  peopleList.appendChild(item);
}

/* ── Local Recording ──────────────────────────────────────────────── */
let mediaRecorder = null;
let chunkIndex = 0;

function startLocalAudioCapture() {
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.warn("No audio tracks available for local recording capture.");
    return;
  }
  const audioOnlyStream = new MediaStream(audioTracks);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  try {
    mediaRecorder = new MediaRecorder(audioOnlyStream, { mimeType });
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        await uploadAudioChunk(event.data, chunkIndex++);
      }
    };

    reportRecordingStart();
    mediaRecorder.start(chunkUploadInterval);
  } catch (err) {
    console.error("Failed to start MediaRecorder:", err);
  }
}

async function reportRecordingStart() {
  try {
    await fetch(
      `/api/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(userId)}/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, startedAtMs: Date.now() }),
      }
    );
  } catch (err) {
    console.error("Failed to report recording start time", err);
  }
}

function stopLocalAudioCapture() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return resolve();
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        await uploadAudioChunk(event.data, chunkIndex++);
      }
      resolve();
    };
    mediaRecorder.stop();
  });
}

async function uploadAudioChunk(blob, index) {
  const formData = new FormData();
  formData.append("meetingId", meetingId);
  formData.append("userId", userId);
  formData.append("chunkIndex", index);
  formData.append("audio", blob, `chunk-${index}.webm`);

  try {
    await fetch("/api/upload-audio", { method: "POST", body: formData });
  } catch (err) {
    console.error("Failed to upload audio chunk", err);
  }
}

/* ── Auto Join Setup ──────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const qMeetingId = params.get("meetingId");
  const qUserName = params.get("userName");

  if (qMeetingId) {
    document.getElementById("meetingId").value = qMeetingId;
  }
  if (qUserName) {
    document.getElementById("userName").value = qUserName;
  }

  if (qMeetingId && qUserName) {
    joinScreen.classList.add("hidden");
    meetingScreen.classList.remove("hidden");
    joinMeeting();
  }

  const qIsHost = params.get("isHost") === "true";
  if (qIsHost) {
    const leaveBtn = document.getElementById("leaveBtn");
    if (leaveBtn) {
      leaveBtn.title = "End Call for All";
    }
  }
});
window.addEventListener("beforeunload", () => {
  socket.emit("leave-meeting");
});

// Autoplay workaround for mobile browsers (Safari/Chrome block unmuted remote video play)
const resumeAllVideos = () => {
  document.querySelectorAll("video").forEach((v) => {
    if (v.paused) {
      v.play().catch((err) => console.log("Video resume blocked:", err.message));
    }
  });
};
document.addEventListener("click", resumeAllVideos, { once: false });
document.addEventListener("touchstart", resumeAllVideos, { once: false });

socket.on("meeting-ended", () => {
  alert("The host has ended this meeting.");
  leaveMeeting(true);
});

socket.on("join-rejected", ({ error }) => {
  joinScreen.innerHTML = `
    <div class="join-card" style="border-top: 4px solid var(--danger); text-align: center;">
      <div class="logo-area" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <span style="font-size: 54px; margin-bottom: 12px;">⚠️</span>
        <h2 style="color: white; margin-top: 10px;">Access Denied</h2>
      </div>
      <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; line-height: 1.5; padding: 0 10px;">
        ${error}
      </p>
      <button onclick="window.location.href='http://' + window.location.hostname + ':5173/dashboard'" style="width: 100%; border-radius: 8px; font-weight: 600; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--panel-border); color: white; cursor: pointer;">
        Back to Dashboard
      </button>
    </div>
  `;
  joinScreen.classList.remove("hidden");
  meetingScreen.classList.add("hidden");
});

socket.on("meeting-joined", ({ role, domain }) => {
  myRole = role;
  projectDomain = domain;
  updatePeopleList();
  if (projectDomain === "education") {
    tabQuizBtn.classList.remove("hidden");
  } else if (projectDomain === "corporate" && myRole === "lead") {
    tabDiagBtn.classList.remove("hidden");
  }
});

socket.on("control-mute-forced", () => {
  if (isMicEnabled) {
    toggleMute();
    alert("You have been muted by the host.");
  }
});

socket.on("control-kick-forced", () => {
  alert("You have been kicked out of the meeting by the host.");
  leaveMeeting(true);
});

socket.on("quiz-launched", ({ questionObj }) => {
  activeLiveQuiz = questionObj;
  meetSidebar.classList.remove("hidden");
  switchSidebarTab("quiz");
});

socket.on("quiz-closed", () => {
  activeLiveQuiz = null;
  loadQuizUI();
});

socket.on("quiz-answer-update", (payload) => {
  quizResultStats = payload;
  const isQuizActive = tabQuizBtn.classList.contains("active") && !meetSidebar.classList.contains("hidden");
  if (isQuizActive) {
    loadQuizUI();
  }
});

async function runAIDiagnostics() {
  diagResult.innerHTML = "<p style='color:var(--text-muted);'>Running diagnostics... Please wait...</p>";
  try {
    const projectId = meetingId.split("_")[0];
    const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, userName })
    });
    const data = await res.json();
    if (data.ok) {
      diagResult.innerHTML = data.html;
    } else {
      diagResult.innerHTML = `<p style='color:#e74c3c;'>Error: ${data.error}</p>`;
    }
  } catch (err) {
    console.error(err);
    diagResult.innerHTML = "<p style='color:#e74c3c;'>Failed to compile live meeting diagnostics.</p>";
  }
}

async function loadQuizUI() {
  quizContainer.innerHTML = "";

  if (myRole === "lead") {
    const title = document.createElement("h3");
    title.textContent = "Class Quiz Console";
    title.style.color = "var(--primary)";
    title.style.marginBottom = "16px";
    title.className = "h-outfit";
    quizContainer.appendChild(title);

    // 🧠 AI Practice Quiz Generator
    const generatorBox = document.createElement("div");
    generatorBox.className = "glass-card";
    generatorBox.style.padding = "14px";
    generatorBox.style.marginBottom = "20px";
    generatorBox.style.border = "1px solid rgba(108,92,231,0.15)";
    generatorBox.style.background = "rgba(255,255,255,0.01)";

    generatorBox.innerHTML = `
      <h4 style="margin:0 0 8px; font-size:13px; font-weight:600; color:white; display:flex; align-items:center; gap:6px;">🧠 AI Quiz Generator</h4>
      <textarea id="aiQuizPrompt" placeholder="Topic or Prompt (e.g. give 5 quiz questions about Python lists)" style="width:100%; height:50px; background:var(--bg-base); border:1px solid var(--panel-border); border-radius:6px; color:white; padding:8px; font-size:12px; resize:none; outline:none; margin-bottom:8px; font-family:sans-serif;"></textarea>
      <button id="aiQuizGenBtn" class="btn btn-primary w-full" style="padding:6px; font-size:12px; font-weight:600;">Generate & Add to List</button>
    `;
    quizContainer.appendChild(generatorBox);

    const genBtn = generatorBox.querySelector("#aiQuizGenBtn");
    const promptInput = generatorBox.querySelector("#aiQuizPrompt");

    genBtn.onclick = async () => {
      const promptText = promptInput.value.trim();
      if (!promptText) return alert("Please type a topic or quiz prompt first!");
      genBtn.textContent = "Generating Quiz via AI...";
      genBtn.disabled = true;
      try {
        const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}/generate-quiz`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prompt: promptText })
        });
        const data = await res.json();
        if (data.ok && data.quiz) {
          alert(`Successfully generated quiz question:\n"${data.quiz.question}"\n\nAdded to your practice list.`);
          promptInput.value = "";
          if (!window.customQuizzes) window.customQuizzes = [];
          window.customQuizzes.push(data.quiz);
          loadQuizUI();
        } else {
          alert("Failed to generate quiz: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        alert("Failed to reach AI Quiz Generator server.");
      } finally {
        genBtn.textContent = "Generate & Add to List";
        genBtn.disabled = false;
      }
    };

    if (quizResultStats) {
      const statsCard = document.createElement("div");
      statsCard.className = "glass-card";
      statsCard.style.padding = "16px";
      statsCard.style.marginBottom = "16px";
      statsCard.style.border = "1px solid rgba(108,92,231,0.2)";

      statsCard.innerHTML = `
        <h4 style="margin:0 0 8px; font-size:14px; font-weight:600; color:white;">Live Telemetry:</h4>
        <p style="margin:4px 0; font-size:13px; color:var(--text-secondary);"><strong>Question:</strong> ${quizResultStats.question}</p>
        <p style="margin:4px 0; font-size:13px; color:var(--text-secondary);"><strong>Total Answers:</strong> ${quizResultStats.totalSubmissions}</p>
        <p style="margin:4px 0; font-size:13px; color:#2ecc71;"><strong>Correct Answers:</strong> ${quizResultStats.correctCount}</p>
        <p style="margin:4px 0; font-size:13px; color:#e74c3c;"><strong>Incorrect Answers:</strong> ${quizResultStats.incorrectCount}</p>
      `;

      const detailsDiv = document.createElement("div");
      detailsDiv.style.marginTop = "12px";
      detailsDiv.style.maxHeight = "150px";
      detailsDiv.style.overflowY = "auto";
      detailsDiv.style.borderTop = "1px solid var(--panel-border)";
      detailsDiv.style.paddingTop = "8px";

      quizResultStats.details.forEach(d => {
        const item = document.createElement("div");
        item.style.fontSize = "12px";
        item.style.padding = "4px 0";
        item.style.color = d.isCorrect ? "#2ecc71" : "#e74c3c";
        item.textContent = `● ${d.studentName}: ${d.answer} (${d.isCorrect ? "Correct" : "Incorrect"})`;
        detailsDiv.appendChild(item);
      });
      statsCard.appendChild(detailsDiv);

      const closeBtn = document.createElement("button");
      closeBtn.className = "btn btn-secondary w-full";
      closeBtn.style.marginTop = "12px";
      closeBtn.textContent = "End Practice Quiz";
      closeBtn.style.padding = "8px";
      closeBtn.style.borderRadius = "6px";
      closeBtn.style.cursor = "pointer";
      closeBtn.onclick = () => {
        socket.emit("quiz-close");
        quizResultStats = null;
        loadQuizUI();
      };
      statsCard.appendChild(closeBtn);
      quizContainer.appendChild(statsCard);
    }

    const listTitle = document.createElement("h4");
    listTitle.textContent = "Available Class Quizzes:";
    listTitle.style.fontSize = "14px";
    listTitle.style.fontWeight = "600";
    listTitle.style.margin = "16px 0 10px";
    listTitle.style.color = "white";
    quizContainer.appendChild(listTitle);

    let dbQuizzes = [];
    try {
      const projectId = meetingId.split("_")[0];
      const res = await fetch(`/api/db/projects/${projectId}/assignments`);
      const data = await res.json();
      if (data.ok) {
        dbQuizzes = data.assignments || [];
      }
    } catch (err) {
      console.warn("Failed to load course assignments:", err.message);
    }

    const allQuizzes = [...(window.customQuizzes || []), ...dbQuizzes];

    if (allQuizzes.length > 0) {
      allQuizzes.forEach((q, idx) => {
        const card = document.createElement("div");
        card.className = "glass-card";
        card.style.padding = "12px";
        card.style.marginBottom = "10px";
        card.style.background = "rgba(255,255,255,0.02)";

        card.innerHTML = `
          <p style="font-size:13px; font-weight:600; color:white; margin:0 0 6px;">Q${idx+1}: ${q.question}</p>
          <p style="font-size:11px; color:var(--text-muted); margin:0 0 10px;">Options: ${q.options.join(", ")}</p>
        `;

        const launchBtn = document.createElement("button");
        launchBtn.className = "btn btn-primary";
        launchBtn.style.padding = "6px 12px";
        launchBtn.style.fontSize = "11px";
        launchBtn.style.borderRadius = "4px";
        launchBtn.style.cursor = "pointer";
        launchBtn.textContent = "Launch Question Live";
        launchBtn.onclick = () => {
          socket.emit("quiz-launch", { questionObj: q });
          quizResultStats = {
            question: q.question,
            totalSubmissions: 0,
            correctCount: 0,
            incorrectCount: 0,
            details: []
          };
          loadQuizUI();
        };
        card.appendChild(launchBtn);
        quizContainer.appendChild(card);
      });
    }
  } else {
    if (activeLiveQuiz) {
      const q = activeLiveQuiz;
      const card = document.createElement("div");
      card.className = "glass-card";
      card.style.padding = "16px";
      card.style.border = "1px solid var(--primary)";

      card.innerHTML = `
        <div style="background: rgba(108,92,231,0.1); color: var(--primary); padding: 4px 8px; border-radius: 4px; display:inline-block; font-size:11px; font-weight:700; margin-bottom:12px;">LIVE CLASS PRACTICE QUIZ</div>
        <h4 style="margin:0 0 16px; font-size:15px; font-weight:600; color:white; line-height:1.4;">${q.question}</h4>
      `;

      const optionsForm = document.createElement("form");
      optionsForm.style.display = "flex";
      optionsForm.style.flexDirection = "column";
      optionsForm.style.gap = "10px";

      q.options.forEach((opt) => {
        const row = document.createElement("label");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.cursor = "pointer";
        row.style.fontSize = "13px";
        row.style.color = "var(--text-secondary)";

        row.innerHTML = `
          <input type="radio" name="quiz-opt" value="${opt}" style="accent-color: var(--primary);" required />
          <span>${opt}</span>
        `;
        optionsForm.appendChild(row);
      });

      const submitBtn = document.createElement("button");
      submitBtn.type = "submit";
      submitBtn.className = "btn btn-primary w-full";
      submitBtn.style.marginTop = "16px";
      submitBtn.style.padding = "10px";
      submitBtn.style.borderRadius = "6px";
      submitBtn.style.cursor = "pointer";
      submitBtn.textContent = "Submit Answer";
      optionsForm.appendChild(submitBtn);

      optionsForm.onsubmit = (e) => {
        e.preventDefault();
        const selected = optionsForm.querySelector('input[name="quiz-opt"]:checked')?.value;
        if (selected) {
          socket.emit("quiz-submit", { answer: selected });
          card.innerHTML = `
            <div style="text-align:center; padding: 24px 0;">
              <span style="font-size:36px;">✅</span>
              <h4 style="margin:12px 0 6px; color:white;">Answer Submitted Successfully!</h4>
              <p style="font-size:12px; color:var(--text-muted); margin:0;">Waiting for the instructor to reveal course results...</p>
            </div>
          `;
        }
      };

      card.appendChild(optionsForm);
      quizContainer.appendChild(card);
    } else {
      quizContainer.innerHTML = `
        <div style="text-align:center; padding: 48px 16px; color: var(--text-muted);">
          <span style="font-size: 32px;">⏳</span>
          <p style="margin-top:12px; font-size:13px; line-height:1.4;">Waiting for the instructor to launch a class practice quiz...</p>
        </div>
      `;
    }
  }
}

/* ── AI Negotiation Analyzer & Ambient Coach ────────────────────── */
function setupNegotiationBtn() {
  const btn = document.getElementById("runNegotiationBtn");
  const result = document.getElementById("negotiationResult");
  if (!btn || !result) return;
  btn.onclick = async () => {
    result.innerHTML = "<span style='color:var(--primary);'>AI is analyzing negotiation...</span>";
    try {
      const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}/negotiation-analyze`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        result.innerHTML = data.html;
      } else {
        result.innerHTML = `<span style="color:#ef4444">Error: ${data.error}</span>`;
      }
    } catch (err) {
      result.innerHTML = `<span style="color:#ef4444">Analysis failed: ${err.message}</span>`;
    }
  };
}

let aiCoachInterval = null;
function startAICoach() {
  if (aiCoachInterval) clearInterval(aiCoachInterval);
  const bar = document.getElementById("aiCoachBar");
  const text = document.getElementById("aiCoachText");
  if (!bar || !text) return;

  const fetchHint = async () => {
    try {
      const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}/coach-hints`);
      const data = await res.json();
      if (data.ok && data.hint) {
        text.innerHTML = data.hint;
        bar.style.display = "flex";
        bar.hidden = false;
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
          bar.hidden = true;
        }, 15000);
      }
    } catch (e) {
      console.warn("AI Coach hint fetch failed:", e.message);
    }
  };

  // Run first check after 45s, then every 90s
  setTimeout(() => {
    fetchHint();
    aiCoachInterval = setInterval(fetchHint, 90000);
  }, 45000);
}

// Call startAICoach inside joinMeeting setup when socket returns success
socket.on("meeting-joined", ({ role, domain }) => {
  myRole = role;
  projectDomain = domain;
  updatePeopleList();
  if (projectDomain === "education") {
    tabQuizBtn.classList.remove("hidden");
  } else if (projectDomain === "corporate" && myRole === "lead") {
    tabDiagBtn.classList.remove("hidden");
  }
  // Start ambient coach for corporate/professional calls
  startAICoach();
  // Start speech recognition for live captions (Feature 5)
  initLiveCaptions();
});

let speechRecognition = null;
const preferredLanguage = new URLSearchParams(window.location.search).get("lang") || "en";

function initLiveCaptions() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech API is not supported in this browser. Live captioning will be disabled.");
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = false;
  
  const langMap = { en: "en-US", ta: "ta-IN", hi: "hi-IN", es: "es-ES", fr: "fr-FR", ar: "ar-EG" };
  speechRecognition.lang = langMap[preferredLanguage] || preferredLanguage;

  speechRecognition.onresult = (event) => {
    const resultIndex = event.resultIndex;
    const transcript = event.results[resultIndex][0].transcript.trim();
    if (transcript) {
      socket.emit("live-caption", { text: transcript, language: preferredLanguage });
    }
  };

  speechRecognition.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
  };

  speechRecognition.onend = () => {
    if (speechRecognition) {
      try {
        speechRecognition.start();
      } catch (err) {}
    }
  };

  try {
    speechRecognition.start();
  } catch (err) {
    console.warn("Failed to start speech recognition:", err.message);
  }
}

socket.on("live-caption-received", async ({ speaker, text, language }) => {
  let displayText = text;
  if (language !== preferredLanguage) {
    try {
      const res = await fetch("/api/db/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: preferredLanguage })
      });
      const data = await res.json();
      if (data.ok && data.translated) {
        displayText = data.translated;
      }
    } catch (err) {
      console.warn("Caption translation error:", err.message);
    }
  }

  const container = document.getElementById("liveCaptionContainer");
  if (container) {
    container.innerHTML = `<strong>${speaker}:</strong> ${displayText}`;
    container.style.display = "block";
    if (window.captionTimeout) clearTimeout(window.captionTimeout);
    window.captionTimeout = setTimeout(() => {
      container.style.display = "none";
    }, 5000);
  }
});