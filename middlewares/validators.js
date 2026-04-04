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
}

module.exports = {
  validateEmbedRequest
};
