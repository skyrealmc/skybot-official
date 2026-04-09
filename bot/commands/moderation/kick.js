const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { safeReply } = require("../../../services/commands/reply");
const { logModerationAction } = require("../../../services/moderationLogService");
const { incrementModerationAction } = require("../../../services/metricsService");

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (target.id === interaction.user.id) {
      return safeReply(interaction, { content: "You cannot kick yourself.", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return safeReply(interaction, { content: "User is not in this server.", ephemeral: true });
    }

    if (!member.kickable || member.id === interaction.guild.ownerId) {
      return safeReply(interaction, { content: "That user cannot be kicked.", ephemeral: true });
    }

    await member.kick(`${reason} | by ${interaction.user.tag}`);
    await incrementModerationAction(interaction.guildId);
    await logModerationAction(interaction.client, interaction.guildId, {
      action: "Kick",
      targetTag: target.tag,
      targetId: target.id,
      moderatorTag: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason
    });

    return safeReply(interaction, { content: `Kicked ${target.tag}.`, ephemeral: true });
  }
};

