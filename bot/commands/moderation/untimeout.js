const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { safeReply } = require("../../../services/commands/reply");
const { logModerationAction } = require("../../../services/moderationLogService");
const { incrementModerationAction } = require("../../../services/metricsService");

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove timeout from a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName("user").setDescription("User to untimeout").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable) {
      return safeReply(interaction, { content: "That user cannot be modified.", ephemeral: true });
    }

    await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);
    await incrementModerationAction(interaction.guildId);
    await logModerationAction(interaction.client, interaction.guildId, {
      action: "Untimeout",
      targetTag: target.tag,
      targetId: target.id,
      moderatorTag: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason: "Timeout removed"
    });

    return safeReply(interaction, { content: `Removed timeout from ${target.tag}.`, ephemeral: true });
  }
};

