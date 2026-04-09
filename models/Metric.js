const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    messagesSent: { type: Number, default: 0 },
    schedulerExecutions: { type: Number, default: 0 },
    schedulerFailures: { type: Number, default: 0 },
    moderationActions: { type: Number, default: 0 },
    commandErrors: { type: Number, default: 0 },
    commandUsage: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Metric", metricSchema);
