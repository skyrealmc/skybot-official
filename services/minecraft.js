const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
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
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.checkStatus();
    this.timer = setInterval(() => {
      this.checkStatus().catch((error) => {
        this.lastError = error.message;
        logger.warn(`Minecraft monitor check failed: ${error.message}`);
      });
    }, this.intervalMs);

    logger.info("Minecraft monitoring service started");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info("Minecraft monitoring service stopped");
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
      playersOnline: this.lastPlayersOnline
    };
  }

  async checkStatus() {
    const config = await getMinecraftConfig();
    if (!config.serverAddress) {
      this.lastError = "MC_SERVER_ADDRESS is not configured.";
      this.lastCheckAt = new Date();
      return this.getStatus();
    }

    const response = await this.fetchServerStatus(config.serverAddress);
    const online = Boolean(response?.online);
    const playersOnline = Number(response?.players?.online ?? 0);

    const previous = this.lastKnownOnline;
    this.lastKnownOnline = online;
    this.lastPlayersOnline = Number.isFinite(playersOnline) ? playersOnline : null;
    this.lastCheckAt = new Date();
    this.lastError = "";

    if (previous === null) {
      return this.getStatus();
    }

    if (previous !== online) {
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

    const template = EVENT_TEMPLATES[eventType] || EVENT_TEMPLATES.online;
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
