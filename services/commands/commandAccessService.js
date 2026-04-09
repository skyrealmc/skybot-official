const { getGuildConfig, isCommandEnabled } = require("../guildConfigService");

const COMMAND_CATEGORY_FLAG = {
  moderation: "moderationEnabled",
  utility: "utilityEnabled",
  admin: "adminEnabled"
};

async function checkCommandAccess(guildId, command) {
  const config = await getGuildConfig(guildId);

  const category = command.category || "utility";
  const featureFlag = COMMAND_CATEGORY_FLAG[category];
  if (featureFlag && config?.featureFlags?.[featureFlag] === false) {
    return { ok: false, reason: `${category} commands are disabled for this server.` };
  }

  if (!isCommandEnabled(config, command.data.name)) {
    return { ok: false, reason: `/${command.data.name} is disabled in this server.` };
  }

  return { ok: true, config };
}

module.exports = {
  checkCommandAccess
};
