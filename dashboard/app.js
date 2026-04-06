// ============================================
// SKY BOT S2 - Hybrid Message Builder
// Modern SaaS UI
// ============================================

// State Management
const state = {
  session: null,
  guilds: [],
  channels: [],
  resources: { channels: [], roles: [], members: [] },
  templates: [],
  buttons: [],
  containers: [],
  messageType: "embed",
  previewMode: "discord",
  botAvatar: "https://cdn.discordapp.com/embed/avatars/0.png",
  botUsername: "SkyBot S2"
};

// DOM Elements
const elements = {
  loginPage: document.querySelector("#loginPage"),
  dashboardPage: document.querySelector("#dashboardPage"),
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
  logoutBtn: document.querySelector("#logoutBtn")
};

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
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
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
    .map((guild) => `<option value="${guild.id}">${escapeHtml(guild.name)}</option>`)
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
  if (!guildId) {
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
        <button class="template-chip" type="button" data-template-id="${template._id}">
          <span>${escapeHtml(template.name)}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${new Date(template.createdAt).toLocaleDateString()}</span>
        </button>
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
      description: "The SKY REALM server is now online. Join us!",
      color: "#00ff00",
      author: "SKY REALM",
      footer: "SKY BOT S2",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [
      { type: "link", style: "Link", label: "Join Server", url: "https://play.skyrealm.net", emoji: "🎮", customId: "" }
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
      author: "SKY REALM",
      footer: "SKY BOT S2",
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
      author: "SKY REALM",
      footer: "SKY BOT S2",
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
      description: "Join us for a special event on the SKY REALM server!\n\n🗓️ Date: TBD\n🕐 Time: TBD\n📍 Location: Main Hub\n\nPrizes and fun await!",
      color: "#5865f2",
      author: "SKY REALM Events",
      footer: "Don't miss out!",
      image: "",
      thumbnail: "",
      timestamp: true
    },
    buttons: [
      { type: "interaction", style: "Success", label: "I'm Interested", url: "", emoji: "🎉", customId: "event_interested" },
      { type: "link", style: "Primary", label: "Discord", url: "https://discord.gg/skyrealm", emoji: "💬", customId: "" }
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
  try {
    const guildId = elements.guildSelect.value;
    const channelId = elements.channelSelect.value;

    if (!guildId || !channelId) {
      alert("Please select a guild and channel");
      return;
    }

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
    console.log("Message sent:", response.messageId);
  } catch (error) {
    console.error("Send failed:", error.message);
  }
}

async function logout() {
  await request("/auth/logout", { method: "POST" });
  window.location.reload();
}

// ============================================
// Initialization
// ============================================

const debouncedPreview = debounce(renderPreview, 150);

async function initialize() {
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

  // Template list click handler
  if (elements.templatesList) {
    elements.templatesList.addEventListener("click", (event) => {
      const target = event.target.closest("[data-template-id]");
      if (!target) return;

      const template = state.templates.find((entry) => entry._id === target.dataset.templateId);
      if (template) {
        applyTemplate(template);
      }
    });
  }

  // Guild select change
  if (elements.guildSelect) {
    elements.guildSelect.addEventListener("change", () => {
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

    // Store bot info for preview
    if (session.bot) {
      state.botAvatar = session.bot.avatarUrl || state.botAvatar;
      state.botUsername = session.bot.username || state.botUsername;
    }

    // Update topbar user info
    if (elements.userAvatar) {
      elements.userAvatar.src = session.user.avatarUrl || "";
    }
    if (elements.username) {
      elements.username.textContent = session.user.username;
    }

    // Show dashboard, hide login
    if (elements.loginPage) elements.loginPage.classList.add("hidden");
    if (elements.dashboardPage) elements.dashboardPage.classList.remove("hidden");

    // Load data
    renderGuilds();
    await loadChannels();
    await loadGuildResources();
    await loadTemplates();
    renderMentions();
    renderPreview();

  } catch (error) {
    // User is not authenticated - show login page
    if (elements.loginPage) elements.loginPage.classList.remove("hidden");
    if (elements.dashboardPage) elements.dashboardPage.classList.add("hidden");
  }
}

// Start the application
initialize();