const { SlashCommandBuilder } = require("discord.js");
const AFK = require("../../../models/AFK");
const { safeReply } = require("../../../services/commands/reply");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for AFK").setRequired(false)
    ),
  async execute(interaction) {
    const reason = (interaction.options.getString("reason") || "Away")
      .trim()
      .slice(0, 300);

    await AFK.findOneAndUpdate(
      { userId: interaction.user.id, guildId: interaction.guildId },
      { $set: { reason, since: new Date() } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return safeReply(interaction, {
      content: `AFK set: ${reason}`,
      ephemeral: true
    });
  }
};
