// ============================================
// Bot Dashboard - Hybrid Message Builder
// Modern SaaS UI
// ============================================

// State Management
const state = {
  session: null,
  guilds: [],
  guildById: {},
  selectedGuildAccess: null,
  accountCapabilities: {},
  channels: [],
  resources: { channels: [], roles: [], members: [] },
  templates: [],
  buttons: [],
  containers: [],
  messageType: "embed",
  previewMode: "discord",
  botAvatar: "https://cdn.discordapp.com/embed/avatars/0.png",
  botUsername: "Bot",
  botOnline: null,
  botStatusInitialized: false
};

// DOM Elements
const elements = {
  loginPage: document.querySelector("#loginPage"),
  dashboardPage: document.querySelector("#dashboardPage"),
  loginBotAvatar: document.querySelector("#loginBotAvatar"),
  loginBotName: document.querySelector("#loginBotName"),
  loginBotTagline: document.querySelector("#loginBotTagline"),
  loginBotAbout: document.querySelector("#loginBotAbout"),
  loginBotGuilds: document.querySelector("#loginBotGuilds"),
  loginBotStatus: document.querySelector("#loginBotStatus"),
  loginPortalHint: document.querySelector("#loginPortalHint"),
  topbarBotAvatar: document.querySelector("#topbarBotAvatar"),
  topbarBotTitle: document.querySelector("#topbarBotTitle"),
  guildSelect: document.querySelector("#guildSelect"),
  channelSelect: document.querySelector("#channelSelect"),
  messageContent: document.querySelector("#messageContent"),
  templateName: document.querySelector("#templateName"),
  title: document.querySelector("#title"),
  description: document.querySelector("#description"),
  color: document.querySelector("#color"),
  author: document.querySelector("#author"),
  footer: document.querySelector("#footer"),
  image: document.querySelector("#image"),
  thumbnail: document.querySelector("#thumbnail"),
  timestamp: document.querySelector("#timestamp"),
  previewCard: document.querySelector("#previewCard"),
  buttonsContainer: document.querySelector("#buttonsContainer"),
  mentionsContainer: document.querySelector("#mentionsContainer"),
  containersContainer: document.querySelector("#containersContainer"),
  buttonTemplate: document.querySelector("#buttonTemplate"),
  mentionTemplate: document.querySelector("#mentionTemplate"),
  containerTemplate: document.querySelector("#containerTemplate"),
  containerItemTemplate: document.querySelector("#containerItemTemplate"),
  addButtonBtn: document.querySelector("#addButtonBtn"),
  addMentionBtn: document.querySelector("#addMentionBtn"),
  addContainerBtn: document.querySelector("#addContainerBtn"),
  saveTemplateBtn: document.querySelector("#saveTemplateBtn"),
  sendMessageBtn: document.querySelector("#sendMessageBtn"),
  templatesList: document.querySelector("#templatesList"),
  reactionsInput: document.querySelector("#reactionsInput"),
  messageType: document.querySelector("#messageType"),
  userAvatar: document.querySelector("#userAvatar"),
  username: document.querySelector("#username"),
  logoutBtn: document.querySelector("#logoutBtn"),
  importTemplateBtn: document.querySelector("#importTemplateBtn"),
  importFileInput: document.querySelector("#importFileInput"),
  accessNotice: document.querySelector("#accessNotice"),
  accessNoticeText: document.querySelector("#accessNoticeText"),
  inviteBotBtn: document.querySelector("#inviteBotBtn"),
  analyticsLink: document.querySelector("#analyticsLink"),
  schedulerLink: document.querySelector("#schedulerLink"),
  botStatusAvatar: document.querySelector("#botStatusAvatar"),
  botStatusDot: document.querySelector("#botStatusDot"),
  botStatusBadge: document.querySelector("#botStatusBadge")
};

// Toast notification container
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

  // Auto remove after 5 seconds
  setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
  toast.classList.add("hiding");
  setTimeout(() => toast.remove(), 300);
}

// ============================================
// Utility Functions
// ============================================

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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, '&#039;');
}

function hasCapability(capability) {
  return Boolean(state.selectedGuildAccess?.capabilities?.full_access || state.selectedGuildAccess?.capabilities?.[capability]);
}

function hasAccountCapability(capability) {
  return Boolean(state.accountCapabilities?.full_access || state.accountCapabilities?.[capability]);
}

function setAccessNotice({ message, inviteUrl = "", type = "info" } = {}) {
  if (!elements.accessNotice || !elements.accessNoticeText) return;
  if (!message) {
    elements.accessNotice.classList.add("hidden");
    if (elements.inviteBotBtn) {
      elements.inviteBotBtn.classList.add("hidden");
      elements.inviteBotBtn.removeAttribute("href");
    }
    return;
  }

  elements.accessNotice.classList.remove("hidden");
  elements.accessNoticeText.textContent = message;
  elements.accessNotice.style.borderColor = type === "error" ? "rgba(239,68,68,0.35)" : "var(--border)";

  if (elements.inviteBotBtn) {
    if (inviteUrl) {
      elements.inviteBotBtn.href = inviteUrl;
      elements.inviteBotBtn.classList.remove("hidden");
    } else {
      elements.inviteBotBtn.classList.add("hidden");
      elements.inviteBotBtn.removeAttribute("href");
    }
  }
}

