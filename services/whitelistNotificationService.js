const { EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");

/**
 * Customize an embed template with application-specific data
 * @param {Object} template - Embed template with title, description, color, etc.
 * @param {Object} application - WhitelistApplication document
 * @returns {Object} Customized embed data ready to be built
 */
function customizeEmbedTemplate(template, application) {
  if (!template) {
    return null;
  }

  return {
    title: template.title || "✅ Whitelist Application Approved",
    description: template.description || "Welcome to Sky Realms SMP! Your whitelist application has been approved.",
    color: template.color || "#28a745",
    footer: template.footer || "Sky Realms SMP",
    author: template.author || "Whitelist System",
    includeTimestamp: template.includeTimestamp !== false,
    minecraftUsername: application.minecraftUsername,
    discordId: application.discordId
  };
}

/**
 * Build an EmbedBuilder from customized template
 * @param {Object} embedData - Customized embed data
 * @returns {EmbedBuilder} Discord EmbedBuilder instance
 */
function buildCustomizedEmbed(embedData) {
  const embed = new EmbedBuilder();

  if (embedData.title) embed.setTitle(embedData.title);
  if (embedData.description) embed.setDescription(embedData.description);
  if (embedData.color) {
    const hexColor = embedData.color.startsWith("#") ? embedData.color : `#${embedData.color}`;
    embed.setColor(hexColor);
  }
  if (embedData.author) embed.setAuthor({ name: embedData.author });
  if (embedData.footer) embed.setFooter({ text: embedData.footer });
  if (embedData.includeTimestamp) embed.setTimestamp();

  // Add application info fields
  if (embedData.minecraftUsername || embedData.discordId) {
    const fields = [];
    if (embedData.minecraftUsername) {
      fields.push({
        name: "Minecraft Username",
        value: `\`${embedData.minecraftUsername}\``,
        inline: true
      });
    }
    if (embedData.discordId) {
      fields.push({
        name: "Discord",
        value: `<@${embedData.discordId}>`,
        inline: true
      });
    }
    if (fields.length > 0) {
      fields.push({
        name: "Approved",
        value: new Date().toLocaleDateString(),
        inline: true
      });
      embed.addFields(fields);
    }
  }

  return embed;
}

/**
 * Send a whitelist approval notification embed to Discord
 * @param {Object} client - Discord client
 * @param {Object} application - WhitelistApplication document
 * @param {Object} options - Configuration options
 * @param {string} options.channelId - Discord channel to send message to
 * @param {string} options.guildId - Guild ID for context
 * @param {string} options.message - Custom approval message (optional)
 * @param {string} options.roleId - Role to assign to approved user (optional)
 * @param {Object} options.embedTemplate - Custom embed template (optional)
 */
async function sendWhitelistApproved(client, application, options = {}) {
  try {
    const { channelId, guildId, message, roleId, embedTemplate } = options;

    if (!channelId) {
      logger.warn("Whitelist approval: No channel ID provided");
      return false;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Whitelist approval: Channel ${channelId} not found or not text-based`);
      return false;
    }

    // Build approval embed - use custom template if provided
    let embed;
    if (embedTemplate) {
      const customized = customizeEmbedTemplate(embedTemplate, application);
      embed = buildCustomizedEmbed(customized);
    } else {
      // Fallback to original hardcoded embed
      embed = new EmbedBuilder()
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
    }

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

/**
 * Send a whitelist rejection notification to Discord
 * @param {Object} client - Discord bot client
 * @param {Object} application - WhitelistApplication document
 * @param {Object} options - { channelId, guildId, embedTemplate }
 * @returns {boolean} Success status
 */
async function sendWhitelistRejected(client, application, options = {}) {
  try {
    const { channelId, embedTemplate } = options;

    if (!client || !channelId) {
      logger.warn("Missing Discord client or channel ID for rejection notification");
      return false;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isDMBased() && !channel.isTextBased()) {
      logger.warn(`Invalid channel for rejection notification: ${channelId}`);
      return false;
    }

    const customizedEmbed = customizeEmbedTemplate(embedTemplate, application);
    if (!customizedEmbed) {
      logger.warn("Failed to customize rejection embed template");
      return false;
    }

    const embed = buildCustomizedEmbed(customizedEmbed);
    const mention = `<@${application.discordId}>`;

    await channel.send({
      content: mention,
      embeds: [embed]
    });

    logger.info(`Rejection notification sent for application ${application._id}`);
    return true;
  } catch (error) {
    logger.error("Error sending whitelist rejection notification:", error);
    return false;
  }
}

module.exports = {
  sendWhitelistApproved,
  sendWhitelistApprovedBatch,
  sendWhitelistRejected,
  customizeEmbedTemplate,
  buildCustomizedEmbed
};
