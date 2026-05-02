const logger = require("../utils/logger");
const AFK = require("../models/AFK");
const { registerCommands } = require("./commandLoader");
const { initializeDefaultArticles } = require("../services/groqService");

function registerEventHandlers(client) {
  client.once("clientReady", async () => {
    logger.info(`Bot logged in as ${client.user.tag}`);

    try {
      await registerCommands(client.commandData || []);
    } catch (error) {
      logger.error("Slash command registration failed", error);
    }

    try {
      client.reminderService?.start();
    } catch (error) {
      logger.error("Failed to start reminder service", error);
    }

    // Initialize Groq knowledge base
    try {
      if (process.env.GROQ_API_KEY) {
        await initializeDefaultArticles();
        logger.info("Groq AI service initialized");
      } else {
        logger.warn("GROQ_API_KEY not set - AI features will be unavailable");
      }
    } catch (error) {
      logger.error("Failed to initialize Groq service", error);
    }
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    try {
      const cleared = await AFK.findOneAndDelete({
        userId: message.author.id,
        guildId: message.guild.id
      });
      if (cleared) {
        await message.reply("Welcome back, your AFK status has been removed.");
      }

      const mentionIds = [...message.mentions.users.keys()].slice(0, 5);
      if (mentionIds.length === 0) return;

      const afkEntries = await AFK.find({
        guildId: message.guild.id,
        userId: { $in: mentionIds }
      }).lean();

      for (const entry of afkEntries) {
        const since = Math.floor(new Date(entry.since).getTime() / 1000);
        const reason = entry.reason || "Away";
        await message.reply(`<@${entry.userId}> is AFK: ${reason} (since <t:${since}:R>)`);
      }
    } catch (error) {
      logger.warn(`AFK listener failed: ${error.message}`);
    }
  });

  // Groq AI mention handler
  if (process.env.GROQ_API_KEY) {
    try {
      const groqHandler = require("./eventHandlers/groqMentionHandler");
      client.on("messageCreate", (message) => groqHandler.execute(message));
    } catch (error) {
      logger.warn("Groq mention handler failed to load", error);
    }
  });
}

module.exports = registerEventHandlers;
