const elements = {
  authArea: document.querySelector("#authArea"),
  statusText: document.querySelector("#statusText"),
  analyticsApp: document.querySelector("#analyticsApp"),
  analyticsSummary: document.querySelector("#analyticsSummary"),
  analyticsGuildTable: document.querySelector("#analyticsGuildTable")
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatUptime(uptimeMs) {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function renderAuthUser(user) {
  elements.authArea.innerHTML = `
    <div class="auth-user auth-user-card">
      <img class="auth-avatar" src="${escapeHtml(user.avatarUrl || "")}" alt="${escapeHtml(
        user.username
      )}" />
      <div>
        <div class="panel-subtitle">Signed in as</div>
        <strong>${escapeHtml(user.username)}</strong>
      </div>
      <a class="ghost-button" href="./index.html">Builder</a>
    </div>
  `;
}

function renderAnalytics(analytics) {
  elements.analyticsSummary.innerHTML = `
    <div class="analytics-card">
      <img class="analytics-bot-avatar" src="${escapeHtml(analytics.bot.avatarUrl)}" alt="${escapeHtml(
        analytics.bot.username
      )}" />
      <div>
        <div class="panel-subtitle">Bot</div>
        <strong>${escapeHtml(analytics.bot.tag)}</strong>
      </div>
    </div>
    <div class="analytics-card">
      <div>
        <div class="panel-subtitle">Uptime</div>
        <strong>${formatUptime(analytics.bot.uptimeMs)}</strong>
      </div>
    </div>
    <div class="analytics-card">
      <div>
        <div class="panel-subtitle">Joined Guilds</div>
        <strong>${analytics.bot.guildCount}</strong>
      </div>
    </div>
    <div class="analytics-card">
      <div>
        <div class="panel-subtitle">Accessible Guilds</div>
        <strong>${analytics.totals.accessibleGuilds}</strong>
      </div>
    </div>
    <div class="analytics-card">
      <div>
        <div class="panel-subtitle">Total Members</div>
        <strong>${analytics.totals.memberCount}</strong>
      </div>
    </div>
  `;

  elements.analyticsGuildTable.innerHTML = `
    <div class="analytics-table-head">
      <span>Guild</span>
      <span>Members</span>
      <span>Channels</span>
      <span>Roles</span>
      <span>Owner ID</span>
    </div>
    ${analytics.guilds
      .map(
        (guild) => `
          <div class="analytics-table-row">
            <span>${escapeHtml(guild.name)}</span>
            <span>${guild.memberCount}</span>
            <span>${guild.channelCount}</span>
            <span>${guild.roleCount}</span>
            <span>${escapeHtml(guild.ownerId)}</span>
          </div>
        `
      )
      .join("")}
  `;
}

async function initialize() {
  try {
    const session = await request("/auth/session");
    renderAuthUser(session.user);
    const analytics = await request("/api/analytics");
    renderAnalytics(analytics);
    elements.analyticsApp.classList.remove("hidden");
    setStatus("Ready");
  } catch (error) {
    setStatus(error.message);
  }
}

initialize();
