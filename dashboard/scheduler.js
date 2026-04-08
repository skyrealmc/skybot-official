// ============================================
// Bot Dashboard - Message Scheduler
// ============================================

// State
const state = {
  session: null,
  guilds: [],
  guildById: {},
  selectedGuildAccess: null,
  accountCapabilities: {},
  channels: [],
  schedules: [],
  templates: [],
  currentScheduleId: null,
  scheduleType: "one_time",
  mentions: [],
  guildResources: null
};

// DOM Elements
const elements = {
  emptyState: document.querySelector("#emptyState"),
  scheduleForm: document.querySelector("#scheduleForm"),
  scheduleList: document.querySelector("#scheduleList"),
  statActive: document.querySelector("#statActive"),
  statTotal: document.querySelector("#statTotal"),
  newScheduleBtn: document.querySelector("#newScheduleBtn"),
  scheduleName: document.querySelector("#scheduleName"),
  scheduleGuild: document.querySelector("#scheduleGuild"),
  scheduleChannel: document.querySelector("#scheduleChannel"),
  scheduledAt: document.querySelector("#scheduledAt"),
  cronExpression: document.querySelector("#cronExpression"),
  timezone: document.querySelector("#timezone"),
  messageType: document.querySelector("#messageType"),
  useTemplate: document.querySelector("#useTemplate"),
  messageContent: document.querySelector("#messageContent"),
  embedTitle: document.querySelector("#embedTitle"),
  embedDescription: document.querySelector("#embedDescription"),
  embedColor: document.querySelector("#embedColor"),
  embedAuthor: document.querySelector("#embedAuthor"),
  embedFooter: document.querySelector("#embedFooter"),
  embedImage: document.querySelector("#embedImage"),
  embedTimestamp: document.querySelector("#embedTimestamp"),
  maxRetries: document.querySelector("#maxRetries"),
  scheduleId: document.querySelector("#scheduleId"),
  oneTimeFields: document.querySelector("#oneTimeFields"),
  recurringFields: document.querySelector("#recurringFields"),
  cancelBtn: document.querySelector("#cancelBtn"),
  saveScheduleBtn: document.querySelector("#saveScheduleBtn"),
  mentionType: document.querySelector("#mentionType"),
  mentionTarget: document.querySelector("#mentionTarget"),
  mentionTargetLabel: document.querySelector("#mentionTargetLabel"),
  addMentionBtn: document.querySelector("#addMentionBtn"),
  mentionsContainer: document.querySelector("#mentionsContainer"),
  topbarBotAvatar: document.querySelector("#topbarBotAvatar"),
  topbarBotTitle: document.querySelector("#topbarBotTitle"),
  schedulerAccessNotice: document.querySelector("#schedulerAccessNotice"),
  schedulerAccessText: document.querySelector("#schedulerAccessText"),
  schedulerInviteBtn: document.querySelector("#schedulerInviteBtn")
};

// Utility Functions
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

async function loadPublicBotInfo() {
  try {
    const info = await request("/public/bot-info");
    if (elements.topbarBotAvatar && info.avatarUrl) {
      elements.topbarBotAvatar.src = info.avatarUrl;
    }
    if (elements.topbarBotTitle) {
      const name = info.username || "Bot";
      elements.topbarBotTitle.textContent = `${name} Dashboard`;
    }
  } catch {
    // Ignore topbar branding failures
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, '&#039;');
}

function setSchedulerAccessNotice({ message, inviteUrl = "" } = {}) {
  if (!elements.schedulerAccessNotice || !elements.schedulerAccessText) return;
  if (!message) {
    elements.schedulerAccessNotice.classList.add("hidden");
    if (elements.schedulerInviteBtn) {
      elements.schedulerInviteBtn.classList.add("hidden");
      elements.schedulerInviteBtn.removeAttribute("href");
    }
    return;
  }

  elements.schedulerAccessNotice.classList.remove("hidden");
  elements.schedulerAccessText.textContent = message;
  if (elements.schedulerInviteBtn) {
    if (inviteUrl) {
      elements.schedulerInviteBtn.href = inviteUrl;
      elements.schedulerInviteBtn.classList.remove("hidden");
    } else {
      elements.schedulerInviteBtn.classList.add("hidden");
      elements.schedulerInviteBtn.removeAttribute("href");
    }
  }
}

function hasCapability(capability) {
  return Boolean(state.selectedGuildAccess?.capabilities?.full_access || state.selectedGuildAccess?.capabilities?.[capability]);
}

