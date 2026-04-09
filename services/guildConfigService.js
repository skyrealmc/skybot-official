const GuildConfig = require("../models/GuildConfig");

async function getGuildConfig(guildId) {
  if (!guildId) return null;
  let config = await GuildConfig.findOne({ guildId }).lean();
  if (!config) {
    const created = await GuildConfig.create({ guildId, enabledCommands: [] });
    config = created.toObject();
  }
  return config;
}

async function updateGuildConfig(guildId, updates) {
  const setValues = {};
  if (updates.modLogChannel !== undefined) {
    setValues.modLogChannel = updates.modLogChannel;
  }
  if (updates.featureFlags) {
    setValues.featureFlags = updates.featureFlags;
  }
  if (Array.isArray(updates.enabledCommands)) {
    setValues.enabledCommands = updates.enabledCommands;
  }

  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $set: setValues },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return config.toObject();
}

function isCommandEnabled(config, commandName) {
  if (!config) return true;
  const enabled = config.enabledCommands || [];
  if (enabled.length === 0) return true;
  return enabled.includes(commandName);
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
  isCommandEnabled
};
