const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    messagesSent: { type: Number, default: 0 },
    schedulerExecutions: { type: Number, default: 0 },
    schedulerFailures: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Metric", metricSchema);
