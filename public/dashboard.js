/* ------------------------------------------------------------------ */
/* Session - identity persists across visits; the CURRENT project/role  */
/* selection does NOT (you re-pick which project each time, since the  */
/* whole point is you may belong to several).                          */
/* ------------------------------------------------------------------ */
let userName = localStorage.getItem("ninaivunet_username") || null;
let currentProject = null; // { project_id, name, domain, role } - role comes from the server, never chosen here

const loginScreen = document.getElementById("login-screen");
const pickerScreen = document.getElementById("project-picker-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

/* ---------------- Step 1: sign in ---------------- */
document.getElementById("loginBtn").addEventListener("click", () => {
  const name = document.getElementById("loginName").value.trim();
  if (!name) return alert("Please enter your name");
  userName = name;
  localStorage.setItem("ninaivunet_username", userName);
  showProjectPicker();
});

function signOut() {
  localStorage.removeItem("ninaivunet_username");
  location.reload();
}
document.getElementById("switchUserBtnTop")?.addEventListener("click", signOut);
document.getElementById("switchUserBtn")?.addEventListener("click", signOut);
document.getElementById("switchProjectBtn")?.addEventListener("click", showProjectPicker);

/* ---------------- Step 2: pick a project (role resolved by server) ---------------- */
async function showProjectPicker() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.add("hidden");
  pickerScreen.classList.remove("hidden");

  document.getElementById("pickerSubtitle").textContent = `Signed in as ${userName}`;

  const res = await fetch(`/api/users/${encodeURIComponent(userName)}/projects`);
  const data = await res.json();
  const listEl = document.getElementById("myProjectsList");

  if (!data.projects.length) {
    listEl.innerHTML = `<p class="hint">You're not a member of any project yet. Create one below.</p>`;
    return;
  }

  listEl.innerHTML = data.projects
    .map(
      (p) => `
      <div class="project-option" data-id="${p.project_id}" data-role="${p.role}" data-name="${escapeHtml(p.name)}" data-domain="${p.domain}">
        <span>${escapeHtml(p.name)}</span>
        <span class="role-pill">${roleLabel(p.domain, p.role)}</span>
      </div>`
    )
    .join("");

  listEl.querySelectorAll(".project-option").forEach((el) => {
    el.addEventListener("click", () => {
      currentProject = {
        project_id: el.dataset.id,
        name: el.dataset.name,
        domain: el.dataset.domain,
        role: el.dataset.role, // came from the server's project_members table, not chosen by the user
      };
      enterDashboard();
    });
  });
}

function roleLabel(domain, role) {
  const labels = {
    corporate: { lead: "Lead / Manager", member: "Member" },
    education: { lead: "Teacher / Principal", member: "Student" },
  };
  return labels[domain]?.[role] || role;
}

document.getElementById("createProjectBtn").addEventListener("click", async () => {
  const name = document.getElementById("newProjectName").value.trim();
  const domain = document.getElementById("newProjectDomain").value;
  if (!name) return;

  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, domain, creatorName: userName }),
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById("newProjectName").value = "";
    showProjectPicker(); // refresh list - creator is auto-added as lead
  } else {
    alert(data.error || "Failed to create project");
  }
});

/* ---------------- Step 3: dashboard for (userName, currentProject) ---------------- */
const meetingsList = document.getElementById("meetingsList");
const meetingDetail = document.getElementById("meetingDetail");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

document.getElementById("searchBtn").addEventListener("click", runSearch);
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
document.getElementById("ingestBtn").addEventListener("click", runIngest);
document.getElementById("addMemberBtn").addEventListener("click", runAddMember);

function enterDashboard() {
  pickerScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");

  document.getElementById("whoami").textContent =
    `${userName} - ${roleLabel(currentProject.domain, currentProject.role)} - ${currentProject.name}`;

  const isLead = currentProject.role === "lead";
  document.getElementById("ingestBox").classList.toggle("hidden", !isLead);
  document.getElementById("memberBox").classList.toggle("hidden", !isLead);

  loadMeetings();
}

