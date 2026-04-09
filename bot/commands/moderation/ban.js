const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { safeReply } = require("../../../services/commands/reply");
const { logModerationAction } = require("../../../services/moderationLogService");
const { incrementModerationAction } = require("../../../services/metricsService");

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) => opt.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (target.id === interaction.user.id) {
      return safeReply(interaction, { content: "You cannot ban yourself.", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return safeReply(interaction, { content: "User is not in this server.", ephemeral: true });
    }

    if (!member.bannable || member.id === interaction.guild.ownerId) {
      return safeReply(interaction, { content: "That user cannot be banned.", ephemeral: true });
    }

    await member.ban({ reason: `${reason} | by ${interaction.user.tag}` });
    await incrementModerationAction(interaction.guildId);
    await logModerationAction(interaction.client, interaction.guildId, {
      action: "Ban",
      targetTag: target.tag,
      targetId: target.id,
      moderatorTag: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason
    });

    return safeReply(interaction, { content: `Banned ${target.tag}.`, ephemeral: true });
  }
};

