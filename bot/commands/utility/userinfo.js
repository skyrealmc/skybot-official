const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get user details")
    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member
      ? member.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => r.name)
        .slice(0, 10)
        .join(", ") || "None"
      : "Unknown";

    const embed = new EmbedBuilder()
      .setTitle(`User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "User ID", value: user.id, inline: true },
        {
          name: "Joined",
          value: member?.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown",
          inline: true
        },
        { name: "Roles", value: roles, inline: false }
      )
      .setColor("#5865f2");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