function applySchedulerRestrictions() {
  const selected = state.selectedGuildAccess;
  const canManage = Boolean(selected?.botPresent && hasCapability("manage_settings"));

  if (!selected) {
    setSchedulerAccessNotice({
      message: "No servers available for scheduling. Owner role is required for scheduler access."
    });
  } else if (!selected.botPresent) {
    setSchedulerAccessNotice({
      message: "Bot is not in this server. Invite the bot to schedule messages.",
      inviteUrl: selected.inviteUrl || ""
    });
  } else if (!canManage) {
    setSchedulerAccessNotice({
      message: "You do not have permission to manage schedules for this server."
    });
  } else {
    setSchedulerAccessNotice();
  }

  elements.saveScheduleBtn.disabled = !canManage;
  elements.newScheduleBtn.disabled = !canManage;
  elements.scheduleChannel.disabled = !canManage;
}

function formatDate(dateStr) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

// Toast Notifications
let toastContainer = null;

function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, type = "info") {
  initToastContainer();

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  toast.querySelector(".toast-close").addEventListener("click", () => removeToast(toast));
  toastContainer.appendChild(toast);

  setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
  toast.classList.add("hiding");
  setTimeout(() => toast.remove(), 300);
}

// Render Functions
function renderSchedules() {
  const activeCount = state.schedules.filter(s => s.status === "active").length;

  elements.statActive.textContent = activeCount;
  elements.statTotal.textContent = state.schedules.length;

  if (state.schedules.length === 0) {
    elements.emptyState.classList.remove("hidden");
    elements.scheduleForm.classList.add("hidden");
    elements.scheduleList.innerHTML = "";
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.scheduleForm.classList.remove("hidden");

  elements.scheduleList.innerHTML = state.schedules
    .sort((a, b) => new Date(a.nextRun || a.scheduledAt) - new Date(b.nextRun || b.scheduledAt))
    .map(schedule => `
      <div class="schedule-item ${state.currentScheduleId === schedule._id ? "active" : ""}" data-id="${schedule._id}">
        <div class="schedule-item-header">
          <span class="schedule-name" title="${escapeHtml(schedule.name)}">${escapeHtml(schedule.name)}</span>
          <span class="schedule-status ${schedule.status}">${schedule.status}</span>
        </div>
        <div class="schedule-next-run">
          Next: ${formatDate(schedule.nextRun || schedule.scheduledAt)}
        </div>
        <div class="schedule-actions">
          <button class="template-chip-action-btn" data-action="edit" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="template-chip-action-btn" data-action="toggle" title="${schedule.status === "active" ? "Pause" : "Resume"}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${schedule.status === "active"
                ? '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'
                : '<polygon points="5 3 19 12 5 21 5 3"></polygon>'
              }
            </svg>
          </button>
          <button class="template-chip-action-btn danger" data-action="delete" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `)
    .join("");
}

function renderGuilds() {
  elements.scheduleGuild.innerHTML = '<option value="">Select a server...</option>' + state.guilds
    .map(guild => {
      const suffix = guild.botPresent ? "" : " (Bot not added)";
      return `<option value="${guild.id}">${escapeHtml(guild.name)}${suffix}</option>`;
    })
    .join("");
}

function renderChannels(selectedChannelId = "") {
  elements.scheduleChannel.innerHTML = '<option value="">Select a channel...</option>' + state.channels
    .map(channel => `<option value="${channel.id}" ${channel.id === selectedChannelId ? "selected" : ""}># ${escapeHtml(channel.name)}</option>`)
    .join("");
}

function renderTemplates() {
  elements.useTemplate.innerHTML = '<option value="">None - Create new</option>' + state.templates
    .map(template => `<option value="${template._id}">${escapeHtml(template.name)}</option>`)
    .join("");
}

// Schedule Type Toggle
function initScheduleTypeToggle() {
  const toggleButtons = document.querySelectorAll(".toggle-option");

  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      state.scheduleType = type;

      toggleButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (type === "one_time") {
        elements.oneTimeFields.classList.remove("hidden");
        elements.recurringFields.classList.add("hidden");
      } else {
        elements.oneTimeFields.classList.add("hidden");
        elements.recurringFields.classList.remove("hidden");
      }
    });
  });
}

