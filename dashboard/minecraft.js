const state = {
  guilds: [],
  config: null,
  charts: {
    cpu: null,
    ram: null
  }
};

const elements = {
  topbarBotAvatar: document.querySelector("#topbarBotAvatar"),
  topbarBotTitle: document.querySelector("#topbarBotTitle"),
  guildId: document.querySelector("#guildId"),
  channelId: document.querySelector("#channelId"),
  mentionType: document.querySelector("#mentionType"),
  mentionRoleId: document.querySelector("#mentionRoleId"),
  roleField: document.querySelector("#roleField"),
  onlineGif: document.querySelector("#onlineGif"),
  offlineGif: document.querySelector("#offlineGif"),
  restartGif: document.querySelector("#restartGif"),
  onlineTitle: document.querySelector("#onlineTitle"),
  onlineDesc: document.querySelector("#onlineDesc"),
  offlineTitle: document.querySelector("#offlineTitle"),
  offlineDesc: document.querySelector("#offlineDesc"),
  restartTitle: document.querySelector("#restartTitle"),
  restartDesc: document.querySelector("#restartDesc"),
  serverAddress: document.querySelector("#serverAddress"),
  joinUrl: document.querySelector("#joinUrl"),
  restartCooldownMs: document.querySelector("#restartCooldownMs"),
  alertsEnabled: document.querySelector("#alertsEnabled"),
  autoRestartEnabled: document.querySelector("#autoRestartEnabled"),
  saveBtn: document.querySelector("#saveBtn"),
  testBtn: document.querySelector("#testBtn"),
  testType: document.querySelector("#testType"),
  actionMessage: document.querySelector("#actionMessage"),
  serverStatusDot: document.querySelector("#serverStatusDot"),
  serverStatusText: document.querySelector("#serverStatusText"),
  serverState: document.querySelector("#serverState"),
  lastCheckAt: document.querySelector("#lastCheckAt"),
  lastEvent: document.querySelector("#lastEvent"),
  playersOnline: document.querySelector("#playersOnline"),
  lastRestartAt: document.querySelector("#lastRestartAt"),
  statusError: document.querySelector("#statusError"),
  playerList: document.querySelector("#playerList"),
  playerListCard: document.querySelector("#playerListCard")
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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function setActionMessage(message, isError = false) {
  elements.actionMessage.textContent = message || "";
  elements.actionMessage.style.color = isError ? "#ef4444" : "var(--text-secondary)";
}

function updateMentionFieldVisibility() {
  const isRole = elements.mentionType.value === "role";
  elements.roleField.classList.toggle("hidden", !isRole);
}

function renderGuilds() {
  elements.guildId.innerHTML = '<option value="">Select guild...</option>' + state.guilds
    .map((guild) => `<option value="${guild.id}">${guild.name}</option>`)
    .join("");
}

function renderChannels(guildId, selectedChannelId = "") {
  const guild = state.guilds.find((entry) => entry.id === guildId);
  const channels = guild?.channels || [];
  elements.channelId.innerHTML = '<option value="">Select channel...</option>' + channels
    .map((channel) => `<option value="${channel.id}" ${channel.id === selectedChannelId ? "selected" : ""}># ${channel.name}</option>`)
    .join("");
}

function applyConfig(config) {
  state.config = config;
  elements.serverAddress.value = config.serverAddress || "";
  elements.guildId.value = config.guildId || "";
  elements.mentionType.value = config.mentionType || "everyone";
  elements.mentionRoleId.value = config.mentionRoleId || "";
  elements.channelId.value = config.channelId || "";
  elements.onlineGif.value = config.gifs?.online || "";
  elements.offlineGif.value = config.gifs?.offline || "";
  elements.restartGif.value = config.gifs?.restart || "";

  elements.onlineTitle.value = config.templates?.online?.title || "";
  elements.onlineDesc.value = config.templates?.online?.description || "";
  elements.offlineTitle.value = config.templates?.offline?.title || "";
  elements.offlineDesc.value = config.templates?.offline?.description || "";
  elements.restartTitle.value = config.templates?.restart?.title || "";
  elements.restartDesc.value = config.templates?.restart?.description || "";

  elements.joinUrl.value = config.joinUrl || "https://skyrealm.fun";
  elements.restartCooldownMs.value = Number(config.restartCooldownMs || 120000);
  elements.alertsEnabled.checked = config.alertsEnabled !== false;
  elements.autoRestartEnabled.checked = config.autoRestartEnabled !== false;
  updateMentionFieldVisibility();
}

function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "rgba(255, 255, 255, 0.5)", font: { size: 10 } }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "start",
        labels: { color: "white", boxWidth: 10, font: { size: 11 } }
      }
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 0 }
    }
  };

  state.charts.cpu = new Chart(document.getElementById("cpuChart"), {
    type: "line",
    data: {
      labels: Array(20).fill(""),
      datasets: [{
        label: "CPU Usage (%)",
        data: Array(20).fill(0),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true
      }]
    },
    options: chartOptions
  });

  state.charts.ram = new Chart(document.getElementById("ramChart"), {
    type: "line",
    data: {
      labels: Array(20).fill(""),
      datasets: [{
        label: "RAM Usage (MB)",
        data: Array(20).fill(0),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true
      }]
    },
    options: chartOptions
  });
}

