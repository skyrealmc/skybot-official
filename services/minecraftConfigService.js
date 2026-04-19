const MinecraftConfig = require("../models/MinecraftConfig");

function buildEnvDefaults() {
  return {
    singleton: "global",
    serverAddress: String(process.env.MC_SERVER_ADDRESS || "").trim(),
    guildId: "",
    channelId: "",
    alertsEnabled: true,
    mentionType: "everyone",
    mentionRoleId: "",
    mentionCustom: "@everyone",
    gifs: {
      online: "",
      offline: "",
      restart: ""
    },
    joinUrl: "https://skyrealm.fun",
    autoRestartEnabled: true,
    restartCooldownMs: 120000
  };
}

function normalizeConfig(docOrObject) {
  if (!docOrObject) return null;
  const raw = docOrObject.toObject ? docOrObject.toObject() : docOrObject;
  return {
    serverAddress: raw.serverAddress || "",
    guildId: raw.guildId || "",
    channelId: raw.channelId || "",
    alertsEnabled: raw.alertsEnabled !== false,
    mentionType: raw.mentionType || "everyone",
    mentionRoleId: raw.mentionRoleId || "",
    mentionCustom: raw.mentionCustom || "@everyone",
    gifs: {
      online: raw.gifs?.online || "",
      offline: raw.gifs?.offline || "",
      restart: raw.gifs?.restart || ""
    },
    joinUrl: raw.joinUrl || "https://skyrealm.fun",
    autoRestartEnabled: raw.autoRestartEnabled !== false,
    restartCooldownMs: Number(raw.restartCooldownMs || 120000),
    updatedBy: raw.updatedBy || "",
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null
  };
}

async function getMinecraftConfig() {
  let config = await MinecraftConfig.findOne({ singleton: "global" });
  if (!config) {
    config = await MinecraftConfig.create(buildEnvDefaults());
  }
  return normalizeConfig(config);
}

async function updateMinecraftConfig(updates = {}, updatedBy = "") {
  const setValues = {};

  if (updates.serverAddress !== undefined) {
    setValues.serverAddress = String(updates.serverAddress || "").trim();
  }
  if (updates.guildId !== undefined) {
    setValues.guildId = String(updates.guildId || "").trim();
  }
  if (updates.channelId !== undefined) {
    setValues.channelId = String(updates.channelId || "").trim();
  }
  if (updates.alertsEnabled !== undefined) {
    setValues.alertsEnabled = Boolean(updates.alertsEnabled);
  }
  if (updates.mentionType !== undefined) {
    setValues.mentionType = String(updates.mentionType || "everyone").trim().toLowerCase();
  }
  if (updates.mentionRoleId !== undefined) {
    setValues.mentionRoleId = String(updates.mentionRoleId || "").trim();
  }
  if (updates.mentionCustom !== undefined) {
    setValues.mentionCustom = String(updates.mentionCustom || "").trim();
  }
  if (updates.gifs && typeof updates.gifs === "object") {
    setValues.gifs = {
      online: String(updates.gifs.online || "").trim(),
      offline: String(updates.gifs.offline || "").trim(),
      restart: String(updates.gifs.restart || "").trim()
    };
  }
  if (updates.joinUrl !== undefined) {
    setValues.joinUrl = String(updates.joinUrl || "https://skyrealm.fun").trim();
  }
  if (updates.autoRestartEnabled !== undefined) {
    setValues.autoRestartEnabled = Boolean(updates.autoRestartEnabled);
  }
  if (updates.restartCooldownMs !== undefined) {
    setValues.restartCooldownMs = Number(updates.restartCooldownMs || 120000);
  }

  if (updatedBy) {
    setValues.updatedBy = updatedBy;
  }

  const config = await MinecraftConfig.findOneAndUpdate(
    { singleton: "global" },
    { $set: setValues },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return normalizeConfig(config);
}

function getMentionText(config) {
  const mentionType = String(config?.mentionType || "everyone").toLowerCase();
  if (mentionType === "here") return "@here";
  if (mentionType === "role" && config?.mentionRoleId) return `<@&${config.mentionRoleId}>`;
  if (mentionType === "custom" && config?.mentionCustom) return config.mentionCustom;
  return "@everyone";
}

module.exports = {
  getMinecraftConfig,
  updateMinecraftConfig,
  getMentionText
};
