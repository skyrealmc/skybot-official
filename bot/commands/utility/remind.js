const { SlashCommandBuilder } = require("discord.js");
const Reminder = require("../../../models/Reminder");
const { parseDuration, formatDuration } = require("../../../services/commands/duration");
const { safeReply } = require("../../../services/commands/reply");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((opt) =>
      opt.setName("time").setDescription("When to remind (e.g. 10m, 2h, 1d)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("message").setDescription("Reminder message").setRequired(true)
    ),
  async execute(interaction) {
    const timeInput = interaction.options.getString("time", true);
    const message = interaction.options.getString("message", true).trim().slice(0, 1000);

    const duration = parseDuration(timeInput);
    if (!duration || duration < 5000 || duration > 2592000000) {
      return safeReply(interaction, {
        content: "Invalid reminder time. Use 5s to 30d (e.g. 10m, 2h, 1d).",
        ephemeral: true
      });
    }

    const dueAt = new Date(Date.now() + duration);
    await Reminder.create({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      dueAt,
      message
    });

    return safeReply(interaction, {
      content: `Reminder created for ${formatDuration(duration)} from now.`,
      ephemeral: true
    });
  }
};
