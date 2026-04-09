const { getGuildConfig, updateGuildConfig } = require("../services/guildConfigService");

function normalizeCommands(value) {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.map((v) => String(v || "").trim()).filter(Boolean))];
}

function normalizeFeatureFlags(flags) {
  if (!flags || typeof flags !== "object") return undefined;
  const out = {};
  if (typeof flags.moderationEnabled === "boolean") out.moderationEnabled = flags.moderationEnabled;
  if (typeof flags.utilityEnabled === "boolean") out.utilityEnabled = flags.utilityEnabled;
  if (typeof flags.adminEnabled === "boolean") out.adminEnabled = flags.adminEnabled;
  return out;
}

function getGuildCommandConfig() {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      const config = await getGuildConfig(guildId);
      return res.json(config);
    } catch (error) {
      return next(error);
    }
  };
}

function updateGuildCommandConfig({ client }) {
  return async (req, res, next) => {
    try {
      const { guildId } = req.params;
      const updates = {};

      const enabledCommands = normalizeCommands(req.body.enabledCommands);
      if (enabledCommands !== undefined) {
        updates.enabledCommands = enabledCommands;
      }

      const featureFlags = normalizeFeatureFlags(req.body.featureFlags);
      if (featureFlags !== undefined) {
        updates.featureFlags = featureFlags;
      }

      if (req.body.modLogChannel !== undefined) {
        const channelId = String(req.body.modLogChannel || "").trim();
        if (channelId) {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel || channel.guildId !== guildId || !channel.isTextBased()) {
            return res.status(400).json({ error: "Invalid mod-log channel for this guild." });
          }
          updates.modLogChannel = channelId;
        } else {
          updates.modLogChannel = "";
        }
      }

      const config = await updateGuildConfig(guildId, updates);
      return res.json(config);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  getGuildCommandConfig,
  updateGuildCommandConfig
};