function updateCharts(history = []) {
  if (!history.length) return;

  const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const cpuData = history.map(h => h.cpu);
  const ramData = history.map(h => h.memory);

  state.charts.cpu.data.labels = labels;
  state.charts.cpu.data.datasets[0].data = cpuData;
  state.charts.cpu.update("none");

  state.charts.ram.data.labels = labels;
  state.charts.ram.data.datasets[0].data = ramData;
  state.charts.ram.update("none");
}

function renderPlayerList(players = []) {
  if (!players || players.length === 0) {
    elements.playerListCard.style.display = "none";
    return;
  }

  elements.playerListCard.style.display = "block";
  elements.playerList.innerHTML = players.map(player => `
    <div class="player-item">
      <img class="player-avatar" src="https://mc-heads.net/avatar/${player}/48" alt="${player}" title="${player}">
      <span class="player-name">${player}</span>
    </div>
  `).join("");
}

function renderStatus(monitor = {}) {
  const online = monitor.online;
  elements.serverStatusDot.classList.remove("online", "offline");
  if (online === true) {
    elements.serverStatusDot.classList.add("online");
    elements.serverStatusText.textContent = "Online";
  } else if (online === false) {
    elements.serverStatusDot.classList.add("offline");
    elements.serverStatusText.textContent = "Offline";
  } else {
    elements.serverStatusText.textContent = "Unknown";
  }

  elements.serverState.textContent = monitor.currentResources?.state || "-";
  elements.lastCheckAt.textContent = formatDate(monitor.lastCheckAt);
  elements.lastEvent.textContent = monitor.lastEvent || "-";
  elements.playersOnline.textContent = monitor.playersOnline ?? "-";
  elements.lastRestartAt.textContent = formatDate(monitor.lastRestartAttemptAt);
  elements.statusError.textContent = monitor.lastError || "";

  renderPlayerList(monitor.playerList);
  updateCharts(monitor.resourceHistory);
}

function collectPayload() {
  return {
    serverAddress: elements.serverAddress.value.trim(),
    guildId: elements.guildId.value,
    channelId: elements.channelId.value,
    mentionType: elements.mentionType.value,
    mentionRoleId: elements.mentionRoleId.value.trim(),
    gifs: {
      online: elements.onlineGif.value.trim(),
      offline: elements.offlineGif.value.trim(),
      restart: elements.restartGif.value.trim()
    },
    templates: {
      online: {
        title: elements.onlineTitle.value.trim(),
        description: elements.onlineDesc.value.trim()
      },
      offline: {
        title: elements.offlineTitle.value.trim(),
        description: elements.offlineDesc.value.trim()
      },
      restart: {
        title: elements.restartTitle.value.trim(),
        description: elements.restartDesc.value.trim()
      }
    },
    joinUrl: elements.joinUrl.value.trim(),
    restartCooldownMs: Number(elements.restartCooldownMs.value || 120000),
    alertsEnabled: elements.alertsEnabled.checked,
    autoRestartEnabled: elements.autoRestartEnabled.checked
  };
}

async function loadGuildsWithChannels() {
  const guilds = await request("/api/guilds");
  const manageable = guilds.filter((g) => g.botPresent && (g.capabilities?.manage_settings || g.capabilities?.full_access));

  state.guilds = await Promise.all(
    manageable.map(async (guild) => {
      const channels = await request(`/api/channels/${guild.id}`).catch(() => []);
      return { ...guild, channels };
    })
  );
}

async function loadPage() {
  const session = await request("/auth/session");
  if (!session.authenticated) {
    window.location.href = "/";
    return;
  }
  if (!session.user?.accountCapabilities?.manage_settings && !session.user?.accountCapabilities?.full_access) {
    throw new Error("You do not have permission to manage Minecraft integration.");
  }

  const info = await request("/public/bot-info").catch(() => null);
  if (info?.avatarUrl) elements.topbarBotAvatar.src = info.avatarUrl;
  if (info?.username) elements.topbarBotTitle.textContent = `${info.username} Dashboard`;

  await loadGuildsWithChannels();
  renderGuilds();

  const statusPayload = await request("/api/minecraft/status");
  renderStatus(statusPayload.monitor);
  applyConfig(statusPayload.config);
  renderChannels(statusPayload.config.guildId, statusPayload.config.channelId);
}

async function refreshStatus() {
  const payload = await request("/api/minecraft/status");
  renderStatus(payload.monitor);
}

async function saveConfig() {
  setActionMessage("Saving...");
  const payload = collectPayload();
  await request("/api/minecraft/config", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  setActionMessage("Settings saved.");
}

async function sendTestAlert() {
  setActionMessage("Sending test alert...");
  await request("/api/minecraft/test-alert", {
    method: "POST",
    body: JSON.stringify({ type: elements.testType.value })
  });
  setActionMessage("Test alert sent.");
}

function bindEvents() {
  elements.mentionType.addEventListener("change", updateMentionFieldVisibility);
  elements.guildId.addEventListener("change", () => {
    renderChannels(elements.guildId.value, "");
  });
  elements.saveBtn.addEventListener("click", () => {
    saveConfig().catch((error) => setActionMessage(error.message, true));
  });
  elements.testBtn.addEventListener("click", () => {
    sendTestAlert().catch((error) => setActionMessage(error.message, true));
  });
}

async function initialize() {
  try {
    initCharts();
    bindEvents();
    await loadPage();
    setInterval(() => {
      refreshStatus().catch(() => {});
    }, 15000);
  } catch (error) {
    setActionMessage(error.message || "Failed to initialize Minecraft page", true);
  }
}

initialize();
