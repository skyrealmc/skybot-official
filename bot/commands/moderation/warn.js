const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../../models/Warning");
const { safeReply } = require("../../../services/commands/reply");
const { logModerationAction } = require("../../../services/moderationLogService");
const { incrementModerationAction } = require("../../../services/metricsService");

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((opt) => opt.setName("user").setDescription("User to warn").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true).slice(0, 500);

    if (target.id === interaction.user.id) {
      return safeReply(interaction, { content: "You cannot warn yourself.", ephemeral: true });
    }

    await Warning.create({
      userId: target.id,
      guildId: interaction.guildId,
      reason,
      moderatorId: interaction.user.id
    });

    const count = await Warning.countDocuments({ userId: target.id, guildId: interaction.guildId });
    await incrementModerationAction(interaction.guildId);
    await logModerationAction(interaction.client, interaction.guildId, {
      action: "Warn",
      targetTag: target.tag,
      targetId: target.id,
      moderatorTag: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason
    });

    return safeReply(interaction, {
      content: `Warned ${target.tag}. Total warnings: ${count}`,
      ephemeral: true
    });
  }
};

