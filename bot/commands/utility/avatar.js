const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get avatar")
    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const url = user.displayAvatarURL({ size: 1024, extension: "png", forceStatic: false });

    const embed = new EmbedBuilder().setTitle(`${user.tag} Avatar`).setImage(url).setColor("#5865f2");
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
