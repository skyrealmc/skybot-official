const User = require("../models/User");
const {
  buildLoginUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchDiscordGuilds
} = require("../services/discordAuthService");
const logger = require("../utils/logger");

function buildAvatarUrl(user) {
  if (!user.avatar) {
    const fallbackIndex = Number(user.discriminator || 0) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

function hasManageGuildPermission(permissions) {
  if (!permissions) return false;
  const perms = BigInt(permissions);
  const MANAGE_GUILD = 1n << 5n; // 0x20
  const ADMINISTRATOR = 1n << 3n; // 0x08
  return (perms & MANAGE_GUILD) !== 0n || (perms & ADMINISTRATOR) !== 0n;
}

async function login(_req, res) {
  res.redirect(buildLoginUrl());
}

async function callback(req, res, next) {
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
          allowedGuilds: [],
          isGlobalAdmin: false
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );

    // Filter guilds based on permissions (only show guilds where user has Manage Guild or Admin)
    const accessibleGuilds = guilds.filter((guild) =>
      hasManageGuildPermission(guild.permissions)
    );

    // Further filter by allowedGuilds if set
    const finalGuilds = storedUser.allowedGuilds.length > 0
      ? accessibleGuilds.filter((guild) => storedUser.allowedGuilds.includes(guild.id))
      : accessibleGuilds;

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
      isGlobalAdmin: storedUser.isGlobalAdmin || false,
      allowedGuilds: storedUser.allowedGuilds || []
    };
    req.session.guilds = finalGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      permissions: guild.permissions
    }));

    res.redirect("/");
  } catch (error) {
    logger.error("OAuth callback failed", error);
    next(error);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

function getSession(req, res) {
  if (!req.session.user) {
    return res.status(200).json({ authenticated: false });
  }

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
      isGlobalAdmin: req.session.user.isGlobalAdmin || false
    },
    guilds: req.session.guilds || [],
    bot: botInfo
  });
}

module.exports = {
  login,
  callback,
  logout,
  getSession
};
