const mongoose = require("mongoose");

const minecraftConfigSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "global", unique: true, index: true },
    serverAddress: { type: String, default: "" },
    guildId: { type: String, default: "" },
    channelId: { type: String, default: "" },
    alertsEnabled: { type: Boolean, default: true },
    mentionType: {
      type: String,
      enum: ["everyone", "here", "role", "custom"],
      default: "everyone"
    },
    mentionRoleId: { type: String, default: "" },
    mentionCustom: { type: String, default: "@everyone" },
    gifs: {
      online: { type: String, default: "" },
      offline: { type: String, default: "" },
      restart: { type: String, default: "" }
    },
    joinUrl: { type: String, default: "https://skyrealm.fun" },
    autoRestartEnabled: { type: Boolean, default: true },
    restartCooldownMs: { type: Number, default: 120000, min: 10000, max: 3600000 },
    updatedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MinecraftConfig", minecraftConfigSchema);
