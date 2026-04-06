const logger = require("../utils/logger");

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
        await interaction.reply({
          content: `⚙️ Command received: ${interaction.commandName}`,
          ephemeral: true
        });
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
