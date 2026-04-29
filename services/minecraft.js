const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const WebSocket = require("ws");
const logger = require("../utils/logger");
const {
  getMinecraftConfig,
  getMentionText
} = require("./minecraftConfigService");

const EVENT_TEMPLATES = {
  online: {
    title: "🟢 Server is Online!",
    description: "Sky Realm SMP is now LIVE 🚀\n\nClick below to join now!",
    color: "#22c55e",
    footer: "Sky Realm SMP"
  },
  offline: {
    title: "🔴 Server Offline",
    description: "Server is currently offline.\nAuto-recovery system is attempting restart...",
    color: "#ef4444",
    footer: "Sky Realm SMP"
  },
  restart: {
    title: "🔁 Server Restarted",
    description: "Server has restarted successfully.\nYou can now join again!",
    color: "#f59e0b",
    footer: "Sky Realm SMP"
  }
};

class MinecraftMonitorService {
  constructor(client) {
    this.client = client;
    this.intervalMs = 20000;
    this.timer = null;
    this.isRunning = false;
    this.lastKnownOnline = null;
    this.lastCheckAt = null;
    this.lastTransitionAt = null;
    this.lastError = "";
    this.lastEvent = "";
    this.lastRestartAttemptAt = null;
    this.lastPlayersOnline = null;
    this.playerList = [];
    this.resourceHistory = [];
    this.maxHistory = 20;
    this.currentResources = { cpu: 0, memory: 0, disk: 0, state: "unknown" };
    this.bootstrapTimer = null;
    this.bootstrapChecksRemaining = 0;

    // Chat Bridge State
    this.ws = null;
    this.wsUrl = null;
    this.wsToken = null;
    this.reconnectTimer = null;
    this.lastBridgeChannelId = null;
  }

  async fetchResources() {
    const apiKey = String(process.env.PTERO_API_KEY || "").trim();
    const serverId = String(process.env.PTERO_SERVER_ID || "").trim();
    const panelBase = String(process.env.PTERO_PANEL_URL || "https://panel.wammuhost.com").trim();

    if (!apiKey || !serverId) return;

    try {
      const url = `${panelBase.replace(/\/+$/, "")}/api/client/servers/${serverId}/resources`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const resources = data.attributes.resources;
        this.currentResources = {
          cpu: resources.cpu_absolute,
          memory: resources.memory_bytes,
          disk: resources.disk_bytes,
          state: data.attributes.current_state
        };

        this.resourceHistory.push({
          timestamp: new Date(),
          cpu: resources.cpu_absolute,
          memory: resources.memory_bytes / (1024 * 1024)
        });

        if (this.resourceHistory.length > this.maxHistory) {
          this.resourceHistory.shift();
        }
      }
    } catch (error) {
      logger.warn(`Failed to fetch Minecraft resources: ${error.message}`);
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const config = await getMinecraftConfig();
    await this.checkStatus(config);
    await this.fetchResources().catch(() => {});

    if (config.chatBridgeEnabled) {
      this.initChatBridge(config).catch(err => logger.error("Chat bridge init failed:", err));
    }

    this.startBootstrapBurst();
    this.timer = setInterval(async () => {
      const currentConfig = await getMinecraftConfig();
      this.checkStatus(currentConfig).catch((error) => {
        this.lastError = error.message;
        logger.warn(`Minecraft monitor check failed: ${error.message}`);
      });
      this.fetchResources().catch(() => {});

      // Keep bridge in sync with config
      if (currentConfig.chatBridgeEnabled && !this.ws) {
        this.initChatBridge(currentConfig).catch(() => {});
      } else if (!currentConfig.chatBridgeEnabled && this.ws) {
        this.stopChatBridge();
      }
    }, this.intervalMs);

    logger.info("Minecraft monitoring service started");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.bootstrapTimer) {
      clearInterval(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }
    this.stopChatBridge();
    this.bootstrapChecksRemaining = 0;
    this.isRunning = false;
    logger.info("Minecraft monitoring service stopped");
  }

