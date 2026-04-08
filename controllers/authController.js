const User = require("../models/User");
const {
  buildLoginUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchDiscordGuilds
} = require("../services/discordAuthService");
const {
  hasDiscordManageGuildPerms,
  resolveRoleForGuild,
  buildCapabilities,
  buildInviteUrl,
  buildAccountCapabilities
} = require("../services/permissionService");
const logger = require("../utils/logger");

function buildAvatarUrl(user) {
  if (!user.avatar) {
    const fallbackIndex = Number(user.discriminator || 0) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

async function login(_req, res) {
  res.redirect(buildLoginUrl());
}

async function isBotInGuild(client, guildId) {
  if (!client || !client.isReady || !client.isReady()) {
    return false;
  }

  if (client.guilds.cache.has(guildId)) {
    return true;
  }

  try {
    await client.guilds.fetch(guildId);
    return true;
  } catch {
    return false;
  }
}

function callback({ client } = {}) {
  return async (req, res, next) => {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("Missing OAuth code.");
    }

    try {
      const tokenData = await exchangeCodeForToken(code);
      const user = await fetchDiscordUser(tokenData.access_token);
      const guilds = await fetchDiscordGuilds(tokenData.access_token);

      const storedUser = await User.findOneAndUpdate(
        { discordId: user.id },
        {
          discordId: user.id,
          username: user.username,
          avatar: user.avatar,
          guilds: guilds.map((guild) => ({
            id: guild.id,
            name: guild.name,
            permissions: guild.permissions
          })),
          // Preserve existing roles and allowedGuilds
          $setOnInsert: {
            roles: [],
            guildRoles: [],
            allowedGuilds: [],
            isGlobalAdmin: false
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: false }
      );

      // Filter guilds where user has Manage Guild or Admin
      const permissionEligibleGuilds = guilds.filter((guild) =>
        hasDiscordManageGuildPerms(guild.permissions)
      );

      // Further filter by allowedGuilds if set
      const finalGuilds = storedUser.allowedGuilds.length > 0
        ? permissionEligibleGuilds.filter((guild) => storedUser.allowedGuilds.includes(guild.id))
        : permissionEligibleGuilds;

      const guildAccess = await Promise.all(
        finalGuilds.map(async (guild) => {
          const role = resolveRoleForGuild({ user: storedUser, guild });
          const capabilities = buildCapabilities(role);
          const botPresent = await isBotInGuild(client, guild.id);
          return {
            id: guild.id,
            name: guild.name,
            permissions: guild.permissions,
            role,
            capabilities,
            botPresent,
            available: botPresent,
            inviteUrl: botPresent
              ? ""
              : buildInviteUrl({
                clientId: process.env.CLIENT_ID,
                guildId: guild.id
              })
          };
        })
      );

      req.session.user = {
        id: storedUser.discordId,
        username: storedUser.username,
        avatar: storedUser.avatar,
        avatarUrl: buildAvatarUrl({
          id: user.id,
          avatar: user.avatar,
          discriminator: user.discriminator
        }),
        roles: storedUser.roles || [],
        guildRoles: storedUser.guildRoles || [],
        isGlobalAdmin: storedUser.isGlobalAdmin || false,
        allowedGuilds: storedUser.allowedGuilds || []
      };
      req.session.guildAccess = guildAccess;
      req.session.guilds = guildAccess
        .filter((guild) => guild.botPresent)
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          permissions: guild.permissions
        }));

      res.redirect("/");
    } catch (error) {
      logger.error("OAuth callback failed", error);
      next(error);
    }
  };
}

function getFallbackSessionGuildAccess(req) {
  const guilds = req.session.guilds || [];
  return guilds.map((guild) => ({
    ...guild,
    role: "admin",
    capabilities: buildCapabilities("admin"),
    botPresent: true,
    available: true,
    inviteUrl: ""
  }));
}

function getSession(req, res) {
  if (!req.session.user) {
    return res.status(200).json({ authenticated: false });
  }

  const guildAccess = req.session.guildAccess || getFallbackSessionGuildAccess(req);
  const accountCapabilities = buildAccountCapabilities(guildAccess);

  // Get bot info from session or from the request's client
  const botInfo = req.session.bot || {
    username: "SkyBot S2",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png"
  };

  return res.json({
    authenticated: true,
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      avatarUrl: req.session.user.avatarUrl,
      roles: req.session.user.roles || [],
      isGlobalAdmin: req.session.user.isGlobalAdmin || false,
      accountCapabilities
    },
    guilds: guildAccess,
    bot: botInfo
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

module.exports = {
  login,
  callback,
  logout,
  getSession
};