function applyAccountLevelRestrictions() {
  if (elements.analyticsLink) {
    elements.analyticsLink.classList.toggle("hidden", !hasAccountCapability("view_analytics"));
  }
  if (elements.schedulerLink) {
    elements.schedulerLink.classList.toggle("hidden", !hasAccountCapability("manage_settings"));
  }
}

function applyGuildRestrictions() {
  const selected = state.selectedGuildAccess;
  const botOffline = state.botStatusInitialized && state.botOnline === false;
  const canSend = Boolean(selected?.botPresent && hasCapability("send_messages") && !botOffline);
  const canManageTemplates = Boolean(selected?.botPresent && hasCapability("manage_templates") && !botOffline);

  if (!selected) {
    setAccessNotice({
      message: "No servers found or insufficient permissions. You need Manage Server or Administrator in at least one server.",
      type: "error"
    });
  } else if (!selected.botPresent) {
    setAccessNotice({
      message: "Bot is not in this server. Invite the bot to enable dashboard actions.",
      inviteUrl: selected.inviteUrl || "",
      type: "error"
    });
  } else if (!canSend) {
    setAccessNotice({
      message: botOffline
        ? "Bot is currently offline. Actions are temporarily disabled."
        : state.botOnline
        ? "You do not have permission to send messages in this dashboard for the selected server."
        : "You do not have permission to send messages in this dashboard for the selected server.",
      type: "error"
    });
  } else {
    setAccessNotice();
  }

  if (elements.sendMessageBtn) elements.sendMessageBtn.disabled = !canSend;
  if (elements.saveTemplateBtn) elements.saveTemplateBtn.disabled = !canManageTemplates;
  if (elements.channelSelect) elements.channelSelect.disabled = !canSend;
  if (elements.addButtonBtn) elements.addButtonBtn.disabled = !canSend;
  if (elements.addMentionBtn) elements.addMentionBtn.disabled = !canSend;
  if (elements.addContainerBtn) elements.addContainerBtn.disabled = !canSend;
}

async function loadPublicBotInfo() {
  try {
    const info = await request("/public/bot-info");
    const avatar = info.avatarUrl || state.botAvatar;
    const username = info.username || state.botUsername;

    state.botAvatar = avatar;
    state.botUsername = username;

    if (elements.loginBotAvatar) elements.loginBotAvatar.src = avatar;
    if (elements.topbarBotAvatar) elements.topbarBotAvatar.src = avatar;
    if (elements.loginBotName) elements.loginBotName.textContent = username;
    if (elements.topbarBotTitle) elements.topbarBotTitle.textContent = `${username} Dashboard`;
    if (elements.loginBotGuilds) elements.loginBotGuilds.textContent = String(info.guildCount || 0);
    if (elements.loginBotStatus) {
      elements.loginBotStatus.textContent = info.ready ? "Online" : "Offline";
      elements.loginBotStatus.style.color = info.ready ? "#22c55e" : "#ef4444";
    }
    if (elements.loginBotAbout) {
      elements.loginBotAbout.textContent = info.about
        ? info.about
        : "No bot description set. Add one in Discord Developer Portal > General Information > Description.";
    }
    if (elements.loginBotTagline) {
      elements.loginBotTagline.textContent = info.appTagline || "Manage your bot easily with messaging, templates, and scheduling.";
    }
    if (elements.loginPortalHint) {
      const needsSetup = !info.hasCustomAvatar || !info.about;
      elements.loginPortalHint.classList.toggle("hidden", !needsSetup);
      if (needsSetup) {
        elements.loginPortalHint.textContent =
          "No full bot profile detected. In Discord Developer Portal, set Bot Avatar and Application Description.";
      }
    }
  } catch {
    if (elements.loginBotStatus) {
      elements.loginBotStatus.textContent = "Unknown";
    }
    if (elements.loginBotAbout) {
      elements.loginBotAbout.textContent = "Unable to load bot profile details right now.";
    }
  }
}

async function refreshBotStatus() {
  try {
    const status = await request("/api/bot-status");
    state.botOnline = Boolean(status.online);
    state.botStatusInitialized = true;
    if (elements.botStatusDot) {
      elements.botStatusDot.style.background = status.online ? "#22c55e" : "#ef4444";
    }
    if (elements.botStatusBadge) {
      elements.botStatusBadge.title = status.online ? "Bot online" : "Bot offline";
    }
    if (elements.loginBotStatus) {
      elements.loginBotStatus.textContent = status.online ? "Online" : "Offline";
      elements.loginBotStatus.style.color = status.online ? "#22c55e" : "#ef4444";
    }
  } catch {
    state.botOnline = false;
    state.botStatusInitialized = true;
    if (elements.botStatusDot) {
      elements.botStatusDot.style.background = "#6b7280";
    }
    if (elements.botStatusBadge) {
      elements.botStatusBadge.title = "Bot status unknown";
    }
    if (elements.loginBotStatus) {
      elements.loginBotStatus.textContent = "Unknown";
      elements.loginBotStatus.style.color = "#6b7280";
    }
  } finally {
    applyGuildRestrictions();
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ============================================
// Tab Navigation
// ============================================

function initTabs() {
  const tabButtons = document.querySelectorAll(".toolbar-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${tabId}`).classList.add("active");
    });
  });
}

