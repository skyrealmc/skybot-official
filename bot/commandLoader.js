const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const logger = require("../utils/logger");

function getCommandFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getCommandFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function loadCommands(client) {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    client.commands = new Map();
    logger.warn("Commands folder not found. No slash commands loaded.");
    return [];
  }
  const commandFiles = getCommandFiles(commandsPath);

  client.commands = new Map();
  const commandData = [];

  for (const file of commandFiles) {
    delete require.cache[require.resolve(file)];
    const command = require(file);

    if (!command?.data || typeof command.execute !== "function") {
      logger.warn(`Skipping invalid command module: ${file}`);
      continue;
    }

    const name = command.data.name;
    client.commands.set(name, command);
    commandData.push(command.data.toJSON());
  }

  logger.info(`Loaded ${client.commands.size} slash command(s)`);
  return commandData;
}

async function registerCommands(commandData) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;

  if (!token || !clientId) {
    logger.warn("Skipping slash command registration: DISCORD_TOKEN or CLIENT_ID missing.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const guildId = process.env.COMMAND_GUILD_ID;

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
    logger.info(`Registered ${commandData.length} guild slash command(s) for ${guildId}`);
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commandData });
  logger.info(`Registered ${commandData.length} global slash command(s)`);
}

module.exports = {
  loadCommands,
  registerCommands
};