  async initChatBridge(config) {
    if (!config.chatBridgeEnabled || !config.chatBridgeChannelId) return;

    const apiKey = String(process.env.PTERO_API_KEY || "").trim();
    const serverId = String(process.env.PTERO_SERVER_ID || "").trim();
    const panelBase = String(process.env.PTERO_PANEL_URL || "https://panel.wammuhost.com").trim();

    if (!apiKey || !serverId) return;

    try {
      const url = `${panelBase.replace(/\/+$/, "")}/api/client/servers/${serverId}/websocket`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
      });

      if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
      const data = await response.json();

      this.wsUrl = data.data.socket;
      this.wsToken = data.data.token;
      this.lastBridgeChannelId = config.chatBridgeChannelId;

      this.connectWebSocket();
    } catch (err) {
      logger.error("Failed to get Pterodactyl WebSocket auth:", err);
      this.reconnectChatBridge();
    }
  }

  connectWebSocket() {
    if (this.ws) this.ws.close();

    this.ws = new WebSocket(this.wsUrl, { origin: String(process.env.PTERO_PANEL_URL || "") });

    this.ws.on("open", () => {
      this.ws.send(JSON.stringify({ event: "auth", args: [this.wsToken] }));
      logger.info("Minecraft Chat Bridge connected to Pterodactyl");
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === "console output") {
          this.handleConsoleOutput(msg.args[0]);
        }
      } catch (e) {}
    });

    this.ws.on("close", () => {
      this.ws = null;
      if (this.isRunning) this.reconnectChatBridge();
    });

    this.ws.on("error", (err) => {
      logger.warn("Chat bridge WebSocket error:", err.message);
    });
  }

  async handleConsoleOutput(line) {
    // Regex for standard Minecraft chat: [12:34:56] [Server thread/INFO]: <Player> Message
    const chatMatch = line.match(/\[Server thread\/INFO\]: <(.+?)> (.+)/);
    if (chatMatch && this.lastBridgeChannelId) {
      const playerName = chatMatch[1];
      const message = chatMatch[2];

      const channel = await this.client.channels.fetch(this.lastBridgeChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send(`**${playerName}**: ${message}`).catch(() => {});
      }
    }
  }

  reconnectChatBridge() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      const config = await getMinecraftConfig();
      this.initChatBridge(config);
    }, 10000);
  }

  stopChatBridge() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async purgeBridgeChannel(channelId) {
    if (!channelId) return;
    try {
      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (channel?.isTextBased()) {
        logger.info(`Purging bridge channel ${channelId} (server is empty)`);

        let deleted;
        do {
          deleted = await channel.bulkDelete(100, true).catch(() => new Map());
        } while (deleted?.size > 0);

        // Handle older messages manually if bulkDelete stops
        const remaining = await channel.messages.fetch({ limit: 50 }).catch(() => new Map());
        if (remaining.size > 0) {
          for (const msg of remaining.values()) {
            await msg.delete().catch(() => {});
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to purge bridge channel ${channelId}:`, err);
    }
  }

  startBootstrapBurst() {
    if (this.bootstrapTimer) {
      clearInterval(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }

    // Run a few short checks after startup to reduce first-alert delay.
    this.bootstrapChecksRemaining = 3;
    this.bootstrapTimer = setInterval(() => {
      if (this.bootstrapChecksRemaining <= 0) {
        clearInterval(this.bootstrapTimer);
        this.bootstrapTimer = null;
        return;
      }

      this.bootstrapChecksRemaining -= 1;
      this.checkStatus().catch((error) => {
        this.lastError = error.message;
        logger.warn(`Minecraft bootstrap check failed: ${error.message}`);
      });
    }, 5000);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      online: this.lastKnownOnline,
      lastCheckAt: this.lastCheckAt,
      lastTransitionAt: this.lastTransitionAt,
      lastError: this.lastError || "",
      lastEvent: this.lastEvent || "",
      lastRestartAttemptAt: this.lastRestartAttemptAt,
      playersOnline: this.lastPlayersOnline,
      playerList: this.playerList || [],
      currentResources: this.currentResources,
      resourceHistory: this.resourceHistory
    };
  }
async checkStatus(providedConfig = null) {
  const config = providedConfig || await getMinecraftConfig();
  if (!config.serverAddress) {
    this.lastError = "MC_SERVER_ADDRESS is not configured.";
    this.lastCheckAt = new Date();
    return this.getStatus();
  }

  const response = await this.fetchServerStatus(config.serverAddress);
  const online = Boolean(response?.online);
  const playersOnline = Number(response?.players?.online ?? 0);
  this.playerList = response?.players?.list || [];

  const previousOnline = this.lastKnownOnline;
  const previousPlayerCount = this.lastPlayersOnline;

  this.lastKnownOnline = online;
  this.lastPlayersOnline = Number.isFinite(playersOnline) ? playersOnline : null;
  this.lastCheckAt = new Date();
  this.lastError = "";

  // AUTO-CLEANUP LOGIC
  // Transition from >0 players to 0 players
  if (config.chatBridgeEnabled && config.chatBridgeChannelId) {
    if (previousPlayerCount > 0 && playersOnline === 0) {
      this.purgeBridgeChannel(config.chatBridgeChannelId);
    }
  }

  if (previousOnline === null) {
    return this.getStatus();
  }

  if (previousOnline !== online) {
...
      this.lastTransitionAt = new Date();
      if (online) {
        await this.sendAlert("restart", config);
      } else {
        await this.sendAlert("offline", config);
        await this.tryAutoRestart(config);
      }
    }

    return this.getStatus();
  }

  async sendTestAlert(type = "online") {
    const normalizedType = ["online", "offline", "restart"].includes(type) ? type : "online";
    const config = await getMinecraftConfig();
    return this.sendAlert(normalizedType, config, { force: true });
  }

  async fetchServerStatus(serverAddress) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(serverAddress)}`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`mcstatus request failed (${response.status})`);
      }
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendAlert(eventType, config, { force = false } = {}) {
    if (!force && config.alertsEnabled === false) return false;
    if (!this.client?.isReady || !this.client.isReady()) return false;
    if (!config.channelId) return false;

    // Use custom templates if available, otherwise fallback to hardcoded
    const customTemplate = config.templates?.[eventType];
    const template = customTemplate && customTemplate.title 
      ? customTemplate 
      : (EVENT_TEMPLATES[eventType] || EVENT_TEMPLATES.online);

    const imageUrl = config.gifs?.[eventType] || "";
    const mention = getMentionText(config);

    const embed = new EmbedBuilder()
      .setTitle(template.title)
      .setDescription(template.description)
      .setColor(template.color)
      .setFooter({ text: template.footer })
      .setTimestamp(new Date());

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Join Now")
        .setURL(config.joinUrl || "https://skyrealm.fun")
    );

    const channel = await this.client.channels.fetch(config.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      this.lastError = "Minecraft alert channel is invalid or inaccessible.";
      return false;
    }

    await channel.send({
      content: mention || undefined,
      embeds: [embed],
      components: [row]
    });

    this.lastEvent = eventType;
    return true;
  }

  async tryAutoRestart(config) {
    if (!config.autoRestartEnabled) return;

    const now = Date.now();
    const cooldownMs = Number(config.restartCooldownMs || 120000);
    const lastAttempt = this.lastRestartAttemptAt ? new Date(this.lastRestartAttemptAt).getTime() : 0;
    if (lastAttempt && now - lastAttempt < cooldownMs) {
      return;
    }

    const apiKey = String(process.env.PTERO_API_KEY || "").trim();
    const serverId = String(process.env.PTERO_SERVER_ID || "").trim();
    const panelBase = String(process.env.PTERO_PANEL_URL || "https://panel.wammuhost.com").trim();

    if (!apiKey || !serverId) {
      logger.warn("Auto-restart skipped: PTERO_API_KEY or PTERO_SERVER_ID missing.");
      return;
    }

    const url = `${panelBase.replace(/\/+$/, "")}/api/client/servers/${serverId}/power`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ signal: "restart" })
    });

    if (!response.ok) {
      throw new Error(`Auto-restart failed (${response.status})`);
    }

    this.lastRestartAttemptAt = new Date();
    logger.info("Minecraft auto-restart signal sent successfully");
  }
}

module.exports = MinecraftMonitorService;
