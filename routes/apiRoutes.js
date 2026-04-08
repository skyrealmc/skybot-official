const express = require("express");
const rateLimit = require("express-rate-limit");

const requireAuth = require("../middlewares/requireAuth");
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

  router.use(globalLimiter);
  router.use(requireAuth);

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
  router.get("/schedules/:id", requireAccountCapability("manage_settings"), getSchedule);
  router.post("/schedules", scheduleCreateLimiter, requireGuildCapability("manage_settings", { source: "body" }), createSchedule);
  router.put("/schedules/:id", requireAccountCapability("manage_settings"), updateSchedule);
  router.delete("/schedules/:id", requireAccountCapability("manage_settings"), deleteSchedule);
  router.post("/schedules/:id/toggle", requireAccountCapability("manage_settings"), toggleSchedule);

  return router;
}

module.exports = createApiRouter;
