const { EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");

/**
 * Send a whitelist approval notification embed to Discord
 * @param {Object} client - Discord client
 * @param {Object} application - WhitelistApplication document
 * @param {Object} options - Configuration options
 * @param {string} options.channelId - Discord channel to send message to
 * @param {string} options.guildId - Guild ID for context
 * @param {string} options.message - Custom approval message (optional)
 * @param {string} options.roleId - Role to assign to approved user (optional)
 */
async function sendWhitelistApproved(client, application, options = {}) {
  try {
    const { channelId, guildId, message, roleId } = options;

    if (!channelId) {
      logger.warn("Whitelist approval: No channel ID provided");
      return false;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Whitelist approval: Channel ${channelId} not found or not text-based`);
      return false;
    }

    // Build approval embed
    const embed = new EmbedBuilder()
      .setTitle("✅ Whitelist Application Approved")
      .setDescription(
        message ||
          `Welcome to Sky Realms SMP! Your whitelist application has been approved.`
      )
      .addFields(
        { name: "Minecraft Username", value: `\`${application.minecraftUsername}\``, inline: true },
        { name: "Discord", value: `<@${application.discordId}>`, inline: true },
        { name: "Approved", value: new Date().toLocaleDateString(), inline: true }
      )
      .setColor("#28a745")
      .setTimestamp();

    // Send embed
    const sentMessage = await channel.send({ embeds: [embed] });
    logger.info(`Whitelist approval sent for ${application.minecraftUsername} in channel ${channelId}`);

    // Assign role if provided and in a guild
    if (roleId && guildId) {
      try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (guild) {
          const member = await guild.members.fetch(application.discordId).catch(() => null);
          if (member) {
            await member.roles.add(roleId);
            logger.info(`Role ${roleId} assigned to ${application.minecraftUsername}`);
          }
        }
      } catch (roleError) {
        logger.warn(`Failed to assign role to ${application.discordId}:`, roleError.message);
        // Don't throw - role assignment is optional
      }
    }

    return true;
  } catch (error) {
    logger.error("Error sending whitelist approval notification:", error);
    return false;
  }
}

/**
 * Send a batch of whitelist approval messages
 * Useful for approving multiple applications at once
 */
async function sendWhitelistApprovedBatch(client, applications, options = {}) {
  const results = [];

  for (const app of applications) {
    const success = await sendWhitelistApproved(client, app, options);
    results.push({
      applicationId: app._id,
      minecraftUsername: app.minecraftUsername,
      success
    });
  }

  return results;
}

module.exports = {
  sendWhitelistApproved,
  sendWhitelistApprovedBatch
};
