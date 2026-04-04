const logger = require("../utils/logger");

function registerEventHandlers(client) {
  client.once("ready", () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
  });
}

module.exports = registerEventHandlers;
