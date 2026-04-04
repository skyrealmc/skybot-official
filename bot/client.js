const { Client, GatewayIntentBits, Partials } = require("discord.js");
const registerEventHandlers = require("./eventHandler");
const registerInteractionHandler = require("./interactionHandler");

function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
  });

  registerEventHandlers(client);
  registerInteractionHandler(client);

  return client;
}

module.exports = { createDiscordClient };
