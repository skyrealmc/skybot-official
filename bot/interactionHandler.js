const logger = require("../utils/logger");

function registerInteractionHandler(client) {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isButton()) {
        await interaction.reply({
          content: `Button pressed: ${interaction.customId}`,
          ephemeral: true
        });
        return;
      }

      if (interaction.isChatInputCommand()) {
        await interaction.reply({
          content: `Received command: ${interaction.commandName}`,
          ephemeral: true
        });
      }
    } catch (error) {
      logger.error("Interaction handling failed", error);

      if (!interaction.isRepliable()) {
        return;
      }

      const response = {
        content: "Something went wrong while processing that interaction.",
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