// Cron Presets
function initCronPresets() {
  const presetButtons = document.querySelectorAll(".cron-preset");

  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cron = btn.dataset.cron;
      elements.cronExpression.value = cron;

      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// Form Handling
function resetForm() {
  elements.scheduleForm.reset();
  elements.scheduleId.value = "";
  state.currentScheduleId = null;
  state.scheduleType = "one_time";
  state.mentions = [];

  // Reset toggle
  document.querySelectorAll(".toggle-option").forEach(b => b.classList.remove("active"));
  document.querySelector('.toggle-option[data-type="one_time"]').classList.add("active");

  elements.oneTimeFields.classList.remove("hidden");
  elements.recurringFields.classList.add("hidden");

  // Show form and hide empty state
  elements.emptyState.classList.add("hidden");
  elements.scheduleForm.classList.remove("hidden");

  // Reset mentions display
  renderMentions();

  // Set minimum datetime to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  elements.scheduledAt.min = now.toISOString().slice(0, 16);
}

function loadScheduleIntoForm(schedule) {
  state.currentScheduleId = schedule._id;
  elements.scheduleId.value = schedule._id;

  elements.scheduleName.value = schedule.name;
  elements.scheduleGuild.value = schedule.guildId;
  elements.scheduleChannel.value = schedule.channelId;
  elements.messageType.value = schedule.messageType;
  elements.maxRetries.value = schedule.maxRetries || 3;

  // Set schedule type
  state.scheduleType = schedule.scheduleType;
  document.querySelectorAll(".toggle-option").forEach(b => b.classList.remove("active"));
  document.querySelector(`.toggle-option[data-type="${schedule.scheduleType}"]`).classList.add("active");

  if (schedule.scheduleType === "one_time") {
    elements.oneTimeFields.classList.remove("hidden");
    elements.recurringFields.classList.add("hidden");
    const scheduledDate = new Date(schedule.scheduledAt);
    scheduledDate.setMinutes(scheduledDate.getMinutes() - scheduledDate.getTimezoneOffset());
    elements.scheduledAt.value = scheduledDate.toISOString().slice(0, 16);
  } else {
    elements.oneTimeFields.classList.add("hidden");
    elements.recurringFields.classList.remove("hidden");
    elements.cronExpression.value = schedule.cronExpression || "";
    elements.timezone.value = schedule.timezone || "UTC";
  }

  // Load payload
  const payload = schedule.payload || {};
  elements.messageContent.value = payload.messageContent || "";

  if (payload.embedData) {
    elements.embedTitle.value = payload.embedData.title || "";
    elements.embedDescription.value = payload.embedData.description || "";
    elements.embedColor.value = payload.embedData.color || "#5865f2";
    elements.embedAuthor.value = payload.embedData.author || "";
    elements.embedFooter.value = payload.embedData.footer || "";
    elements.embedImage.value = payload.embedData.image || "";
    elements.embedTimestamp.checked = payload.embedData.timestamp || false;
  }

  // Load mentions
  state.mentions = payload.mentions || [];
  renderMentions();
}

async function saveSchedule(e) {
  e.preventDefault();
  if (!state.selectedGuildAccess || !state.selectedGuildAccess.botPresent || !hasCapability("manage_settings")) {
    showToast("You do not have permission to manage schedules for this server", "error");
    return;
  }

  const guildId = elements.scheduleGuild.value;
  const channelId = elements.scheduleChannel.value;
  const name = elements.scheduleName.value.trim();

  if (!guildId || !channelId || !name) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  const scheduleData = {
    guildId,
    channelId,
    name,
    messageType: elements.messageType.value,
    scheduleType: state.scheduleType,
    maxRetries: parseInt(elements.maxRetries.value) || 3,
    payload: {
      messageContent: elements.messageContent.value.trim(),
      embedData: {
        title: elements.embedTitle.value.trim(),
        description: elements.embedDescription.value.trim(),
        color: elements.embedColor.value,
        author: elements.embedAuthor.value.trim(),
        footer: elements.embedFooter.value.trim(),
        image: elements.embedImage.value.trim(),
        timestamp: elements.embedTimestamp.checked
      },
      mentions: state.mentions
    }
  };

  if (state.scheduleType === "one_time") {
    scheduleData.scheduledAt = new Date(elements.scheduledAt.value).toISOString();
  } else {
    scheduleData.cronExpression = elements.cronExpression.value;
    scheduleData.timezone = elements.timezone.value;
    scheduleData.scheduledAt = new Date().toISOString();
  }

  try {
    if (state.currentScheduleId) {
      await request(`/api/schedules/${state.currentScheduleId}`, {
        method: "PUT",
        body: JSON.stringify(scheduleData)
      });
      showToast("Schedule updated successfully", "success");
    } else {
      await request("/api/schedules", {
        method: "POST",
        body: JSON.stringify(scheduleData)
      });
      showToast("Schedule created successfully", "success");
    }

    await loadSchedules();
    resetForm();
  } catch (error) {
    showToast(error.message || "Failed to save schedule", "error");
  }
}

async function loadSchedules() {
  try {
    state.schedules = await request("/api/schedules");
    renderSchedules();
  } catch (error) {
    showToast("Failed to load schedules", "error");
  }
}

async function loadGuilds() {
  try {
    const guilds = await request("/api/guilds");
    state.guilds = guilds.filter((guild) => guild.capabilities?.manage_settings || guild.capabilities?.full_access || !guild.botPresent);
    state.guildById = state.guilds.reduce((acc, guild) => {
      acc[guild.id] = guild;
      return acc;
    }, {});
    renderGuilds();
  } catch (error) {
    console.error("Failed to load guilds:", error);
  }
}

async function loadTemplates() {
  try {
    state.templates = await request("/api/templates");
    renderTemplates();
  } catch (error) {
    console.error("Failed to load templates:", error);
  }
}

async function loadChannels() {
  const guildId = elements.scheduleGuild.value;
  state.selectedGuildAccess = state.guildById[guildId] || null;
  applySchedulerRestrictions();
  if (!guildId) {
    state.channels = [];
    renderChannels();
    return;
  }

  if (!state.selectedGuildAccess?.botPresent || !hasCapability("manage_settings")) {
    state.channels = [];
    renderChannels();
    return;
  }

  try {
    state.channels = await request(`/api/channels/${guildId}`);
    renderChannels();
  } catch (error) {
    console.error("Failed to load channels:", error);
  }
}

// Mention Functions
function renderMentions() {
  if (!elements.mentionsContainer) return;

  if (state.mentions.length === 0) {
    elements.mentionsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No mentions added</span>';
    return;
  }

  elements.mentionsContainer.innerHTML = state.mentions.map((mention, index) => {
    let displayText = '';
    switch (mention.type) {
      case 'everyone':
        displayText = '@everyone';
        break;
      case 'here':
        displayText = '@here';
        break;
      case 'role':
        const role = state.guildResources?.roles?.find(r => r.id === mention.id);
        displayText = role ? `@${role.name}` : `@role-${mention.id}`;
        break;
      case 'channel':
        const channel = state.guildResources?.channels?.find(c => c.id === mention.id);
        displayText = channel ? `#${channel.name}` : `#channel-${mention.id}`;
        break;
      default:
        displayText = mention.type;
    }

    return `
      <span class="mention-chip">
        ${escapeHtml(displayText)}
        <button type="button" data-mention-index="${index}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </span>
    `;
  }).join('');

  // Add remove handlers
  elements.mentionsContainer.querySelectorAll('[data-mention-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.mentionIndex);
      state.mentions.splice(index, 1);
      renderMentions();
    });
  });
}

