const express = require("express");
const rateLimit = require("express-rate-limit");

const requireAuth = require("../middlewares/requireAuth");
const requireGuildMember = require("../middlewares/requireGuildMember");
const {
  requireAccountCapability,
  requireGuildCapability
} = require("../middlewares/accessControl");
const {
  getGuilds,
  getChannels,
  getGuildResources,
  getAnalytics,
  getBotStatus,
  sendMessage,
  validateMessagePayload
} = require("../controllers/embedController");
const {
  saveTemplate,
  getTemplates,
  renameTemplate,
  deleteTemplate,
  exportTemplate,
  importTemplate,
  duplicateTemplate
} = require("../controllers/templateController");
const {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleStats
} = require("../controllers/scheduleController");
const {
  getGuildCommandConfig,
  updateGuildCommandConfig
} = require("../controllers/guildConfigController");
const {
  submitApplication,
  listApplications,
  getApplication,
  approveApplicationEndpoint,
  rejectApplicationEndpoint,
  deleteApplicationEndpoint,
  resendApplicationNotification,
  getWhitelistConfigEndpoint,
  saveWhitelistConfigEndpoint
} = require("../controllers/whitelistController");
const {
  getMinecraftStatus,
  getMinecraftConfigEndpoint,
  updateMinecraftConfigEndpoint,
  sendMinecraftTestAlert
} = require("../controllers/minecraftController");
const {
  getArticlesEndpoint,
  createArticleEndpoint,
  updateArticleEndpoint,
  deleteArticleEndpoint
} = require("../controllers/knowledgeBaseController");

function createApiRouter({ client }) {
  const router = express.Router();
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  });
  const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  });
  const scheduleCreateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  });
  const whitelistLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.use(globalLimiter);

  // Whitelist apply endpoint - Requires Discord Membership
  // Note: user must be logged in for this to work
  router.post("/whitelist/apply", requireAuth, requireGuildMember, whitelistLimiter, submitApplication);

  // All other routes require authentication + guild membership
  router.use(requireAuth);
  router.use(requireGuildMember);

  router.get("/guilds", getGuilds({ client }));
  router.get("/bot-status", getBotStatus({ client }));
  router.get("/analytics", requireAccountCapability("view_analytics"), getAnalytics({ client }));
  router.get("/channels/:guildId", requireGuildCapability("send_messages", { source: "params" }), getChannels({ client }));
  router.get("/resources/:guildId", requireGuildCapability("send_messages", { source: "params" }), getGuildResources({ client }));
  router.get("/guild-resources/:guildId", requireGuildCapability("send_messages", { source: "params" }), getGuildResources({ client }));
  router.post("/send-message", sendLimiter, requireGuildCapability("send_messages", { source: "body" }), sendMessage({ client }));
  router.post("/validate-message", requireGuildCapability("send_messages", { source: "body" }), validateMessagePayload);

  // Template routes
  router.post("/save-template", requireAccountCapability("manage_templates"), saveTemplate);
  router.post("/import-template", requireAccountCapability("manage_templates"), importTemplate);
  router.get("/templates", requireAccountCapability("manage_templates"), getTemplates);
  router.get("/templates/:templateId/export", requireAccountCapability("manage_templates"), exportTemplate);
  router.patch("/templates/:templateId/rename", requireAccountCapability("manage_templates"), renameTemplate);
  router.delete("/templates/:templateId", requireAccountCapability("manage_templates"), deleteTemplate);
  router.post("/templates/:templateId/duplicate", requireAccountCapability("manage_templates"), duplicateTemplate);

  // Schedule routes
  router.get("/schedules", requireAccountCapability("manage_settings"), getSchedules);
  router.get("/schedules/stats", requireAccountCapability("manage_settings"), getScheduleStats);
  router.get("/schedules/:scheduleId", requireAccountCapability("manage_settings"), getSchedule);
  router.post("/schedules", scheduleCreateLimiter, requireAccountCapability("manage_settings"), createSchedule);
  router.patch("/schedules/:scheduleId", requireAccountCapability("manage_settings"), updateSchedule);
  router.delete("/schedules/:scheduleId", requireAccountCapability("manage_settings"), deleteSchedule);
  router.post("/schedules/:scheduleId/toggle", requireAccountCapability("manage_settings"), toggleSchedule);

  // Guild Config routes
  router.get("/guild-config/:guildId", requireAccountCapability("manage_settings"), getGuildCommandConfig);
  router.patch("/guild-config/:guildId", requireAccountCapability("manage_settings"), updateGuildCommandConfig);

  // Whitelist management
  // Keep both the legacy routes used by the dashboard page and the newer
  // applications-based aliases so existing deployments do not break.
  router.get("/whitelist/list", requireAccountCapability("manage_settings"), listApplications);
  router.get("/whitelist/:id", requireAccountCapability("manage_settings"), getApplication);
  router.post("/whitelist/approve/:id", requireAccountCapability("manage_settings"), approveApplicationEndpoint);
  router.post("/whitelist/reject/:id", requireAccountCapability("manage_settings"), rejectApplicationEndpoint);
  router.delete("/whitelist/:id", requireAccountCapability("manage_settings"), deleteApplicationEndpoint);
  router.post("/whitelist/:id/resend", requireAccountCapability("manage_settings"), resendApplicationNotification);
  router.get("/whitelist/config/:guildId", requireAccountCapability("manage_settings"), getWhitelistConfigEndpoint);
  router.post("/whitelist/config/:guildId", requireAccountCapability("manage_settings"), saveWhitelistConfigEndpoint);

  router.get("/whitelist/applications", requireAccountCapability("manage_settings"), listApplications);
  router.get("/whitelist/applications/:id", requireAccountCapability("manage_settings"), getApplication);
  router.post("/whitelist/applications/:id/approve", requireAccountCapability("manage_settings"), approveApplicationEndpoint);
  router.post("/whitelist/applications/:id/reject", requireAccountCapability("manage_settings"), rejectApplicationEndpoint);
  router.delete("/whitelist/applications/:id", requireAccountCapability("manage_settings"), deleteApplicationEndpoint);
  router.post("/whitelist/applications/:id/resend", requireAccountCapability("manage_settings"), resendApplicationNotification);

  // Minecraft status
  router.get("/minecraft/status", getMinecraftStatus);
  router.get("/minecraft/config", requireAccountCapability("manage_settings"), getMinecraftConfigEndpoint);
  router.patch("/minecraft/config", requireAccountCapability("manage_settings"), updateMinecraftConfigEndpoint);
  router.post("/minecraft/test-alert", requireAccountCapability("manage_settings"), sendMinecraftTestAlert);

  // Knowledge Base / AI Assistant
  router.get("/knowledge-base/articles", getArticlesEndpoint);
  router.post("/knowledge-base/articles", requireAccountCapability("manage_settings"), createArticleEndpoint);
  router.put("/knowledge-base/articles/:id", requireAccountCapability("manage_settings"), updateArticleEndpoint);
  router.delete("/knowledge-base/articles/:id", requireAccountCapability("manage_settings"), deleteArticleEndpoint);

  return router;
}

module.exports = createApiRouter;
