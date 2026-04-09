const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { parseDuration, formatDuration } = require("../../../services/commands/duration");
const { safeReply } = require("../../../services/commands/reply");
const { logModerationAction } = require("../../../services/moderationLogService");
const { incrementModerationAction } = require("../../../services/metricsService");

module.exports = {
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName("user").setDescription("User to timeout").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("duration").setDescription("Duration e.g. 10m, 1h, 1d").setRequired(true)
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const durationInput = interaction.options.getString("duration", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const duration = parseDuration(durationInput);
    if (!duration || duration < 5000 || duration > 2419200000) {
      return safeReply(interaction, {
        content: "Invalid duration. Use 5s to 28d (e.g., 10m, 2h, 1d).",
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable || member.id === interaction.guild.ownerId) {
      return safeReply(interaction, { content: "That user cannot be timed out.", ephemeral: true });
    }

    await member.timeout(duration, `${reason} | by ${interaction.user.tag}`);
    await incrementModerationAction(interaction.guildId);
    await logModerationAction(interaction.client, interaction.guildId, {
      action: "Timeout",
      targetTag: target.tag,
      targetId: target.id,
      moderatorTag: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason: `${reason} (${formatDuration(duration)})`
    });

    return safeReply(interaction, {
      content: `Timed out ${target.tag} for ${formatDuration(duration)}.`,
      ephemeral: true
    });
  }
};

