const { fetchDiscordGuilds } = require("../services/discordAuthService");
const logger = require("../utils/logger");

const TARGET_GUILD_ID = process.env.DISCORD_GUILD_ID;
const INVITE_URL = process.env.DISCORD_INVITE_URL || "https://discord.gg/skyrealms";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Middleware to ensure the user is a member of the target Discord guild.
 */
async function requireGuildMember(req, res, next) {
  // 1. Check if user is authenticated at all
  if (!req.session.user || !req.session.access_token) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "You must be logged in with Discord."
    });
  }

  const now = Date.now();

  // 2. Check cache in session
  if (
    req.session.isGuildMember &&
    req.session.guildMemberCheckedAt &&
    (now - req.session.guildMemberCheckedAt < CACHE_TTL)
  ) {
    return next();
  }

  try {
    // 3. Fetch user's guilds from Discord API
    const guilds = await fetchDiscordGuilds(req.session.access_token);
    
    // 4. Check for target guild membership
    const isMember = guilds.some(g => g.id === TARGET_GUILD_ID);

    if (isMember) {
      // Update cache
      req.session.isGuildMember = true;
      req.session.guildMemberCheckedAt = now;
      
      // Explicitly save session before moving to next
      req.session.save((err) => {
        if (err) logger.error("Session save error in requireGuildMember", err);
        next();
      });
    } else {
      // User is not in the required server
      return res.status(403).json({
        error: "GUILD_REQUIRED",
        message: "You must join the Sky Realms Discord server to access this feature.",
        joinUrl: INVITE_URL
      });
    }
  } catch (error) {
    logger.error("Error checking guild membership:", error.response?.data || error.message);
    
    // If token is invalid/expired, we might need a re-login
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "TOKEN_EXPIRED",
        message: "Your Discord session has expired. Please log in again."
      });
    }

    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal error while verifying Discord membership."
    });
  }
}

module.exports = requireGuildMember;
