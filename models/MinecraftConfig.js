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
    templates: {
      online: {
        title: { type: String, default: "🟢 Server is Online!" },
        description: { type: String, default: "Sky Realm SMP is now LIVE 🚀\n\nClick below to join now!" },
        color: { type: String, default: "#22c55e" }
      },
      offline: {
        title: { type: String, default: "🔴 Server Offline" },
        description: { type: String, default: "Server is currently offline.\nAuto-recovery system is attempting restart..." },
        color: { type: String, default: "#ef4444" }
      },
      restart: {
        title: { type: String, default: "🔁 Server Restarted" },
        description: { type: String, default: "Server has restarted successfully.\nYou can now join again!" },
        color: { type: String, default: "#f59e0b" }
      }
    },
    joinUrl: { type: String, default: "https://skyrealm.fun" },
    autoRestartEnabled: { type: Boolean, default: true },
    restartCooldownMs: { type: Number, default: 120000, min: 10000, max: 3600000 },
    chatBridgeEnabled: { type: Boolean, default: false },
    chatBridgeChannelId: { type: String, default: "" },
    updatedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MinecraftConfig", minecraftConfigSchema);
