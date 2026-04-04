const logger = require("../utils/logger");

function registerEventHandlers(client) {
  client.once("clientReady", () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
  });
}

module.exports = registerEventHandlers;
