const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    moderatorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warning", warningSchema);
