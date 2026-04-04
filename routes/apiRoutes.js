const express = require("express");
const rateLimit = require("express-rate-limit");

const requireAuth = require("../middlewares/requireAuth");
const {
  getGuilds,
  getChannels,
  sendEmbed
} = require("../controllers/embedController");
const {
  saveTemplate,
  getTemplates
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
  router.get("/channels/:guildId", getChannels({ client }));
  router.post("/send-embed", sendEmbed({ client }));
  router.post("/save-template", saveTemplate);
  router.get("/templates", getTemplates);

  return router;
}

module.exports = createApiRouter;