// ============================================
// Preview Toggle
// ============================================

function initPreviewToggle() {
  const toggleButtons = document.querySelectorAll(".toggle-btn");

  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;

      toggleButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      state.previewMode = view;
      renderPreview();
    });
  });
}

// ============================================
// Message Engine
// ============================================

function readEmbedData() {
  return {
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
    color: elements.color.value || "#5865f2",
    author: elements.author.value.trim(),
    footer: elements.footer.value.trim(),
    image: elements.image.value.trim(),
    thumbnail: elements.thumbnail.value.trim(),
    timestamp: elements.timestamp.checked
  };
}

function getSerializableMentions() {
  return Array.from(elements.mentionsContainer.querySelectorAll(".mention-config"))
    .map((block) => ({
      type: block.querySelector('[data-mention-field="type"]').value,
      id: block.querySelector('[data-mention-field="id"]').value
    }))
    .filter((mention) =>
      ["everyone", "here"].includes(mention.type) || Boolean(mention.id)
    );
}

function getSerializableReactions() {
  return elements.reactionsInput.value
    .split(/[\n,]+/)
    .map((reaction) => reaction.trim())
    .filter(Boolean);
}

function getSerializableButtons() {
  return state.buttons
    .map((button) => ({
      type: button.type || "link",
      style: button.style || "Primary",
      label: (button.label || "").trim(),
      url: (button.url || "").trim(),
      customId: (button.customId || "").trim(),
      emoji: button.emoji || ""
    }))
    .filter((button) => {
      const isCompletelyEmpty =
        !button.label && !button.url && !button.customId;
      return !isCompletelyEmpty;
    });
}

function getSerializableContainers() {
  return state.containers.map(container => ({
    type: "container",
    children: container.children.map(child => ({
      type: child.type,
      content: child.content || "",
      url: child.url || "",
      style: child.style || "",
      emoji: child.emoji || "",
      customId: child.customId || "",
      label: child.label || ""
    }))
  }));
}

function getMessagePayload() {
  return {
    messageType: state.messageType,
    messageContent: elements.messageContent.value.trim(),
    embedData: readEmbedData(),
    buttons: getSerializableButtons(),
    componentsV2: getSerializableContainers(),
    mentions: getSerializableMentions(),
    reactions: getSerializableReactions()
  };
}

// ============================================
// Preview System
// ============================================

function renderPreview() {
  const payload = getMessagePayload();

  if (state.previewMode === "builder") {
    renderBuilderPreview(payload);
  } else {
    renderDiscordPreview(payload);
  }
}

function renderBuilderPreview(payload) {
  let html = '<div class="preview-message">';
  html += '<div class="preview-message-header">';
  html += `<img class="preview-bot-avatar-img" src="${state.botAvatar}" alt="bot avatar" />`;
  html += '<div>';
  html += `<span class="preview-bot-name">${escapeHtml(state.botUsername)}</span>`;
  html += '<span class="preview-bot-tag">BOT</span>';
  html += '</div></div>';

  if (payload.messageContent) {
    html += `<div class="preview-content">${escapeHtml(payload.messageContent)}</div>`;
  }

  if (payload.messageType === "embed" || payload.messageType === "hybrid") {
    html += renderEmbedPreview(payload.embedData);
  }

  if (payload.messageType === "v2") {
    html += renderV2Preview(payload.componentsV2);
  }

  if ((payload.messageType === "embed" || payload.messageType === "hybrid") && payload.buttons.length > 0) {
    html += renderButtonsPreview(payload.buttons);
  }

  html += '</div>';
  elements.previewCard.innerHTML = html;
}

function renderDiscordPreview(payload) {
  let html = '<div class="preview-message">';
  html += '<div class="preview-message-header">';
  html += `<img class="preview-bot-avatar-img" src="${state.botAvatar}" alt="bot avatar" />`;
  html += '<div>';
  html += `<span class="preview-bot-name">${escapeHtml(state.botUsername)}</span>`;
  html += '<span class="preview-bot-tag">BOT</span>';
  html += '</div></div>';

  if (payload.messageContent) {
    html += `<div class="preview-content">${escapeHtml(payload.messageContent)}</div>`;
  }

  if (payload.messageType === "embed" || payload.messageType === "hybrid") {
    html += renderEmbedPreview(payload.embedData);
  }

  if (payload.messageType === "v2") {
    html += renderV2Preview(payload.componentsV2);
  }

  if ((payload.messageType === "embed" || payload.messageType === "hybrid") && payload.buttons.length > 0) {
    html += renderButtonsPreview(payload.buttons);
  }

  html += '</div>';
  elements.previewCard.innerHTML = html;
}

