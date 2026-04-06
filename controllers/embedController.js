const {
  assertGuildAccess,
  buildEmbedPayload,
  buildButtonRows,
  buildOutgoingContent,
  fetchGuildChannels,
  fetchGuildResources,
  fetchBotAnalytics,
  sendHybridMessage
} = require("../services/discordService");
const { validateMessage } = require("../middlewares/validators");
const { filterAllowedGuilds } = require("../middlewares/requireRole");

function getGuilds(req, res) {
  // Filter guilds by permission and then by allowed guilds
  const userAllowedGuilds = req.session.user?.allowedGuilds || [];
  const guilds = req.session.guilds || [];
  const filteredGuilds = filterAllowedGuilds(guilds, userAllowedGuilds);
  res.json(filteredGuilds);
}

function getChannels({ client }) {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      const guilds = req.session.guilds || [];
      const guild = guilds.find((entry) => entry.id === guildId);

      if (!guild || !assertGuildAccess(guild)) {
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
      const guilds = req.session.guilds || [];
      const guild = guilds.find((entry) => entry.id === guildId);

      if (!guild || !assertGuildAccess(guild)) {
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
      const analytics = await fetchBotAnalytics(client, req.session.guilds || []);
      return res.json(analytics);
    } catch (error) {
      return next(error);
    }
  };
}

function sendMessage({ client }) {
  return async (req, res, next) => {
    try {
      validateMessage(req.body);

      const guilds = req.session.guilds || [];
      const guild = guilds.find((entry) => entry.id === req.body.guildId);

      if (!guild || !assertGuildAccess(guild)) {
        return res.status(403).json({ error: "Unauthorized guild access." });
      }

      const messageType = req.body.messageType || "embed";
      const content = buildOutgoingContent({
        messageContent: req.body.messageContent,
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
        content,
        embed,
        components,
        componentsV2: req.body.componentsV2 || [],
        messageType,
        reactions: req.body.reactions || []
      });

      return res.json({
        success: true,
        messageId: message.id
      });
    } catch (error) {
      return next(error);
    }
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
  sendMessage,
  validateMessagePayload
};
