const {
  buildEmbedPayload,
  buildButtonRows,
  buildOutgoingContent,
  fetchGuildChannels,
  fetchGuildResources,
  fetchBotAnalytics,
  sendHybridMessage
} = require("../services/discordService");
const {
  getGuildAccess,
  hasCapability
} = require("../services/permissionService");
const {
  incrementMessageSent,
  getGuildMetricsMap
} = require("../services/metricsService");
const { validateMessage } = require("../middlewares/validators");

function sanitizeText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .slice(0, maxLength)
    .trim();
}

function getGuilds({ client }) {
  return async (req, res) => {
    const guildAccess = req.session.guildAccess || [];

    if (client?.isReady && client.isReady()) {
      const refreshed = guildAccess.map((guild) => {
        const botPresent = client.guilds.cache.has(guild.id);
        return {
          ...guild,
          botPresent,
          available: botPresent
        };
      });
      req.session.guildAccess = refreshed;
      req.session.guilds = refreshed
        .filter((guild) => guild.botPresent)
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          permissions: guild.permissions
        }));
      return res.json(refreshed);
    }

    return res.json(guildAccess);
  };
}

function getChannels({ client }) {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      const access = getGuildAccess(req.session, guildId);

      if (!access || !access.botPresent || !hasCapability(access, "send_messages")) {
        return res.status(403).json({ error: "Unauthorized guild access." });
      }

      const channels = await fetchGuildChannels(client, guildId);
      return res.json(channels);
    } catch (error) {
      return next(error);
    }
  };
}

function getGuildResources({ client }) {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      const access = getGuildAccess(req.session, guildId);

      if (!access || !access.botPresent || !hasCapability(access, "send_messages")) {
        return res.status(403).json({ error: "Unauthorized guild access." });
      }

      const resources = await fetchGuildResources(client, guildId);
      return res.json(resources);
    } catch (error) {
      return next(error);
    }
  };
}

function getAnalytics({ client }) {
  return async (req, res, next) => {
    try {
      const accessibleGuilds = (req.session.guildAccess || [])
        .filter((guild) => guild.botPresent && hasCapability(guild, "view_analytics"))
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          permissions: guild.permissions
        }));
      const metricsMap = await getGuildMetricsMap(accessibleGuilds.map((guild) => guild.id));
      const analytics = await fetchBotAnalytics(client, accessibleGuilds, metricsMap);
      return res.json(analytics);
    } catch (error) {
      return next(error);
    }
  };
}

function sendMessage({ client }) {
  return async (req, res, next) => {
    try {
      if (!client?.isReady || !client.isReady()) {
        return res.status(503).json({ error: "Bot is currently offline. Please try again shortly." });
      }

      validateMessage(req.body);

      const access = getGuildAccess(req.session, req.body.guildId);

      if (!access || !access.botPresent || !hasCapability(access, "send_messages")) {
        return res.status(403).json({ error: "Unauthorized guild access." });
      }

      const messageType = req.body.messageType || "embed";
      const content = buildOutgoingContent({
        messageContent: sanitizeText(req.body.messageContent, 2000),
        mentions: req.body.mentions || []
      });

      // Build embed if needed
      let embed = null;
      if (messageType === "embed" || messageType === "hybrid") {
        embed = buildEmbedPayload(req.body.embedData || {});
      }

      // Build components based on message type
      let components = [];
      if (messageType === "embed" || messageType === "hybrid") {
        components = buildButtonRows(req.body.buttons || []);
      }

      const message = await sendHybridMessage(client, {
        channelId: req.body.channelId,
        guildId: req.body.guildId,
        content,
        embed,
        components,
        componentsV2: req.body.componentsV2 || [],
        messageType,
        reactions: req.body.reactions || []
      });

      await incrementMessageSent(req.body.guildId);

      return res.json({
        success: true,
        messageId: message.id
      });
    } catch (error) {
      return next(error);
    }
  };
}

function getBotStatus({ client }) {
  return async (_req, res) => {
    const ready = Boolean(client?.isReady && client.isReady());
    res.json({
      online: ready,
      status: ready ? "online" : "offline",
      uptimeMs: client?.uptime || 0,
      guildCount: client?.guilds?.cache?.size || 0
    });
  };
}

function validateMessagePayload(req, res, next) {
  try {
    validateMessage(req.body);
    return res.json({ valid: true });
  } catch (error) {
    return res.status(400).json({
      valid: false,
      error: error.message
    });
  }
}

module.exports = {
  getGuilds,
  getChannels,
  getGuildResources,
  getAnalytics,
  getBotStatus,
  sendMessage,
  validateMessagePayload
};