function renderEmbedPreview(embedData) {
  const embed = embedData;
  let html = '<div class="preview-embed" style="border-left-color: ' + (embed.color || "#5865f2") + '">';

  if (embed.author) {
    html += `<div class="preview-author">${escapeHtml(embed.author)}</div>`;
  }

  if (embed.title) {
    html += `<div class="preview-embed-title">${escapeHtml(embed.title)}</div>`;
  }

  if (embed.description) {
    html += `<div class="preview-embed-description">${escapeHtml(embed.description) || '<em>Your embed preview updates as you type.</em>'}</div>`;
  } else if (!embed.title) {
    html += '<div class="preview-embed-description"><em>Your embed preview updates as you type.</em></div>';
  }

  if (embed.thumbnail) {
    html += `<img class="preview-embed-thumbnail" src="${escapeHtml(embed.thumbnail)}" alt="thumbnail" />`;
  }

  if (embed.image) {
    html += `<img class="preview-embed-image" src="${escapeHtml(embed.image)}" alt="embed image" />`;
  }

  if (embed.footer || embed.timestamp) {
    html += '<div class="preview-embed-footer">';
    if (embed.footer) html += escapeHtml(embed.footer);
    if (embed.timestamp) html += ' • ' + new Date().toLocaleString();
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function renderButtonsPreview(buttons) {
  if (!buttons || buttons.length === 0) return "";

  let html = '<div class="preview-buttons">';
  buttons.filter(b => b.label).forEach(button => {
    const styleClass = button.type === "link" ? "link" : "";
    html += `<span class="preview-button ${styleClass}">${escapeHtml(button.emoji || "")} ${escapeHtml(button.label)}</span>`;
  });
  html += '</div>';
  return html;
}

function renderV2Preview(containers) {
  if (!containers || containers.length === 0) return "";

  let html = '';

  containers.forEach(container => {
    container.children.forEach(item => {
      switch (item.type) {
        case "text":
          if (item.content) {
            html += `<div class="preview-content">${escapeHtml(item.content)}</div>`;
          }
          break;
        case "separator":
          html += '<div style="border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0;"></div>';
          break;
        case "image":
        case "media":
          if (item.url) {
            html += `<img class="preview-embed-image" src="${escapeHtml(item.url)}" alt="media" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" />`;
          }
          break;
        case "button":
          if (item.label) {
            html += `<span class="preview-button">${escapeHtml(item.emoji || "")} ${escapeHtml(item.label)}</span>`;
          }
          break;
      }
    });
  });

  return html;
}

// ============================================
// Button Management
// ============================================

function renderButtons() {
  elements.buttonsContainer.innerHTML = "";

  state.buttons.forEach((button, index) => {
    const fragment = elements.buttonTemplate.content.cloneNode(true);
    const block = fragment.querySelector(".button-config");

    block.querySelectorAll("[data-button-field]").forEach((input) => {
      const field = input.dataset.buttonField;
      input.value = button[field] || "";
      input.addEventListener("input", () => {
        state.buttons[index][field] = input.value;
        syncButtonUi(block, index);
        renderPreview();
      });
    });

    block.querySelector(".btn-remove").addEventListener("click", () => {
      state.buttons.splice(index, 1);
      renderButtons();
      renderPreview();
    });

    elements.buttonsContainer.appendChild(fragment);
    syncButtonUi(block, index);
  });
}

function syncButtonUi(block, index) {
  const button = state.buttons[index];
  const type = block.querySelector('[data-button-field="type"]');
  const urlField = block.querySelector('[data-role="url"]');
  const customIdField = block.querySelector('[data-role="customId"]');

  const isLink = button.type === "link";
  urlField.classList.toggle("hidden", !isLink);
  customIdField.classList.toggle("hidden", isLink);
}

// ============================================
// Mention Management
// ============================================

function getMentionOptions(type) {
  if (type === "member") return state.resources.members;
  if (type === "role") return state.resources.roles;
  if (type === "channel") return state.resources.channels;
  return [];
}

function syncMentionUi(block, mention = {}) {
  const typeSelect = block.querySelector('[data-mention-field="type"]');
  const targetWrapper = block.querySelector('[data-role="target"]');
  const targetSelect = block.querySelector('[data-mention-field="id"]');
  const type = typeSelect.value;
  const requiresTarget = ["member", "role", "channel"].includes(type);

  targetWrapper.classList.toggle("hidden", !requiresTarget);

  if (!requiresTarget) {
    targetSelect.innerHTML = "";
    return;
  }

  const options = getMentionOptions(type);
  targetSelect.innerHTML = options
    .map((option) => `<option value="${option.id}">${escapeHtml(option.name)}</option>`)
    .join("");

  if (mention.id && options.some((option) => option.id === mention.id)) {
    targetSelect.value = mention.id;
  }
}

function renderMentions(mentions = getSerializableMentions()) {
  elements.mentionsContainer.innerHTML = "";

  mentions.forEach((mention) => {
    const fragment = elements.mentionTemplate.content.cloneNode(true);
    const block = fragment.querySelector(".mention-config");
    const typeSelect = block.querySelector('[data-mention-field="type"]');

    typeSelect.value = mention.type || "member";
    syncMentionUi(block, mention);

    typeSelect.addEventListener("change", () => {
      syncMentionUi(block);
      renderPreview();
    });

    const targetSelect = block.querySelector('[data-mention-field="id"]');
    targetSelect.addEventListener("change", renderPreview);

    block.querySelector(".btn-remove").addEventListener("click", () => {
      block.remove();
      renderPreview();
    });

    elements.mentionsContainer.appendChild(fragment);
  });
}

// ============================================
// Components V2 Management
// ============================================

function renderContainers() {
  elements.containersContainer.innerHTML = "";

  state.containers.forEach((container, containerIndex) => {
    const fragment = elements.containerTemplate.content.cloneNode(true);
    const containerBlock = fragment.querySelector(".container-config");
    const itemsContainer = containerBlock.querySelector(".container-items");

    containerBlock.querySelector(".container-title").textContent = `Container ${containerIndex + 1}`;

    containerBlock.querySelector(".add-item-btn").addEventListener("click", () => {
      container.children.push({ type: "text", content: "" });
      renderContainers();
      renderPreview();
    });

    containerBlock.querySelector(".remove-container-btn").addEventListener("click", () => {
      state.containers.splice(containerIndex, 1);
      renderContainers();
      renderPreview();
    });

    container.children.forEach((child, childIndex) => {
      const itemFragment = elements.containerItemTemplate.content.cloneNode(true);
      const itemBlock = itemFragment.querySelector(".container-item-config");
      const typeSelect = itemBlock.querySelector('[data-item-field="type"]');
      const fieldsContainer = itemBlock.querySelector(".item-fields");

      typeSelect.value = child.type;
      renderItemFields(fieldsContainer, child, containerIndex, childIndex);

      typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        state.containers[containerIndex].children[childIndex] = {
          type: newType,
          content: "",
          url: "",
          style: "",
          emoji: "",
          customId: "",
          label: ""
        };
        renderContainers();
        renderPreview();
      });

      itemBlock.querySelector(".remove-item-btn").addEventListener("click", () => {
        state.containers[containerIndex].children.splice(childIndex, 1);
        if (state.containers[containerIndex].children.length === 0) {
          state.containers.splice(containerIndex, 1);
        }
        renderContainers();
        renderPreview();
      });

      itemsContainer.appendChild(itemFragment);
    });

    elements.containersContainer.appendChild(containerBlock);
  });
}

