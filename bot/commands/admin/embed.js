const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { buildEmbedPayload } = require("../../../services/discordService");
const { safeReply } = require("../../../services/commands/reply");

module.exports = {
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send a quick embed")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName("title").setDescription("Embed title").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("description").setDescription("Embed description").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Hex color (#5865f2)").setRequired(false)
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Target channel").setRequired(false)
    ),
  async execute(interaction) {
    const title = interaction.options.getString("title", true).trim().slice(0, 256);
    const description = interaction.options.getString("description", true).trim().slice(0, 4000);
    const color = interaction.options.getString("color") || "#5865f2";
    const channel = interaction.options.getChannel("channel") || interaction.channel;

    if (!channel || !channel.isTextBased()) {
      return safeReply(interaction, {
        content: "Please select a text channel.",
        ephemeral: true
      });
    }

    const embed = buildEmbedPayload({ title, description, color });
    await channel.send({ embeds: [embed] });

    return safeReply(interaction, {
      content: `Embed sent to <#${channel.id}>.`,
      ephemeral: true
    });
  }
};
