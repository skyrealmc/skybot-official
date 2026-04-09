const logger = require("../utils/logger");
const { checkCommandAccess } = require("../services/commands/commandAccessService");
const {
  incrementCommandUsage,
  incrementCommandError
} = require("../services/metricsService");

// Custom button responses
const BUTTON_RESPONSES = {
  event_interested: {
    content: "🎉 Awesome! Your interest has been recorded. We'll see you at the event!",
    ephemeral: true
  },
  event_not_interested: {
    content: "No problem! Maybe next time. 😊",
    ephemeral: true
  },
  join_server: {
    content: "🎮 Thanks for your interest! Use the link button to join our server.",
    ephemeral: true
  },
  discord_link: {
    content: "💬 Click the link button to join our Discord community!",
    ephemeral: true
  }
};

function registerInteractionHandler(client) {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isButton()) {
        const customId = interaction.customId;
        
        // Check for custom response
        const customResponse = BUTTON_RESPONSES[customId];
        if (customResponse) {
          await interaction.reply(customResponse);
          return;
        }

        // Default response for unknown buttons
        await interaction.reply({
          content: "✅ Button received! Thank you for your interaction.",
          ephemeral: true
        });
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (!interaction.inGuild()) {
          await interaction.reply({
            content: "This command can only be used in a server.",
            ephemeral: true
          });
          return;
        }

        const command = interaction.client.commands?.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: "Unknown command.",
            ephemeral: true
          });
          return;
        }

        const access = await checkCommandAccess(interaction.guildId, command);
        if (!access.ok) {
          await interaction.reply({
            content: access.reason || "This command is disabled for this server.",
            ephemeral: true
          });
          return;
        }

        try {
          await command.execute(interaction, { guildConfig: access.config });
          await incrementCommandUsage(interaction.guildId, interaction.commandName);
        } catch (commandError) {
          await incrementCommandError(interaction.guildId);
          throw commandError;
        }
      }
    } catch (error) {
      // Ignore "Interaction has already been acknowledged" errors
      if (error.code === 40060 || error.message?.includes("already been acknowledged")) {
        return;
      }

      logger.error("Interaction handling failed", error);

      if (!interaction.isRepliable()) {
        return;
      }

      const response = {
        content: "⚠️ Something went wrong while processing that interaction.",
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response).catch(() => {});
        return;
      }

      await interaction.reply(response).catch(() => {});
    }
  });
}

module.exports = registerInteractionHandler;
