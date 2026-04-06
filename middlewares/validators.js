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

function validateComponentV2Item(item) {
  const allowedTypes = ["text", "image", "button", "separator", "media"];
  if (!allowedTypes.includes(item.type)) {
    throw createError(`Invalid component type: ${item.type}`);
  }

  if (item.type === "button" && !item.label) {
    throw createError("Button component requires a label.");
  }

  if ((item.type === "image" || item.type === "media") && !item.url) {
    throw createError(`${item.type} component requires a URL.`);
  }
}

function validateContainer(container) {
  if (container.type !== "container") {
    throw createError("Container must have type 'container'.");
  }

  if (!Array.isArray(container.children)) {
    throw createError("Container must have a children array.");
  }

  container.children.forEach(validateComponentV2Item);
}

function validateEmbedRequest(payload) {
  if (!payload.guildId || !payload.channelId) {
    throw createError("Guild and channel are required.");
  }

  const messageType = payload.messageType || "embed";
  if (!["embed", "hybrid", "v2"].includes(messageType)) {
    throw createError("Invalid message type. Must be 'embed', 'hybrid', or 'v2'.");
  }

  // For embed and hybrid modes, embedData is required
  if (messageType === "embed" || messageType === "hybrid") {
    if (!payload.embedData || typeof payload.embedData !== "object") {
      throw createError("embedData is required for embed and hybrid message types.");
    }
  }

  // For v2 mode, componentsV2 is required
  if (messageType === "v2") {
    if (!payload.componentsV2 || !Array.isArray(payload.componentsV2)) {
      throw createError("componentsV2 is required for v2 message type.");
    }

    if (payload.componentsV2.length === 0) {
      throw createError("componentsV2 must contain at least one container.");
    }

    payload.componentsV2.forEach(validateContainer);
  }

  // Validate buttons (used in embed and hybrid modes)
  const buttons = payload.buttons || [];
  if (!Array.isArray(buttons)) {
    throw createError("buttons must be an array.");
  }

  buttons.forEach(validateButton);

  // Validate mentions
  const mentions = payload.mentions || [];
  if (!Array.isArray(mentions)) {
    throw createError("mentions must be an array.");
  }

  mentions.forEach(validateMention);

  // Validate reactions
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

function validateMessage(payload) {
  // Alias for validateEmbedRequest for backward compatibility
  validateEmbedRequest(payload);
}

module.exports = {
  validateEmbedRequest,
  validateMessage
};
