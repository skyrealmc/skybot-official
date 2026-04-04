const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");
const logger = require("../utils/logger");

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

async function fetchGuildResources(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  await guild.channels.fetch();
  await guild.roles.fetch();
  let members = [];

  try {
    await guild.members.fetch({ time: 10000 });
    members = guild.members.cache
      .filter((member) => !member.user.bot)
      .map((member) => ({
        id: member.id,
        name: member.displayName || member.user.username
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 200);
  } catch (error) {
    logger.warn(
      `Guild member fetch unavailable for ${guild.name}. Member mention options will be limited.`
    );
  }

  const channels = guild.channels.cache
    .filter(
      (channel) =>
        [
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        ].includes(channel.type)
    )
    .map((channel) => ({
      id: channel.id,
      name: channel.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roles = guild.roles.cache
    .filter((role) => role.name !== "@everyone")
    .map((role) => ({
      id: role.id,
      name: role.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { channels, roles, members };
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

function buildMentionText(mentions = []) {
  return mentions
    .map((mention) => {
      if (mention.type === "member") return `<@${mention.id}>`;
      if (mention.type === "role") return `<@&${mention.id}>`;
      if (mention.type === "channel") return `<#${mention.id}>`;
      if (mention.type === "everyone") return "@everyone";
      if (mention.type === "here") return "@here";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function buildOutgoingContent({ messageContent, mentions }) {
  return [buildMentionText(mentions), (messageContent || "").trim()]
    .filter(Boolean)
    .join("\n");
}

async function sendEmbedMessage(client, { channelId, content, embed, components, reactions }) {
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

  const message = await channel.send({
    content: content || undefined,
    embeds: [embed],
    components
  });

  for (const reaction of reactions || []) {
    await message.react(reaction);
  }

  return message;
}

async function fetchBotAnalytics(client, sessionGuilds = []) {
  const accessibleGuildIds = new Set(sessionGuilds.map((guild) => guild.id));
  const guilds = client.guilds.cache
    .filter((guild) => accessibleGuildIds.size === 0 || accessibleGuildIds.has(guild.id))
    .map((guild) => guild);

  const guildSummaries = await Promise.all(
    guilds.map(async (guild) => {
      await guild.channels.fetch();
      await guild.roles.fetch();

      return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount || 0,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
        ownerId: guild.ownerId || ""
      };
    })
  );

  return {
    bot: {
      username: client.user?.username || "",
      tag: client.user?.tag || "",
      id: client.user?.id || "",
      avatarUrl: client.user?.displayAvatarURL({ size: 256 }) || "",
      uptimeMs: client.uptime || 0,
      guildCount: client.guilds.cache.size
    },
    totals: {
      accessibleGuilds: guildSummaries.length,
      memberCount: guildSummaries.reduce((sum, guild) => sum + guild.memberCount, 0)
    },
    guilds: guildSummaries.sort((a, b) => b.memberCount - a.memberCount)
  };
}

module.exports = {
  assertGuildAccess,
  fetchGuildChannels,
  fetchGuildResources,
  buildEmbedPayload,
  buildButtonRows,
  buildOutgoingContent,
  fetchBotAnalytics,
  sendEmbedMessage
};
