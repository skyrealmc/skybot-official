// ============================================
// SKY BOT S2 - Analytics Page
// Modern SaaS UI
// ============================================

const elements = {
  loadingState: document.querySelector("#loadingState"),
  errorState: document.querySelector("#errorState"),
  analyticsContent: document.querySelector("#analyticsContent"),
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  totalGuilds: document.querySelector("#totalGuilds"),
  totalMembers: document.querySelector("#totalMembers"),
  uptime: document.querySelector("#uptime"),
  botUsername: document.querySelector("#botUsername"),
  botId: document.querySelector("#botId"),
  accessibleGuilds: document.querySelector("#accessibleGuilds"),
  guildTableBody: document.querySelector("#guildTableBody")
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
  return String(value || "")
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function formatUptime(uptimeMs) {
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function showError(message) {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.remove('hidden');
  elements.errorState.textContent = message;
}

function showContent() {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.analyticsContent.classList.remove('hidden');
}

function renderAnalytics(analytics) {
  // Status
  elements.statusText.textContent = "Online";
  elements.statusDot.classList.remove('offline');

  // Stats
  elements.totalGuilds.textContent = analytics.bot.guildCount;
  elements.totalMembers.textContent = analytics.totals.memberCount.toLocaleString();
  elements.uptime.textContent = formatUptime(analytics.bot.uptimeMs);

  // Bot Info
  elements.botUsername.textContent = analytics.bot.username;
  elements.botId.textContent = analytics.bot.id;
  elements.accessibleGuilds.textContent = analytics.totals.accessibleGuilds;

  // Guild Table
  elements.guildTableBody.innerHTML = analytics.guilds
    .map(
      (guild) => `
        <tr>
          <td>
            <span class="guild-name">${escapeHtml(guild.name)}</span>
          </td>
          <td>${guild.memberCount.toLocaleString()}</td>
          <td>${guild.channelCount}</td>
          <td>${guild.roleCount}</td>
          <td><span class="guild-id">${escapeHtml(guild.ownerId)}</span></td>
        </tr>
      `
    )
    .join("");
}

async function initialize() {
  try {
    // Check authentication
    const session = await request("/auth/session");
    if (!session.authenticated) {
      window.location.href = "./index.html";
      return;
    }

    // Load analytics
    const analytics = await request("/api/analytics");
    renderAnalytics(analytics);
    showContent();
  } catch (error) {
    console.error("Analytics error:", error);
    showError(error.message || "Failed to load analytics");
  }
}

initialize();