const state = {
  session: null,
  guilds: [],
  channels: [],
  templates: [],
  buttons: []
};

const elements = {
  authArea: document.querySelector("#authArea"),
  dashboardApp: document.querySelector("#dashboardApp"),
  guildSelect: document.querySelector("#guildSelect"),
  channelSelect: document.querySelector("#channelSelect"),
  channelSidebarGuildName: document.querySelector("#channelSidebarGuildName"),
  channelNav: document.querySelector("#channelNav"),
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
  buttonTemplate: document.querySelector("#buttonTemplate"),
  addButtonButton: document.querySelector("#addButtonButton"),
  saveTemplateButton: document.querySelector("#saveTemplateButton"),
  sendEmbedButton: document.querySelector("#sendEmbedButton"),
  templatesList: document.querySelector("#templatesList"),
  statusText: document.querySelector("#statusText"),
  logoutButton: document.querySelector("#logoutButton")
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

function setStatus(message) {
  elements.statusText.textContent = message;
}

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

function renderPreview() {
  const embed = readEmbedData();
  const timestamp = embed.timestamp ? new Date().toLocaleString() : "";
  const buttonHtml = state.buttons
    .filter((button) => button.label)
    .map(
      (button) =>
        `<span class="preview-button ${button.type === "link" ? "link" : ""}">${escapeHtml(
          button.label
        )}</span>`
    )
    .join("");

  elements.previewCard.innerHTML = `
    <div class="preview-embed" style="border-left-color: ${embed.color || "#5865f2"}">
      ${
        embed.author
          ? `<div class="preview-author">${escapeHtml(embed.author)}</div>`
          : ""
      }
      <div class="preview-meta">
        <div>
          ${
            embed.title
              ? `<div class="preview-title">${escapeHtml(embed.title)}</div>`
              : ""
          }
          ${
            embed.description
              ? `<div class="preview-description">${escapeHtml(embed.description)}</div>`
              : '<div class="preview-description">Your embed preview updates as you type.</div>'
          }
        </div>
        ${
          embed.thumbnail
            ? `<img class="preview-thumbnail" src="${embed.thumbnail}" alt="thumbnail" />`
            : ""
        }
      </div>
      ${
        embed.image
          ? `<img class="preview-media" src="${embed.image}" alt="embed image" />`
          : ""
      }
      ${buttonHtml ? `<div class="preview-buttons">${buttonHtml}</div>` : ""}
      ${
        embed.footer
          ? `<div class="preview-footer">${escapeHtml(embed.footer)}</div>`
          : ""
      }
      ${timestamp ? `<div class="preview-timestamp">${timestamp}</div>` : ""}
    </div>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderGuilds() {
  elements.guildSelect.innerHTML = state.guilds
    .map((guild) => `<option value="${guild.id}">${escapeHtml(guild.name)}</option>`)
    .join("");
}

function renderChannels(selectedChannelId = elements.channelSelect.value) {
  elements.channelSelect.innerHTML = state.channels
    .map((channel) => `<option value="${channel.id}"># ${escapeHtml(channel.name)}</option>`)
    .join("");

  if (state.channels.some((channel) => channel.id === selectedChannelId)) {
    elements.channelSelect.value = selectedChannelId;
  }

  const activeGuild = state.guilds.find((guild) => guild.id === elements.guildSelect.value);
  elements.channelSidebarGuildName.textContent = activeGuild
    ? activeGuild.name
    : "Select a guild";

  const activeChannelId = elements.channelSelect.value;
  elements.channelNav.innerHTML = state.channels
    .map(
      (channel) => `
        <button
          class="channel-item ${channel.id === activeChannelId ? "active" : ""}"
          type="button"
          data-channel-id="${channel.id}"
        >
          <span class="channel-hash">#</span>
          <span>${escapeHtml(channel.name)}</span>
        </button>
      `
    )
    .join("");
}

function renderTemplates() {
  elements.templatesList.innerHTML = state.templates
    .map(
      (template) => `
        <button class="template-chip" type="button" data-template-id="${template._id}">
          <span>${escapeHtml(template.name)}</span>
          <span class="panel-subtitle">${new Date(template.createdAt).toLocaleDateString()}</span>
        </button>
      `
    )
    .join("");
}

function syncButtonUi(block, index) {
  const button = state.buttons[index];
  const type = block.querySelector('[data-button-field="type"]');
  const urlField = block.querySelector('[data-role="url"]');
  const customIdField = block.querySelector('[data-role="customId"]');

  type.value = button.type;
  urlField.classList.toggle("hidden", button.type !== "link");
  customIdField.classList.toggle("hidden", button.type !== "interaction");
}

function renderButtons() {
  elements.buttonsContainer.innerHTML = "";

  state.buttons.forEach((button, index) => {
    const fragment = elements.buttonTemplate.content.cloneNode(true);
    const block = fragment.querySelector(".button-config");

    block.querySelectorAll("[data-button-field]").forEach((input) => {
      const field = input.dataset.buttonField;
      input.value = button[field] || "";
      input.addEventListener("input", () => {
        state.buttons[index][field] = input.value.trim();
        syncButtonUi(block, index);
        renderPreview();
      });
    });

    block.querySelector(".remove-button").addEventListener("click", () => {
      state.buttons.splice(index, 1);
      renderButtons();
      renderPreview();
    });

    elements.buttonsContainer.appendChild(fragment);
    syncButtonUi(elements.buttonsContainer.lastElementChild, index);
  });
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

async function loadTemplates() {
  state.templates = await request("/api/templates");
  renderTemplates();
}

function applyTemplate(template) {
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
  renderPreview();
}

async function initialize() {
  renderPreview();

  try {
    const session = await request("/auth/session");
    state.session = session;
    state.guilds = session.guilds || [];

    elements.authArea.innerHTML = `
      <div>
        <div class="panel-subtitle">Signed in as</div>
        <strong>${escapeHtml(session.user.username)}</strong>
      </div>
    `;
    elements.dashboardApp.classList.remove("hidden");

    renderGuilds();
    await loadChannels();
    await loadTemplates();
    setStatus("Ready");
  } catch (_error) {
    setStatus("Sign in required");
  }
}

elements.guildSelect.addEventListener("change", () => {
  setStatus("Loading channels");
  loadChannels()
    .then(() => setStatus("Ready"))
    .catch((error) => setStatus(error.message));
});

elements.channelSelect.addEventListener("change", () => {
  renderChannels(elements.channelSelect.value);
  setStatus("Channel selected");
});

elements.channelNav.addEventListener("click", (event) => {
  const target = event.target.closest("[data-channel-id]");
  if (!target) {
    return;
  }

  elements.channelSelect.value = target.dataset.channelId;
  renderChannels(target.dataset.channelId);
  setStatus(`Viewing #${target.textContent.trim().replace(/^#\s*/, "")}`);
});

[
  elements.title,
  elements.description,
  elements.color,
  elements.author,
  elements.footer,
  elements.image,
  elements.thumbnail,
  elements.timestamp
].forEach((input) => {
  input.addEventListener("input", renderPreview);
  input.addEventListener("change", renderPreview);
});

elements.addButtonButton.addEventListener("click", () => {
  state.buttons.push({ type: "link", label: "", url: "", customId: "" });
  renderButtons();
});

elements.saveTemplateButton.addEventListener("click", async () => {
  setStatus("Saving template");

  try {
    await request("/api/save-template", {
      method: "POST",
      body: JSON.stringify({
        name: elements.templateName.value.trim() || "Untitled template",
        embedData: readEmbedData(),
        buttons: state.buttons
      })
    });
    await loadTemplates();
    setStatus("Template saved");
  } catch (error) {
    setStatus(error.message);
  }
});

elements.sendEmbedButton.addEventListener("click", async () => {
  setStatus("Sending embed");

  try {
    const response = await request("/api/send-embed", {
      method: "POST",
      body: JSON.stringify({
        guildId: elements.guildSelect.value,
        channelId: elements.channelSelect.value,
        embedData: readEmbedData(),
        buttons: state.buttons
      })
    });
    setStatus(`Sent as ${response.messageId}`);
  } catch (error) {
    setStatus(error.message);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await request("/auth/logout", { method: "POST" });
  window.location.reload();
});

elements.templatesList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-template-id]");
  if (!target) {
    return;
  }

  const template = state.templates.find((entry) => entry._id === target.dataset.templateId);
  if (template) {
    applyTemplate(template);
    setStatus(`Loaded ${template.name}`);
  }
});

initialize();