async function handleMentionTypeChange() {
  const type = elements.mentionType.value;
  const needsTarget = type === 'role' || type === 'channel';

  if (needsTarget) {
    elements.mentionTargetLabel.classList.remove('hidden');

    // Load guild resources if not loaded
    if (!state.guildResources && elements.scheduleGuild.value) {
      try {
        state.guildResources = await request(`/api/guild-resources/${elements.scheduleGuild.value}`);
      } catch (error) {
        console.error('Failed to load guild resources:', error);
      }
    }

    // Populate target dropdown
    let options = '<option value="">Select...</option>';
    if (type === 'role' && state.guildResources?.roles) {
      options += state.guildResources.roles.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    } else if (type === 'channel' && state.guildResources?.channels) {
      options += state.guildResources.channels.map(c => `<option value="${c.id}"># ${escapeHtml(c.name)}</option>`).join('');
    }
    elements.mentionTarget.innerHTML = options;
  } else {
    elements.mentionTargetLabel.classList.add('hidden');
  }
}

function addMention() {
  const type = elements.mentionType.value;

  // Check for duplicates (everyone/here can only be added once)
  if (type === 'everyone' && state.mentions.some(m => m.type === 'everyone')) {
    showToast('@everyone already added', 'error');
    return;
  }
  if (type === 'here' && state.mentions.some(m => m.type === 'here')) {
    showToast('@here already added', 'error');
    return;
  }

  let mention;
  if (type === 'everyone') {
    mention = { type: 'everyone' };
  } else if (type === 'here') {
    mention = { type: 'here' };
  } else if (type === 'role') {
    const roleId = elements.mentionTarget.value;
    if (!roleId) {
      showToast('Please select a role', 'error');
      return;
    }
    mention = { type: 'role', id: roleId };
  } else if (type === 'channel') {
    const channelId = elements.mentionTarget.value;
    if (!channelId) {
      showToast('Please select a channel', 'error');
      return;
    }
    mention = { type: 'channel', id: channelId };
  }

  state.mentions.push(mention);
  renderMentions();
  showToast('Mention added', 'success');
}

