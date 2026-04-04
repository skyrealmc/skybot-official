function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateButton(button) {
  if (!button.label || typeof button.label !== "string") {
    throw createError("Each button requires a label.");
  }

  if (button.type === "link" && !button.url) {
    throw createError("Link buttons require a url.");
  }

  if (button.type === "interaction" && !button.customId) {
    throw createError("Interaction buttons require a customId.");
  }
}

function validateMention(mention) {
  const allowedTypes = ["member", "role", "channel", "everyone", "here"];
  if (!allowedTypes.includes(mention.type)) {
    throw createError("Mention type is invalid.");
  }

  if (["member", "role", "channel"].includes(mention.type) && !mention.id) {
    throw createError(`Mention type ${mention.type} requires an id.`);
  }
}

function validateEmbedRequest(payload) {
  if (!payload.guildId || !payload.channelId) {
    throw createError("Guild and channel are required.");
  }

  if (!payload.embedData || typeof payload.embedData !== "object") {
    throw createError("embedData is required.");
  }

  const buttons = payload.buttons || [];
  if (!Array.isArray(buttons)) {
    throw createError("buttons must be an array.");
  }

  buttons.forEach(validateButton);

  const mentions = payload.mentions || [];
  if (!Array.isArray(mentions)) {
    throw createError("mentions must be an array.");
  }

  mentions.forEach(validateMention);

  const reactions = payload.reactions || [];
  if (!Array.isArray(reactions)) {
    throw createError("reactions must be an array.");
  }

  reactions.forEach((reaction) => {
    if (!reaction || typeof reaction !== "string") {
      throw createError("Each reaction must be a non-empty string.");
    }
  });
}

module.exports = {
  validateEmbedRequest
};
