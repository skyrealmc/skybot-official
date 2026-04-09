const { Client, GatewayIntentBits, Partials } = require("discord.js");
const registerEventHandlers = require("./eventHandler");
const registerInteractionHandler = require("./interactionHandler");
const { loadCommands } = require("./commandLoader");
const ReminderService = require("../services/reminderService");

function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
  });

  const commandData = loadCommands(client);
  client.commandData = commandData;
  client.reminderService = new ReminderService(client);

  registerEventHandlers(client);
  registerInteractionHandler(client);

  return client;
}

module.exports = { createDiscordClient };
