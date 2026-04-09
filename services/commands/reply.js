const { MessageFlags } = require("discord.js");

function normalizeInteractionPayload(payload = {}) {
  if (!Object.prototype.hasOwnProperty.call(payload, "ephemeral")) {
    return payload;
  }

  const { ephemeral, flags, ...rest } = payload;
  if (!ephemeral) {
    return { ...rest, flags };
  }

  const nextFlags = flags === undefined ? MessageFlags.Ephemeral : flags | MessageFlags.Ephemeral;
  return { ...rest, flags: nextFlags };
}

async function safeReply(interaction, payload) {
  const normalized = normalizeInteractionPayload(payload);
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(normalized);
  }
  return interaction.reply(normalized);
}

module.exports = {
  safeReply,
  normalizeInteractionPayload
};
