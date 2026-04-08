const {
  hasCapability,
  getGuildAccess,
  buildAccountCapabilities
} = require("../services/permissionService");

function requireAccountCapability(capability) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (req.session.user.isGlobalAdmin) {
      return next();
    }

    const accountCaps = buildAccountCapabilities(req.session.guildAccess || []);
    if (!accountCaps[capability] && !accountCaps.full_access) {
      return res.status(403).json({ error: `Missing required permission: ${capability}` });
    }

    return next();
  };
}

function requireGuildCapability(capability, { source = "params", key = "guildId", requireBotPresent = true } = {}) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const guildId = req?.[source]?.[key];
    if (!guildId) {
      return res.status(400).json({ error: "Guild id is required." });
    }

    const access = getGuildAccess(req.session, guildId);
    if (!access) {
      return res.status(403).json({ error: "Unauthorized guild access." });
    }

    if (requireBotPresent && !access.botPresent) {
      return res.status(409).json({
        error: "Bot is not present in this guild.",
        inviteUrl: access.inviteUrl || ""
      });
    }

    if (!req.session.user.isGlobalAdmin && !hasCapability(access, capability)) {
      return res.status(403).json({ error: `Missing required permission: ${capability}` });
    }

    req.guildAccess = access;
    return next();
  };
}

module.exports = {
  requireAccountCapability,
  requireGuildCapability
};
