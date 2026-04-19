const {
  getMinecraftConfig,
  updateMinecraftConfig
} = require("../services/minecraftConfigService");
const { getGuildAccess, hasCapability } = require("../services/permissionService");

function getMinecraftStatus() {
  return async (req, res, next) => {
    try {
      const monitor = req.app.get("minecraftMonitor");
      const config = await getMinecraftConfig();
      return res.json({
        monitor: monitor?.getStatus?.() || {},
        config
      });
    } catch (error) {
      return next(error);
    }
  };
}

function getMinecraftConfigEndpoint() {
  return async (_req, res, next) => {
    try {
      const config = await getMinecraftConfig();
      return res.json(config);
    } catch (error) {
      return next(error);
    }
  };
}

function updateMinecraftConfigEndpoint({ client }) {
  return async (req, res, next) => {
    try {
      const updates = req.body || {};
      const userId = req.session?.user?.id || "";

      const nextGuildId = updates.guildId !== undefined ? String(updates.guildId || "").trim() : "";
      const nextChannelId = updates.channelId !== undefined ? String(updates.channelId || "").trim() : "";

      if (nextGuildId) {
        const access = getGuildAccess(req.session, nextGuildId);
        if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
          return res.status(403).json({ error: "You do not have Minecraft settings access for this guild." });
        }
      }

      if (nextGuildId && nextChannelId) {
        const channel = await client.channels.fetch(nextChannelId).catch(() => null);
        if (!channel || channel.guildId !== nextGuildId || !channel.isTextBased()) {
          return res.status(400).json({ error: "Selected channel is invalid for the chosen guild." });
        }
      }

      if (updates.mentionType === "role" && updates.mentionRoleId) {
        const access = getGuildAccess(req.session, nextGuildId);
        if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
          return res.status(403).json({ error: "Role mention requires valid guild management access." });
        }
      }

      const config = await updateMinecraftConfig(updates, userId);
      return res.json(config);
    } catch (error) {
      return next(error);
    }
  };
}

function sendMinecraftTestAlert() {
  return async (req, res, next) => {
    try {
      const type = String(req.body?.type || "online").toLowerCase();
      const monitor = req.app.get("minecraftMonitor");
      if (!monitor || typeof monitor.sendTestAlert !== "function") {
        return res.status(503).json({ error: "Minecraft monitor is not ready." });
      }

      const success = await monitor.sendTestAlert(type);
      if (!success) {
        return res.status(400).json({ error: "Failed to send test alert. Check config/channel/bot status." });
      }

      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  getMinecraftStatus,
  getMinecraftConfigEndpoint,
  updateMinecraftConfigEndpoint,
  sendMinecraftTestAlert
};