async function loadMeetings() {
  const params = new URLSearchParams({ projectId: currentProject.project_id, userName });
  const res = await fetch(`/api/db/meetings?${params}`);

  if (res.status === 403) {
    meetingsList.innerHTML = `<p class="hint">Access denied - you're not a member of this project.</p>`;
    return;
  }

  const data = await res.json();

  if (!data.meetings.length) {
    meetingsList.innerHTML = `<p class="hint">No meetings ${currentProject.role === "member" ? "assigned to you " : ""}yet.</p>`;
    return;
  }

  meetingsList.innerHTML = data.meetings
    .map(
      (m) => `
      <div class="meeting-card" data-id="${m.meeting_id}">
        <div class="mid">${m.meeting_id}</div>
        <div class="mdate">${new Date(m.ingested_at).toLocaleString()}</div>
      </div>`
    )
    .join("");

  document.querySelectorAll(".meeting-card").forEach((card) => {
    card.addEventListener("click", () => loadMeetingDetail(card.dataset.id));
  });
}

async function loadMeetingDetail(meetingId) {
  const params = new URLSearchParams({ projectId: currentProject.project_id, userName });
  const res = await fetch(`/api/db/meetings/${encodeURIComponent(meetingId)}?${params}`);
  if (!res.ok) {
    meetingDetail.innerHTML = `<p class="hint">Could not load this meeting.</p>`;
    return;
  }
  const m = await res.json();

  const decisionsHtml = m.decisions.length
    ? m.decisions.map((d) => `<div class="task-item">${escapeHtml(d)}</div>`).join("")
    : `<p class="hint">No decisions recorded.</p>`;

  const tasksHtml = m.tasks.length
    ? m.tasks
        .map(
          (t) => `
        <div class="task-item">
          <span class="badge ${t.priority || "medium"}">${t.priority || "medium"}</span>
          ${escapeHtml(t.description)}
          <div class="hint">Owner: ${t.owner || "unassigned"} | Deadline: ${t.deadline || "none"} | Status: ${t.status}</div>
        </div>`
        )
        .join("")
    : `<p class="hint">${currentProject.role === "member" ? "No tasks assigned to you in this meeting." : "No action items extracted."}</p>`;

  const transcriptHtml = m.transcripts
    .map((t) => `<div class="transcript-line"><b>${escapeHtml(t.speaker)}:</b> ${escapeHtml(t.text)}</div>`)
    .join("");

  meetingDetail.innerHTML = `
    <div class="detail-block">
      <h3>Summary</h3>
      <p>${escapeHtml(m.summary || "(no summary)")}</p>
    </div>
    <div class="detail-block">
      <h3>Decisions</h3>
      ${decisionsHtml}
    </div>
    <div class="detail-block">
      <h3>${currentProject.role === "member" ? "Your action items" : "Action items"}</h3>
      ${tasksHtml}
    </div>
    <div class="detail-block">
      <h3>Transcript</h3>
      ${transcriptHtml || `<p class="hint">No transcript segments.</p>`}
    </div>
  `;
}

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) { searchResults.innerHTML = ""; return; }

  const params = new URLSearchParams({ q, projectId: currentProject.project_id, userName });
  const res = await fetch(`/api/db/search?${params}`);
  const data = await res.json();

  if (!data.results || !data.results.length) {
    searchResults.innerHTML = `<p class="hint">No matches found in this project's meetings.</p>`;
    return;
  }

  searchResults.innerHTML = data.results
    .map(
      (r) => `<div class="result-item"><b>${escapeHtml(r.speaker)}</b> (${escapeHtml(r.meeting_id)}): ${escapeHtml(r.text)}</div>`
    )
    .join("");
}

async function runIngest() {
  const meetingId = document.getElementById("ingestMeetingId").value.trim();
  if (!meetingId) return;

  const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: currentProject.project_id, requestedBy: userName }),
  });
  const data = await res.json();

  if (data.ok) {
    alert(`Ingested meeting "${meetingId}" into "${currentProject.name}".`);
    loadMeetings();
  } else {
    alert(`Failed: ${data.error}`);
  }
}

async function runAddMember() {
  const theirName = document.getElementById("newMemberName").value.trim();
  const role = document.getElementById("newMemberRole").value;
  if (!theirName) return;

  const res = await fetch(`/api/projects/${encodeURIComponent(currentProject.project_id)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName: theirName, role, requestedBy: userName }),
  });
  const data = await res.json();

  if (data.ok) {
    alert(`Added ${theirName} as ${roleLabel(currentProject.domain, role)} of "${currentProject.name}".`);
    document.getElementById("newMemberName").value = "";
  } else {
    alert(`Failed: ${data.error}`);
  }
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------------- Boot ---------------- */
if (userName) {
  showProjectPicker();
}