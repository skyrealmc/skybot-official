const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Get server info"),
  async execute(interaction) {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle(`Server Info: ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: "Members", value: String(guild.memberCount || 0), inline: true },
        { name: "Roles", value: String(guild.roles.cache.size), inline: true },
        { name: "Channels", value: String(guild.channels.cache.size), inline: true },
        { name: "Server ID", value: guild.id, inline: false }
      )
      .setColor("#5865f2");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

