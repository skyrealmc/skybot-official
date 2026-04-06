const express = require("express");
const rateLimit = require("express-rate-limit");

const requireAuth = require("../middlewares/requireAuth");
const {
  getGuilds,
  getChannels,
  getGuildResources,
  getAnalytics,
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

function createApiRouter({ client }) {
  const router = express.Router();
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.use(limiter);
  router.use(requireAuth);

  router.get("/guilds", getGuilds);
  router.get("/analytics", getAnalytics({ client }));
  router.get("/channels/:guildId", getChannels({ client }));
  router.get("/resources/:guildId", getGuildResources({ client }));
  router.post("/send-message", sendMessage({ client }));
  router.post("/validate-message", validateMessagePayload);

  // Template routes
  router.post("/save-template", saveTemplate);
  router.post("/import-template", importTemplate);
  router.get("/templates", getTemplates);
  router.get("/templates/:templateId/export", exportTemplate);
  router.patch("/templates/:templateId/rename", renameTemplate);
  router.delete("/templates/:templateId", deleteTemplate);
  router.post("/templates/:templateId/duplicate", duplicateTemplate);

  return router;
}

module.exports = createApiRouter;
