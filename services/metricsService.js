const Metric = require("../models/Metric");
const logger = require("../utils/logger");

async function incrementMetric(guildId, field, amount = 1) {
  if (!guildId) return;
  try {
    await Metric.findOneAndUpdate(
      { guildId },
      { $inc: { [field]: amount } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    logger.warn(`Failed to increment metric ${field} for guild ${guildId}: ${error.message}`);
  }
}

async function incrementMessageSent(guildId) {
  await incrementMetric(guildId, "messagesSent", 1);
}

async function incrementSchedulerExecution(guildId) {
  await incrementMetric(guildId, "schedulerExecutions", 1);
}

async function incrementSchedulerFailure(guildId) {
  await incrementMetric(guildId, "schedulerFailures", 1);
}

async function getGuildMetricsMap(guildIds = []) {
  if (!Array.isArray(guildIds) || guildIds.length === 0) {
    return new Map();
  }

  const records = await Metric.find({ guildId: { $in: guildIds } }).lean();
  return new Map(records.map((record) => [record.guildId, record]));
}

module.exports = {
  incrementMessageSent,
  incrementSchedulerExecution,
  incrementSchedulerFailure,
  getGuildMetricsMap
};
