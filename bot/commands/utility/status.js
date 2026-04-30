const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getMinecraftConfig } = require("../../../services/minecraftConfigService");

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

module.exports = {
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show the live Minecraft server status"),
  async execute(interaction) {
    const monitor = interaction.client.minecraftMonitor;
    if (!monitor || typeof monitor.getStatus !== "function") {
      await interaction.reply({
        content: "Minecraft monitor is not available right now.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const [config, status] = await Promise.all([
      getMinecraftConfig().catch(() => ({})),
      Promise.resolve(monitor.getStatus())
    ]);

    const online = status.online;
    const stateText = online === true ? "Online" : online === false ? "Offline" : "Unknown";
    const color = online === true ? "#22c55e" : online === false ? "#ef4444" : "#f59e0b";
    const players = Number.isFinite(status.playersOnline) ? String(status.playersOnline) : "-";
    const lastError = status.lastError || "None";
    const serverAddress = config.serverAddress || "Not configured";

    const embed = new EmbedBuilder()
      .setTitle("Minecraft Server Status")
      .setColor(color)
      .addFields(
        { name: "State", value: stateText, inline: true },
        { name: "Players", value: players, inline: true },
        { name: "Server", value: serverAddress, inline: false },
        { name: "Last Check", value: formatTimestamp(status.lastCheckAt), inline: true },
        { name: "Last Event", value: status.lastEvent || "None", inline: true },
        { name: "Last Restart Attempt", value: formatTimestamp(status.lastRestartAttemptAt), inline: false },
        { name: "Monitor Error", value: lastError, inline: false }
      )
      .setTimestamp(new Date());

    if (Array.isArray(status.playerList) && status.playerList.length > 0) {
      embed.addFields({
        name: "Online Players",
        value: status.playerList.slice(0, 15).join(", "),
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
