const { EmbedBuilder } = require("discord.js");
const { getGuildConfig } = require("./guildConfigService");
const logger = require("../utils/logger");

async function logModerationAction(client, guildId, payload) {
  try {
    const config = await getGuildConfig(guildId);
    if (!config?.modLogChannel) return;

    const channel = await client.channels.fetch(config.modLogChannel);
    if (!channel || !("send" in channel)) return;

    const embed = new EmbedBuilder()
      .setTitle(`Moderation: ${payload.action}`)
      .setColor("#ef4444")
      .addFields(
        { name: "Target", value: payload.targetTag || payload.targetId || "Unknown", inline: true },
        { name: "Moderator", value: payload.moderatorTag || payload.moderatorId || "Unknown", inline: true },
        { name: "Reason", value: payload.reason || "No reason provided", inline: false }
      )
      .setTimestamp(new Date());

    await channel.send({ embeds: [embed] });
  } catch (error) {
    logger.warn(`Failed to write moderation log for guild ${guildId}: ${error.message}`);
  }
}

module.exports = {
  logModerationAction
};
