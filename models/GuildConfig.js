const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    enabledCommands: { type: [String], default: [] },
    modLogChannel: { type: String, default: "" },
    featureFlags: {
      moderationEnabled: { type: Boolean, default: true },
      utilityEnabled: { type: Boolean, default: true },
      adminEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