function renderItemFields(container, child, containerIndex, childIndex) {
  let html = "";

  switch (child.type) {
    case "text":
      html = `<label><span>Content</span>
        <textarea data-item-field="content" rows="2" placeholder="Text content">${escapeHtml(child.content || "")}</textarea>
      </label>`;
      break;

    case "image":
    case "media":
      html = `<label><span>URL</span>
        <input data-item-field="url" type="url" placeholder="https://..." value="${escapeHtml(child.url || "")}" />
      </label>`;
      break;

    case "button":
      html = `
        <label><span>Label</span>
          <input data-item-field="label" type="text" placeholder="Button text" value="${escapeHtml(child.label || "")}" />
        </label>
        <label><span>Style</span>
          <select data-item-field="style">
            <option value="Primary" ${child.style === "Primary" ? "selected" : ""}>Primary</option>
            <option value="Secondary" ${child.style === "Secondary" ? "selected" : ""}>Secondary</option>
            <option value="Success" ${child.style === "Success" ? "selected" : ""}>Success</option>
            <option value="Danger" ${child.style === "Danger" ? "selected" : ""}>Danger</option>
            <option value="Link" ${child.style === "Link" ? "selected" : ""}>Link</option>
          </select>
        </label>
        <label><span>Emoji</span>
          <input data-item-field="emoji" type="text" placeholder="🔥" value="${escapeHtml(child.emoji || "")}" />
        </label>
        <label><span>Custom ID / URL</span>
          <input data-item-field="${child.style === "Link" ? "url" : "customId"}" type="text" placeholder="..." value="${escapeHtml(child.customId || child.url || "")}" />
        </label>
      `;
      break;

    case "separator":
      html = "<p style='color: var(--text-muted); font-size: 0.85rem;'>A visual separator line</p>";
      break;
  }

  container.innerHTML = html;

  container.querySelectorAll("[data-item-field]").forEach(input => {
    input.addEventListener("input", () => {
      const field = input.dataset.itemField;
      state.containers[containerIndex].children[childIndex][field] = input.value;
      renderPreview();
    });
  });
}

// ============================================
// Guild & Channel Management
// ============================================

function renderGuilds() {
  elements.guildSelect.innerHTML = '<option value="">Select a server...</option>' + state.guilds
    .map((guild) => {
      const suffix = guild.botPresent ? "" : " (Bot not added)";
      return `<option value="${guild.id}">${escapeHtml(guild.name)}${suffix}</option>`;
    })
    .join("");
}

function renderChannels(selectedChannelId = elements.channelSelect.value) {
  elements.channelSelect.innerHTML = '<option value="">Select a channel...</option>' + state.channels
    .map((channel) => `<option value="${channel.id}"># ${escapeHtml(channel.name)}</option>`)
    .join("");

  if (state.channels.some((channel) => channel.id === selectedChannelId)) {
    elements.channelSelect.value = selectedChannelId;
  }
}

async function loadChannels() {
  const guildId = elements.guildSelect.value;
  const selectedChannelId = elements.channelSelect.value;
  state.selectedGuildAccess = state.guildById[guildId] || null;
  applyGuildRestrictions();

  if (!guildId) {
    state.channels = [];
    renderChannels();
    return;
  }

  if (!state.selectedGuildAccess?.botPresent || !hasCapability("send_messages")) {
    state.channels = [];
    renderChannels();
    return;
  }

  state.channels = await request(`/api/channels/${guildId}`);
  const fallbackChannelId =
    selectedChannelId && state.channels.some((channel) => channel.id === selectedChannelId)
      ? selectedChannelId
      : state.channels[0]?.id || "";
  renderChannels(fallbackChannelId);
}

