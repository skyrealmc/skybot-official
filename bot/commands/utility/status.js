const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { getMinecraftConfig } = require("../../../services/minecraftConfigService");

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

function getStateLabel(online) {
  if (online === true) return "🟢 Online";
  if (online === false) return "🔴 Offline";
  return "🟡 Unknown";
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
    const stateText = getStateLabel(online);
    const color = online === true ? "#22c55e" : online === false ? "#ef4444" : "#f59e0b";
    const players = Number.isFinite(status.playersOnline) ? String(status.playersOnline) : "-";
    const serverAddress = config.serverAddress || "Not configured";
    const details = [
      `**Players:** ${players}`,
      `**Last Check:** ${formatTimestamp(status.lastCheckAt)}`,
      status.lastRestartAttemptAt ? `**Restart:** ${formatTimestamp(status.lastRestartAttemptAt)}` : null
    ].filter(Boolean).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Minecraft Server Status")
      .setColor(color)
      .setDescription(`${stateText}\n${details}`)
      .addFields({ name: "Server", value: `\`${serverAddress}\``, inline: false })
      .setTimestamp(new Date());

    if (Array.isArray(status.playerList) && status.playerList.length > 0) {
      embed.addFields({
        name: "Online Players",
        value: status.playerList.slice(0, 15).join(", "),
        inline: false
      });
    }

    if (status.lastError) {
      embed.setFooter({ text: `Monitor: ${status.lastError.slice(0, 100)}` });
    } else if (status.lastEvent) {
      embed.setFooter({ text: `Last event: ${status.lastEvent}` });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
