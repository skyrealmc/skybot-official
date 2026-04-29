const WebSocket = require("ws");
const axios = require("axios");
const logger = require("../utils/logger");
const { getMinecraftConfig } = require("./minecraftConfigService");

/**
 * Isolated Minecraft Chat Bridge Service
 * Move here from main monitor to prevent 403 spam until whitelisted.
 */
class MinecraftChatBridge {
  constructor(client) {
    this.client = client;
    this.ws = null;
    this.wsUrl = null;
    this.wsToken = null;
    this.reconnectTimer = null;
    this.lastBridgeChannelId = null;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    const config = await getMinecraftConfig();
    if (config.chatBridgeEnabled) {
      await this.initChatBridge(config);
    }
  }

  stop() {
    this.isRunning = false;
    this.stopChatBridge();
  }

  async initChatBridge(config) {
    if (!config.chatBridgeEnabled || !config.chatBridgeChannelId) return;

    const apiKey = String(process.env.PTERO_API_KEY || "").trim();
    const serverId = String(process.env.PTERO_SERVER_ID || "").trim();
    const panelBase = String(process.env.PTERO_PANEL_URL || "https://panel.wammuhost.com").trim();

    if (!apiKey || !serverId) return;

    try {
      const url = `${panelBase.replace(/\/+$/, "")}/api/client/servers/${serverId}/websocket`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: panelBase
        },
        timeout: 10000
      });

      const data = response.data;
      this.wsUrl = data.data.socket;
      this.wsToken = data.data.token;
      this.lastBridgeChannelId = config.chatBridgeChannelId;

      this.connectWebSocket();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      logger.error(`[ChatBridge] Auth failed: status ${status || "unknown"}: ${typeof data === "string" ? data.substring(0, 100) : "Check logs"}`);
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
      logger.warn("[ChatBridge] WebSocket error:", err.message);
    });
  }

  async handleConsoleOutput(line) {
    const chatMatch = line.match(/<(.+?)> (.+)/) || line.match(/\[Server thread\/INFO\]: <(.+?)> (.+)/);
    if (chatMatch && this.lastBridgeChannelId) {
      const playerName = chatMatch[1];
      const message = chatMatch[2];

      logger.info(`[ChatBridge] Detected message from ${playerName}: ${message}`);

      const channel = await this.client.channels.fetch(this.lastBridgeChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send(`**${playerName}**: ${message}`).catch(err => {
          logger.error(`[ChatBridge] Failed to send to Discord: ${err.message}`);
        });
      }
    }
  }

  reconnectChatBridge() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.isRunning) return;
    
    this.reconnectTimer = setTimeout(async () => {
      const config = await getMinecraftConfig();
      this.initChatBridge(config);
    }, 30000); // Slower reconnect for isolation
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
        logger.info(`[ChatBridge] Purging channel ${channelId}`);
        let deleted;
        do {
          deleted = await channel.bulkDelete(100, true).catch(() => new Map());
        } while (deleted?.size > 0);
      }
    } catch (err) {
      logger.error(`[ChatBridge] Purge failed:`, err);
    }
  }
}

module.exports = MinecraftChatBridge;