async function loadGuildResources() {
  const guildId = elements.guildSelect.value;
  if (!guildId) {
    state.resources = { channels: [], roles: [], members: [] };
    renderMentions();
    return;
  }

  if (!state.selectedGuildAccess?.botPresent || !hasCapability("send_messages")) {
    state.resources = { channels: [], roles: [], members: [] };
    renderMentions();
    return;
  }

  state.resources = await request(`/api/resources/${guildId}`);
  renderMentions(getSerializableMentions());
}

// ============================================
// Template Management
// ============================================

async function loadTemplates() {
  state.templates = await request("/api/templates");
  renderTemplates();
}

function renderTemplates() {
  elements.templatesList.innerHTML = state.templates
    .map(
      (template) => `
        <div class="template-chip" data-template-id="${template._id}">
          <div class="template-chip-info">
            <span class="template-chip-name">${escapeHtml(template.name)}</span>
            <span class="template-chip-date">${new Date(template.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="template-chip-actions">
            <button class="template-chip-action-btn" data-action="export" title="Export">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </button>
            <button class="template-chip-action-btn" data-action="duplicate" title="Duplicate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="template-chip-action-btn" data-action="rename" title="Rename">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
      `
    )
    .join("");
}

function applyTemplate(template) {
  state.messageType = template.messageType || "embed";
  elements.messageType.value = state.messageType;
  elements.messageContent.value = template.messageContent || "";

  const embed = template.embedData || {};
  elements.templateName.value = template.name || "";
  elements.title.value = embed.title || "";
  elements.description.value = embed.description || "";
  elements.color.value = embed.color || "#5865f2";
  elements.author.value = embed.author || "";
  elements.footer.value = embed.footer || "";
  elements.image.value = embed.image || "";
  elements.thumbnail.value = embed.thumbnail || "";
  elements.timestamp.checked = Boolean(embed.timestamp);

  state.buttons = template.buttons || [];
  renderButtons();

  state.containers = template.componentsV2 || [];
  renderContainers();

  renderMentions(template.mentions || []);
  elements.reactionsInput.value = (template.reactions || []).join(", ");

  renderPreview();
}

// ============================================
// Quick Templates
// ============================================

