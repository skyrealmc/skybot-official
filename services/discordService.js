const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  ComponentBuilder,
  APIButtonComponent,
  APIActionRowComponent
} = require("discord.js");
const logger = require("../utils/logger");

const REQUIRED_GUILD_PERMISSION =
  PermissionsBitField.Flags.ManageGuild | PermissionsBitField.Flags.Administrator;

function assertGuildAccess(guild) {
  const permissions = BigInt(guild.permissions || "0");
  return (permissions & BigInt(REQUIRED_GUILD_PERMISSION)) !== 0n;
}

const BUTTON_STYLE_MAP = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
  Link: ButtonStyle.Link
};

async function fetchGuildChannels(client, guildId) {
  try {
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
  } catch (error) {
    logger.error(`Failed to fetch channels for guild ${guildId}: ${error.message}`);
    throw new Error(`Unable to fetch channels for this guild. The bot may have been removed or the guild is no longer accessible.`);
  }
}

async function fetchGuildResources(client, guildId) {
  try {
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
  } catch (error) {
    logger.error(`Failed to fetch resources for guild ${guildId}: ${error.message}`);
    throw new Error(`Unable to fetch resources for this guild. The bot may have been removed or the guild is no longer accessible.`);
  }
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

function parseEmoji(emojiString) {
  if (!emojiString || typeof emojiString !== "string") return undefined;
  
  // Simple emoji (unicode)
  if (!emojiString.includes(":")) {
    return { name: emojiString };
  }
  
  // Custom emoji format: name:id or animated:name:id
  const parts = emojiString.split(":");
  if (parts.length >= 2) {
    return {
      id: parts[parts.length - 1],
      name: parts.slice(0, -1).join(":") || null
    };
  }
  
  return { name: emojiString };
}

function buildButtonRows(buttons) {
  if (!buttons.length) {
    return [];
  }

  const builders = buttons.slice(0, 5).map((button) => {
    const builder = new ButtonBuilder();
    const style = BUTTON_STYLE_MAP[button.style] || ButtonStyle.Primary;
    
    if (button.type === "link") {
      builder
        .setStyle(ButtonStyle.Link)
        .setLabel(button.label)
        .setURL(button.url);
    } else {
      builder
        .setStyle(style)
        .setLabel(button.label)
        .setCustomId(button.customId);
    }

    if (button.emoji) {
      const emoji = parseEmoji(button.emoji);
      if (emoji) builder.setEmoji(emoji);
    }

    return builder;
  });

  return [new ActionRowBuilder().addComponents(builders)];
}

function buildComponentsV2Payload(componentsV2) {
  if (!componentsV2 || !Array.isArray(componentsV2) || componentsV2.length === 0) {
    return [];
  }

  const actionRows = [];
  
  for (const container of componentsV2) {
    if (!container.children || !Array.isArray(container.children)) continue;
    
    const rowComponents = [];
    
    for (const item of container.children) {
      switch (item.type) {
        case "button": {
          const button = new ButtonBuilder();
          const style = BUTTON_STYLE_MAP[item.style] || ButtonStyle.Primary;
          
          if (item.type === "link" || (item.url && !item.customId)) {
            button
              .setStyle(ButtonStyle.Link)
              .setLabel(item.label || "Button")
              .setURL(item.url);
          } else {
            button
              .setStyle(style)
              .setLabel(item.label || "Button")
              .setCustomId(item.customId || `v2_btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          }

          if (item.emoji) {
            const emoji = parseEmoji(item.emoji);
            if (emoji) button.setEmoji(emoji);
          }

          rowComponents.push(button);
          break;
        }
        
        case "separator": {
          // Separators are rendered as spacers in the UI
          // In Discord, we can't add actual separators, so we skip them in the component layout
          break;
        }
        
        default:
          // Text, image, media are rendered as message content, not components
          break;
      }
    }

    if (rowComponents.length > 0) {
      actionRows.push(new ActionRowBuilder().addComponents(rowComponents));
    }
  }

  return actionRows;
}

function buildComponentsV2Content(componentsV2) {
  if (!componentsV2 || !Array.isArray(componentsV2)) {
    return "";
  }

  const contentParts = [];
  
  for (const container of componentsV2) {
    if (!container.children || !Array.isArray(container.children)) continue;
    
    for (const item of container.children) {
      switch (item.type) {
        case "text": {
          if (item.content) {
            contentParts.push(item.content);
          }
          break;
        }
        
        case "separator": {
          contentParts.push("---");
          break;
        }
        
        case "image":
        case "media": {
          if (item.url) {
            contentParts.push(item.url);
          }
          break;
        }
        
        default:
          break;
      }
    }
  }

  return contentParts.join("\n");
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
  buildComponentsV2Payload,
  buildComponentsV2Content,
  buildOutgoingContent,
  fetchBotAnalytics,
  sendEmbedMessage,
  sendHybridMessage
};

async function sendHybridMessage(client, { channelId, content, embed, components, componentsV2, messageType, reactions }) {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !("send" in channel)) {
    throw new Error("Selected channel is not sendable.");
  }

  const botPermissions = channel.permissionsFor(client.user.id);
  
  const requiredPermissions = [PermissionsBitField.Flags.SendMessages];
  if (messageType === "embed" || messageType === "hybrid") {
    requiredPermissions.push(PermissionsBitField.Flags.EmbedLinks);
  }
  
  if (!botPermissions || !botPermissions.has(requiredPermissions)) {
    throw new Error(`Bot lacks required permissions in that channel.`);
  }

  let finalComponents = [];
  let finalEmbeds = [];
  let finalContent = content;

  switch (messageType) {
    case "embed":
      finalEmbeds = embed ? [embed] : [];
      finalComponents = components || [];
      break;
      
    case "hybrid":
      finalEmbeds = embed ? [embed] : [];
      finalComponents = components || [];
      break;
      
    case "v2":
      // For V2, embeds from containers are extracted and sent as regular embeds
      // Components are built from button items in containers
      if (componentsV2 && Array.isArray(componentsV2)) {
        finalComponents = buildComponentsV2Payload(componentsV2);
        const v2Content = buildComponentsV2Content(componentsV2);
        if (v2Content) {
          finalContent = finalContent ? `${finalContent}\n${v2Content}` : v2Content;
        }
      }
      break;
      
    default:
      finalEmbeds = embed ? [embed] : [];
      finalComponents = components || [];
  }

  const message = await channel.send({
    content: finalContent || undefined,
    embeds: finalEmbeds,
    components: finalComponents
  });

  for (const reaction of reactions || []) {
    await message.react(reaction);
  }

  return message;
}
