const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const REQUIRED_GUILD_PERMISSION =
  PermissionsBitField.Flags.ManageGuild | PermissionsBitField.Flags.Administrator;

function assertGuildAccess(guild) {
  const permissions = BigInt(guild.permissions || "0");
  return (permissions & BigInt(REQUIRED_GUILD_PERMISSION)) !== 0n;
}

async function fetchGuildChannels(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();

  return channels
    .filter(
      (channel) =>
        channel &&
        [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        ].includes(channel.type)
    )
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type
    }));
}

function buildEmbedPayload(embedData) {
  const embed = new EmbedBuilder();

  if (embedData.title) embed.setTitle(embedData.title);
  if (embedData.description) embed.setDescription(embedData.description);
  if (embedData.color) embed.setColor(embedData.color);
  if (embedData.footer) embed.setFooter({ text: embedData.footer });
  if (embedData.author) embed.setAuthor({ name: embedData.author });
  if (embedData.timestamp) embed.setTimestamp(new Date());
  if (embedData.image) embed.setImage(embedData.image);
  if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);

  return embed;
}

function buildButtonRows(buttons) {
  if (!buttons.length) {
    return [];
  }

  const builders = buttons.slice(0, 5).map((button) => {
    if (button.type === "link") {
      return new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(button.label)
        .setURL(button.url);
    }

    return new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel(button.label)
      .setCustomId(button.customId);
  });

  return [new ActionRowBuilder().addComponents(builders)];
}

async function sendEmbedMessage(client, { channelId, embed, components }) {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !("send" in channel)) {
    throw new Error("Selected channel is not sendable.");
  }

  const botPermissions = channel.permissionsFor(client.user.id);
  if (
    !botPermissions ||
    !botPermissions.has([
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks
    ])
  ) {
    throw new Error("Bot lacks SEND_MESSAGES or EMBED_LINKS in that channel.");
  }

  return channel.send({
    embeds: [embed],
    components
  });
}

module.exports = {
  assertGuildAccess,
  fetchGuildChannels,
  buildEmbedPayload,
  buildButtonRows,
  sendEmbedMessage
};
