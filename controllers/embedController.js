const {
  assertGuildAccess,
  buildEmbedPayload,
  buildButtonRows,
  buildOutgoingContent,
  fetchGuildChannels,
  fetchGuildResources,
  fetchBotAnalytics,
  sendEmbedMessage
} = require("../services/discordService");
const { validateEmbedRequest } = require("../middlewares/validators");

function getGuilds(req, res) {
  const guilds = (req.session.guilds || []).filter(assertGuildAccess);
  res.json(guilds);
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

function sendEmbed({ client }) {
  return async (req, res, next) => {
    try {
      validateEmbedRequest(req.body);

      const guilds = req.session.guilds || [];
      const guild = guilds.find((entry) => entry.id === req.body.guildId);

      if (!guild || !assertGuildAccess(guild)) {
        return res.status(403).json({ error: "Unauthorized guild access." });
      }

      const embed = buildEmbedPayload(req.body.embedData);
      const components = buildButtonRows(req.body.buttons || []);
      const content = buildOutgoingContent({
        messageContent: req.body.messageContent,
        mentions: req.body.mentions || []
      });
      const message = await sendEmbedMessage(client, {
        channelId: req.body.channelId,
        content,
        embed,
        components,
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

module.exports = {
  getGuilds,
  getChannels,
  getGuildResources,
  getAnalytics,
  sendEmbed
};
