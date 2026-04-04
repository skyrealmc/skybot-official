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
        }))
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    req.session.user = {
      id: storedUser.discordId,
      username: storedUser.username,
      avatar: storedUser.avatar,
      avatarUrl: buildAvatarUrl({
        id: user.id,
        avatar: user.avatar,
        discriminator: user.discriminator
      })
    };
    req.session.guilds = storedUser.guilds;

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
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.session.user,
    guilds: req.session.guilds || []
  });
}

module.exports = {
  login,
  callback,
  logout,
  getSession
};
