const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create poll")
    .addStringOption((opt) => opt.setName("question").setDescription("Poll question").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName("options")
        .setDescription("Options separated by | (2-5 options)")
        .setRequired(true)
    ),
  async execute(interaction) {
    const question = interaction.options.getString("question", true).slice(0, 200);
    const rawOptions = interaction.options.getString("options", true);
    const options = rawOptions
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (options.length < 2) {
      return interaction.reply({
        content: "Provide at least 2 options separated by |",
        flags: MessageFlags.Ephemeral
      });
    }

    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
    const description = options.map((opt, i) => `${emojis[i]} ${opt}`).join("\n");
    const embed = new EmbedBuilder().setTitle(`📊 ${question}`).setDescription(description).setColor("#5865f2");

    const msg = await interaction.channel.send({ embeds: [embed] });
    for (let i = 0; i < options.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await msg.react(emojis[i]);
    }

    await interaction.reply({ content: "Poll created.", flags: MessageFlags.Ephemeral });
  }
};
