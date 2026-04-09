const mongoose = require("mongoose");

const afkSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    reason: { type: String, default: "Away", trim: true, maxlength: 300 },
    since: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("AFK", afkSchema);