// Schedule Actions
async function handleScheduleAction(scheduleId, action) {
  try {
    switch (action) {
      case "edit":
        const schedule = state.schedules.find(s => s._id === scheduleId);
        if (schedule) {
          loadScheduleIntoForm(schedule);
        }
        break;

      case "toggle":
        const toggleSchedule = state.schedules.find(s => s._id === scheduleId);
        const newStatus = toggleSchedule.status === "active" ? "paused" : "active";
        await request(`/api/schedules/${scheduleId}/toggle`, {
          method: "POST",
          body: JSON.stringify({ status: newStatus })
        });
        showToast(`Schedule ${newStatus === "active" ? "resumed" : "paused"}`, "success");
        await loadSchedules();
        break;

      case "delete":
        if (!confirm("Are you sure you want to delete this schedule?")) return;
        await request(`/api/schedules/${scheduleId}`, { method: "DELETE" });
        showToast("Schedule deleted", "success");
        await loadSchedules();
        break;
    }
  } catch (error) {
    showToast(error.message || "Action failed", "error");
  }
}

// Initialize
async function initialize() {
  await loadPublicBotInfo();

  // Set minimum datetime
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  elements.scheduledAt.min = now.toISOString().slice(0, 16);

  // Initialize UI
  initScheduleTypeToggle();
  initCronPresets();

  // Event listeners
  elements.newScheduleBtn.addEventListener("click", resetForm);
  elements.cancelBtn.addEventListener("click", () => {
    resetForm();
    renderSchedules();
  });
  elements.scheduleForm.addEventListener("submit", saveSchedule);

  elements.scheduleGuild.addEventListener("change", () => {
    if (elements.scheduleGuild.value) {
      localStorage.setItem("skybot_scheduler_guild", elements.scheduleGuild.value);
    }
    loadChannels();
    // Reset guild resources when guild changes
    state.guildResources = null;
  });

  // Mention handlers
  if (elements.mentionType) {
    elements.mentionType.addEventListener("change", handleMentionTypeChange);
  }
  if (elements.addMentionBtn) {
    elements.addMentionBtn.addEventListener("click", addMention);
  }

  elements.scheduleList.addEventListener("click", (e) => {
    const item = e.target.closest(".schedule-item");
    if (!item) return;

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      e.stopPropagation();
      handleScheduleAction(item.dataset.id, actionBtn.dataset.action);
    } else {
      const schedule = state.schedules.find(s => s._id === item.dataset.id);
      if (schedule) {
        loadScheduleIntoForm(schedule);
      }
    }
  });

  // Check authentication and load data
  try {
    const session = await request("/auth/session");
    if (!session.authenticated) {
      window.location.href = "./index.html";
      return;
    }

    state.session = session;
    state.accountCapabilities = session.user?.accountCapabilities || {};

    if (!state.accountCapabilities.manage_settings && !state.accountCapabilities.full_access) {
      setSchedulerAccessNotice({
        message: "Scheduler access is restricted to owners."
      });
      elements.scheduleForm.classList.add("hidden");
      elements.emptyState.classList.remove("hidden");
      return;
    }

    await Promise.all([
      loadSchedules(),
      loadGuilds(),
      loadTemplates()
    ]);

    const defaultGuild =
      state.guilds.find((guild) => guild.id === localStorage.getItem("skybot_scheduler_guild")) ||
      state.guilds.find((guild) => guild.botPresent && (guild.capabilities?.manage_settings || guild.capabilities?.full_access)) ||
      state.guilds[0];
    if (defaultGuild) {
      elements.scheduleGuild.value = defaultGuild.id;
      state.selectedGuildAccess = defaultGuild;
      applySchedulerRestrictions();
      await loadChannels();
    } else {
      setSchedulerAccessNotice({
        message: "No servers available for scheduling. You need owner permissions in a server."
      });
    }

  } catch (error) {
    window.location.href = "./index.html";
  }
}

initialize();
