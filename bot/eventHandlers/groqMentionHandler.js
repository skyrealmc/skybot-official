const { ChannelType, EmbedBuilder } = require("discord.js");
const { generateResponse } = require("../services/groqService");
const logger = require("../utils/logger");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    const client = message.client;
    const botUser = client.user;

    try {
      // Check if bot is mentioned or it's a DM
      const isMentioned = message.mentions.has(botUser);
      const isDM = message.channel.type === ChannelType.DM;

      if (!isMentioned && !isDM) return;

      // Ignore commands (those starting with /)
      if (message.content.startsWith("/")) return;

      // Extract the question (remove mention if present)
      let question = message.content.trim();

      if (isMentioned) {
        // Remove mention from the beginning
        const mention = `<@${botUser.id}>`;
        question = question.replace(mention, "").trim();

        // Also handle with exclamation
        if (question.length === 0) {
          return message.reply({
            content: `Hey ${message.author.username}! 👋 Use **\`/ask <question>\`** to ask me anything about Sky Realms SMP!`
          });
        }
      }

      // Validate question
      if (!question || question.length === 0) {
        return message.reply({
          content: "Please ask a question! Example: `@bot What's the whitelist application process?`"
        });
      }

      if (question.length > 1000) {
        return message.reply({
          content: "Question is too long (max 1000 characters). Please ask a shorter question!"
        });
      }

      // Show typing indicator
      await message.channel.sendTyping();

      logger.info(`[MENTION] ${message.author.username} in ${isDM ? "DM" : message.guildId}: ${question}`);

      // Generate response
      const result = await generateResponse(question, {
        username: message.author.username,
        userId: message.author.id,
        guildId: isDM ? null : message.guildId,
        channelName: isDM ? "DM" : message.channel.name
      });

      if (!result.success) {
        return message.reply({
          content: result.reply
        });
      }

      // Create embed for response
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({
          name: "Sky Realms Community Assistant",
          iconURL: client.user.avatarURL()
        })
        .setDescription(result.reply)
        .setFooter({
          text: `Asked by ${message.author.username}`,
          iconURL: message.author.avatarURL()
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

      // Split message if too long (Discord limit)
      if (result.reply.length > 2000) {
        await message.reply({ content: result.reply.slice(0, 2000) });
        // Send continuation if needed
        const remaining = result.reply.slice(2000);
        if (remaining.length > 0) {
          await message.reply({ content: remaining });
        }
      } else {
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error("Error in mention handler:", error);
      message.reply({
        content: "❌ An error occurred processing your question. Please try `/ask` instead or contact staff.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
