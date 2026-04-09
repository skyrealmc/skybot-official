const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("Get role details")
    .addRoleOption((opt) => opt.setName("role").setDescription("Role").setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole("role", true);
    const embed = new EmbedBuilder()
      .setTitle(`Role Info: ${role.name}`)
      .setColor(role.color || "#5865f2")
      .addFields(
        { name: "Role ID", value: role.id, inline: true },
        { name: "Members", value: String(role.members.size), inline: true },
        { name: "Position", value: String(role.position), inline: true },
        {
          name: "Permissions",
          value: role.permissions.toArray().slice(0, 15).join(", ") || "None",
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