const QUICK_TEMPLATES = {
  "server-online": {
    name: "Server Online",
    messageType: "embed",
    messageContent: "",
    embedData: {
      title: "🟢 Server is Online!",
      description: "The server is now online. Join now!",
      color: "#00ff00",
      author: "Server Updates",
      footer: "Server Updates",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [
      { type: "link", style: "Link", label: "Open Server", url: "https://example.com", emoji: "🎮", customId: "" }
    ],
    componentsV2: [],
    mentions: [],
    reactions: ["✅"]
  },
  "server-offline": {
    name: "Server Offline",
    messageType: "embed",
    messageContent: "",
    embedData: {
      title: "🔴 Server Maintenance",
      description: "The server is currently offline for maintenance. We'll be back soon!",
      color: "#ff0000",
      author: "Server Updates",
      footer: "Server Updates",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [],
    componentsV2: [],
    mentions: [],
    reactions: ["⏳"]
  },
  "server-restart": {
    name: "Server Restart",
    messageType: "embed",
    messageContent: "",
    embedData: {
      title: "🔄 Server Restarting",
      description: "The server is restarting. Please wait a moment...",
      color: "#ffa500",
      author: "Server Updates",
      footer: "Server Updates",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [],
    componentsV2: [],
    mentions: [],
    reactions: ["🔄"]
  },
  "event-announce": {
    name: "Event Announcement",
    messageType: "hybrid",
    messageContent: "",
    embedData: {
      title: "📢 Upcoming Event!",
      description: "Join us for a special community event!\n\n🗓️ Date: TBD\n🕐 Time: TBD\n📍 Location: Announced in server\n\nPrizes and fun await!",
      color: "#5865f2",
      author: "Community Events",
      footer: "Don't miss out!",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [
      { type: "interaction", style: "Success", label: "I'm Interested", url: "", emoji: "🎉", customId: "event_interested" },
      { type: "link", style: "Primary", label: "Community", url: "https://discord.gg/", emoji: "💬", customId: "" }
    ],
    componentsV2: [],
    mentions: [{ type: "everyone", id: "" }],
    reactions: ["🎉", "📅"]
  }
};

function applyQuickTemplate(templateId) {
  const template = QUICK_TEMPLATES[templateId];
  if (template) {
    applyTemplate(template);
  }
}

// ============================================
// API Actions
// ============================================

async function saveTemplate() {
  if (!state.selectedGuildAccess || !state.selectedGuildAccess.botPresent || !hasCapability("manage_templates")) {
    showToast("Template management is not allowed for this server.", "error");
    return;
  }

  try {
    await request("/api/save-template", {
      method: "POST",
      body: JSON.stringify({
        name: elements.templateName.value.trim() || "Untitled template",
        messageType: state.messageType,
        messageContent: elements.messageContent.value.trim(),
        embedData: readEmbedData(),
        buttons: getSerializableButtons(),
        componentsV2: getSerializableContainers(),
        mentions: getSerializableMentions(),
        reactions: getSerializableReactions()
      })
    });
    await loadTemplates();
  } catch (error) {
    console.error("Save failed:", error.message);
  }
}

async function sendMessage() {
  if (!state.selectedGuildAccess || !state.selectedGuildAccess.botPresent || !hasCapability("send_messages")) {
    showToast("You do not have permission to send messages for this server.", "error");
    return;
  }

  const btn = elements.sendMessageBtn;
  const spinner = btn.querySelector(".btn-spinner");
  const icon = btn.querySelector(".btn-icon");
  const text = btn.querySelector(".btn-text");

  // Check if already sending
  if (btn.classList.contains("sending")) return;

  const guildId = elements.guildSelect.value;
  const channelId = elements.channelSelect.value;

  if (!guildId || !channelId) {
    showToast("Please select a guild and channel", "error");
    return;
  }

  // Set sending state
  btn.classList.add("sending");
  text.textContent = "Sending...";
  icon.style.display = "none";
  spinner.style.display = "inline-block";

  try {
    const response = await request("/api/send-message", {
      method: "POST",
      body: JSON.stringify({
        guildId,
        channelId,
        messageType: state.messageType,
        messageContent: elements.messageContent.value.trim(),
        embedData: readEmbedData(),
        buttons: getSerializableButtons(),
        componentsV2: getSerializableContainers(),
        mentions: getSerializableMentions(),
        reactions: getSerializableReactions()
      })
    });

    showToast("Message sent successfully!", "success");
  } catch (error) {
    showToast(error.message || "Failed to send message", "error");
  } finally {
    // Reset button state
    btn.classList.remove("sending");
    text.textContent = "Send";
    icon.style.display = "";
    spinner.style.display = "none";
  }
}

async function logout() {
  await request("/auth/logout", { method: "POST" });
  window.location.reload();
}

// ============================================
// Template Actions
// ============================================

async function handleTemplateAction(templateId, action) {
  if (!state.selectedGuildAccess || !state.selectedGuildAccess.botPresent || !hasCapability("manage_templates")) {
    showToast("Template management is not allowed for this server.", "error");
    return;
  }

  const template = state.templates.find(t => t._id === templateId);
  if (!template) return;

  try {
    switch (action) {
      case "export":
        await exportTemplate(templateId, template.name);
        break;
      case "duplicate":
        await duplicateTemplate(templateId);
        break;
      case "rename":
        await renameTemplate(templateId, template.name);
        break;
      case "delete":
        await deleteTemplate(templateId);
        break;
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function exportTemplate(templateId, templateName) {
  const response = await fetch(`/api/templates/${templateId}/export`, {
    credentials: "include"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to export template");
  }

  // Create download link
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${templateName.replace(/[^a-z0-9]/gi, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  showToast("Template exported successfully!", "success");
}

async function duplicateTemplate(templateId) {
  await request(`/api/templates/${templateId}/duplicate`, { method: "POST" });
  await loadTemplates();
  showToast("Template duplicated!", "success");
}

async function renameTemplate(templateId, currentName) {
  const newName = prompt("Enter new template name:", currentName);
  if (!newName || newName.trim() === currentName) return;

  await request(`/api/templates/${templateId}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName.trim() })
  });

  await loadTemplates();
  showToast("Template renamed!", "success");
}

async function deleteTemplate(templateId) {
  if (!confirm("Are you sure you want to delete this template?")) return;

  await request(`/api/templates/${templateId}`, { method: "DELETE" });
  await loadTemplates();
  showToast("Template deleted!", "success");
}

// ============================================
// Initialization
// ============================================

const debouncedPreview = debounce(renderPreview, 150);

async function initialize() {
  // Prevent login/dashboard flicker during async session check.
  if (elements.loginPage) elements.loginPage.classList.add("hidden");
  if (elements.dashboardPage) elements.dashboardPage.classList.add("hidden");

  await loadPublicBotInfo();

  // Initialize UI components
  initTabs();
  initPreviewToggle();

  // Initial preview
  renderPreview();

  // Set up event listeners for embed fields
  const embedFields = [
    elements.messageContent,
    elements.title,
    elements.description,
    elements.color,
    elements.author,
    elements.footer,
    elements.image,
    elements.thumbnail,
    elements.timestamp
  ];

  embedFields.forEach(input => {
    if (input) {
      input.addEventListener("input", debouncedPreview);
      input.addEventListener("change", debouncedPreview);
    }
  });

  // Message type change
  if (elements.messageType) {
    elements.messageType.addEventListener("change", (e) => {
      state.messageType = e.target.value;
      renderPreview();
    });
  }

  // Button management
  if (elements.addButtonBtn) {
    elements.addButtonBtn.addEventListener("click", () => {
      state.buttons.push({ type: "link", style: "Link", label: "", url: "", customId: "", emoji: "" });
      renderButtons();
      renderPreview();
    });
  }

  // Mention management
  if (elements.addMentionBtn) {
    elements.addMentionBtn.addEventListener("click", () => {
      renderMentions([...getSerializableMentions(), { type: "member", id: "" }]);
    });
  }

  // Container management
  if (elements.addContainerBtn) {
    elements.addContainerBtn.addEventListener("click", () => {
      state.containers.push({ children: [{ type: "text", content: "" }] });
      renderContainers();
      renderPreview();
    });
  }

  // Save template
  if (elements.saveTemplateBtn) {
    elements.saveTemplateBtn.addEventListener("click", saveTemplate);
  }

  // Send message
  if (elements.sendMessageBtn) {
    elements.sendMessageBtn.addEventListener("click", sendMessage);
  }

  // Logout
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", logout);
  }

  // Quick templates
  document.querySelectorAll(".quick-template-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      applyQuickTemplate(btn.dataset.template);
    });
  });

  // Template list click and action handler
  if (elements.templatesList) {
    elements.templatesList.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-template-id]");
      if (!chip) return;

      const templateId = chip.dataset.templateId;
      const actionBtn = event.target.closest("[data-action]");

      if (actionBtn) {
        // Handle action button click
        event.stopPropagation();
        const action = actionBtn.dataset.action;
        handleTemplateAction(templateId, action);
      } else {
        // Apply template on chip click
        const template = state.templates.find((entry) => entry._id === templateId);
        if (template) {
          applyTemplate(template);
          showToast(`Applied template: ${template.name}`, "success");
        }
      }
    });
  }

  // Import template button
  if (elements.importTemplateBtn) {
    elements.importTemplateBtn.addEventListener("click", () => {
      elements.importFileInput.click();
    });
  }

  if (elements.importFileInput) {
    elements.importFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        await request("/api/import-template", {
          method: "POST",
          body: JSON.stringify(data)
        });

        await loadTemplates();
        showToast("Template imported successfully!", "success");
      } catch (error) {
        showToast(error.message || "Failed to import template", "error");
      }

      // Reset file input
      e.target.value = "";
    });
  }

  // Guild select change
  if (elements.guildSelect) {
    elements.guildSelect.addEventListener("change", () => {
      if (elements.guildSelect.value) {
        localStorage.setItem("skybot_selected_guild", elements.guildSelect.value);
      }
      loadChannels().then(() => loadGuildResources()).catch(console.error);
    });
  }

  // Channel select change
  if (elements.channelSelect) {
    elements.channelSelect.addEventListener("change", () => {
      renderChannels(elements.channelSelect.value);
    });
  }

  // Try to load session
  try {
    const response = await fetch("/auth/session", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Not authenticated");
    }

    const session = await response.json();

    if (!session.authenticated) {
      throw new Error("Not authenticated");
    }

    // User is authenticated - show dashboard
    state.session = session;
    state.guilds = session.guilds || [];
    state.guildById = state.guilds.reduce((acc, guild) => {
      acc[guild.id] = guild;
      return acc;
    }, {});
    state.accountCapabilities = session.user?.accountCapabilities || {};

    // Store bot info for preview
    if (session.bot) {
      state.botAvatar = session.bot.avatarUrl || state.botAvatar;
      state.botUsername = session.bot.username || state.botUsername;
      if (elements.botStatusAvatar) {
        elements.botStatusAvatar.src = state.botAvatar;
      }
      if (elements.topbarBotAvatar) {
        elements.topbarBotAvatar.src = state.botAvatar;
      }
      if (elements.topbarBotTitle) {
        elements.topbarBotTitle.textContent = `${state.botUsername} Dashboard`;
      }
      if (elements.botStatusBadge) {
        elements.botStatusBadge.title = `${state.botUsername} status`;
      }
    }

    // Update topbar user info
    if (elements.userAvatar) {
      elements.userAvatar.src = session.user.avatarUrl || "";
    }
    if (elements.username) {
      elements.username.textContent = session.user.username;
    }

    applyAccountLevelRestrictions();

    // Show dashboard, hide login
    if (elements.loginPage) elements.loginPage.classList.add("hidden");
    if (elements.dashboardPage) elements.dashboardPage.classList.remove("hidden");

    // Load data
    renderGuilds();
    const preferredGuildId = localStorage.getItem("skybot_selected_guild");
    const defaultGuild =
      state.guilds.find((guild) => guild.id === preferredGuildId) ||
      state.guilds.find((guild) => guild.botPresent && guild.capabilities?.send_messages) ||
      state.guilds.find((guild) => guild.botPresent) ||
      state.guilds[0];
    if (defaultGuild && elements.guildSelect) {
      elements.guildSelect.value = defaultGuild.id;
      state.selectedGuildAccess = defaultGuild;
    }
    applyGuildRestrictions();
    await loadChannels();
    await loadGuildResources();
    if (hasAccountCapability("manage_templates")) {
      await loadTemplates();
    } else {
      state.templates = [];
      renderTemplates();
    }
    renderMentions();
    renderPreview();
    await refreshBotStatus();
    setInterval(refreshBotStatus, 30000);

  } catch (error) {
    // User is not authenticated - show login page
    if (elements.loginPage) elements.loginPage.classList.remove("hidden");
    if (elements.dashboardPage) elements.dashboardPage.classList.add("hidden");
  }
}

// Start the application
initialize();
