const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { generateResponse } = require("../../../services/groqService");
const logger = require("../../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the community assistant about Sky Realms SMP")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question about the server, whitelist, rules, or anything else")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const question = interaction.options.getString("question");

      // Validate question length
      if (question.length > 1000) {
        await interaction.reply({
          content: "❌ Question is too long (max 1000 characters). Please ask a shorter question!",
          flags: 64
        });
        return;
      }

      logger.info(`[ASK] ${interaction.user.username}: ${question}`);

      // Show thinking message
      await interaction.reply({
        content: "🤔 Thinking...",
        flags: 0
      });

      // Generate response with Groq
      const result = await generateResponse(question, {
        username: interaction.user.username,
        userId: interaction.user.id,
        guildId: interaction.guildId
      });

      if (!result.success) {
        await interaction.editReply({
          content: result.reply
        });
        return;
      }

      // Create embed for response
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({
          name: "Sky Realms Community Assistant",
          iconURL: interaction.client.user.avatarURL()
        })
        .setDescription(result.reply)
        .setFooter({
          text: `Asked by ${interaction.user.username}`,
          iconURL: interaction.user.avatarURL()
        })
        .setTimestamp();

      // Add source articles if available
      if (result.sourceArticles && result.sourceArticles.length > 0) {
        const sources = result.sourceArticles
          .map(a => `• **${a.title}** (${a.category})`)
          .join("\n");
        embed.addFields({
          name: "📚 Sources",
          value: sources,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Error in ask command:", error);
      
      try {
        // Only reply if we haven't already
        if (!interaction.replied) {
          await interaction.reply({
            content: "❌ An error occurred while processing your question. Please try again later.",
            flags: 64
          });
        } else {
          // If we already replied, edit the reply
          await interaction.editReply({
            content: "❌ An error occurred while processing your question. Please try again later."
          });
        }
      } catch (e) {
        logger.error("Failed to send error reply:", e);
      }
    }
  }
};
