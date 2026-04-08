const Schedule = require("../models/Schedule");
const logger = require("../utils/logger");
const cron = require("node-cron");
const {
  getAccessibleGuildIds,
  getGuildAccess,
  hasCapability
} = require("../services/permissionService");

// Validate cron expression
function isValidCronExpression(expression) {
  try {
    cron.validate(expression);
    return true;
  } catch {
    return false;
  }
}

function sanitizeText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .slice(0, maxLength)
    .trim();
}

// Get all schedules for user's guilds
async function getSchedules(req, res, next) {
  try {
    const { guildId, status } = req.query;
    const allowedGuildIds = getAccessibleGuildIds(req.session, "manage_settings", {
      requireBotPresent: true
    });

    let query = { guildId: { $in: allowedGuildIds } };

    if (guildId) {
      if (!allowedGuildIds.includes(guildId)) {
        return res.status(403).json({ error: "Access denied to this guild." });
      }
      query.guildId = guildId;
    }

    if (status) {
      query.status = status;
    }

    const schedules = await Schedule.find(query)
      .sort({ nextRun: 1 })
      .lean();

    res.json(schedules);
  } catch (error) {
    logger.error("Failed to get schedules:", error);
    next(error);
  }
}

// Get single schedule
async function getSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id).lean();

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    const access = getGuildAccess(req.session, schedule.guildId);
    if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
      return res.status(403).json({ error: "Access denied to this guild." });
    }

    res.json(schedule);
  } catch (error) {
    logger.error("Failed to get schedule:", error);
    next(error);
  }
}

// Create new schedule
async function createSchedule(req, res, next) {
  try {
    const client = req.app.get("discordClient");
    if (!client?.isReady || !client.isReady()) {
      return res.status(503).json({ error: "Bot is currently offline. Scheduler creation is temporarily unavailable." });
    }

    const {
      guildId,
      channelId,
      name,
      messageType,
      payload,
      scheduleType,
      cronExpression,
      scheduledAt,
      timezone,
      maxRetries
    } = req.body;

    // Validation
    if (!guildId || !channelId || !name || !messageType || !payload) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Check if user has access to guild
    const access = getGuildAccess(req.session, guildId);
    if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
      return res.status(403).json({ error: "Access denied to this guild." });
    }

    if (!["embed", "hybrid", "components_v2"].includes(messageType)) {
      return res.status(400).json({ error: "Invalid message type." });
    }

    if (client?.isReady && client.isReady()) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || channel.guildId !== guildId) {
          return res.status(400).json({ error: "Channel does not belong to the selected guild." });
        }
      } catch {
        return res.status(400).json({ error: "Invalid or inaccessible channel." });
      }
    }

    // Validate schedule type
    if (!["one_time", "recurring"].includes(scheduleType)) {
      return res.status(400).json({ error: "Invalid schedule type." });
    }

    // Validate cron expression for recurring schedules
    if (scheduleType === "recurring" && !cronExpression) {
      return res.status(400).json({ error: "Cron expression is required for recurring schedules." });
    }

    if (scheduleType === "recurring" && !isValidCronExpression(cronExpression)) {
      return res.status(400).json({ error: "Invalid cron expression." });
    }

    // Validate scheduled date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduled date." });
    }

    // Check if date is in the past for one-time schedules
    if (scheduleType === "one_time" && scheduledDate <= new Date()) {
      return res.status(400).json({ error: "Scheduled date must be in the future." });
    }

    // Create schedule
    const schedule = await Schedule.create({
      guildId,
      channelId,
      name,
      messageType,
      payload: {
        ...payload,
        messageContent: sanitizeText(payload.messageContent, 2000)
      },
      scheduleType,
      cronExpression: scheduleType === "recurring" ? cronExpression : null,
      scheduledAt: scheduledDate,
      timezone: timezone || "UTC",
      maxRetries: maxRetries || 3,
      createdBy: req.session.user.id
    });

    res.status(201).json(schedule);
  } catch (error) {
    logger.error("Failed to create schedule:", error);
    next(error);
  }
}

// Update schedule
async function updateSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const existing = await Schedule.findById(id);

    if (!existing) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    const currentAccess = getGuildAccess(req.session, existing.guildId);
    if (!currentAccess || !currentAccess.botPresent || !hasCapability(currentAccess, "manage_settings")) {
      return res.status(403).json({ error: "Access denied to this guild." });
    }

    // Remove immutable fields from updates
    const { _id, createdAt, updatedAt, __v, ...allowedUpdates } = updates;

    if (allowedUpdates.guildId && allowedUpdates.guildId !== existing.guildId) {
      const targetAccess = getGuildAccess(req.session, allowedUpdates.guildId);
      if (!targetAccess || !targetAccess.botPresent || !hasCapability(targetAccess, "manage_settings")) {
        return res.status(403).json({ error: "Access denied to target guild." });
      }
    }

    const schedule = await Schedule.findByIdAndUpdate(id, allowedUpdates, {
      new: true,
      runValidators: true
    });

    res.json(schedule);
  } catch (error) {
    logger.error("Failed to update schedule:", error);
    next(error);
  }
}

// Delete schedule
async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await Schedule.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    const access = getGuildAccess(req.session, existing.guildId);
    if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
      return res.status(403).json({ error: "Access denied to this guild." });
    }

    await Schedule.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete schedule:", error);
    next(error);
  }
}

// Toggle schedule (pause/resume)
async function toggleSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existing = await Schedule.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    const access = getGuildAccess(req.session, existing.guildId);
    if (!access || !access.botPresent || !hasCapability(access, "manage_settings")) {
      return res.status(403).json({ error: "Access denied to this guild." });
    }

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'active' or 'paused'." });
    }

    const schedule = await Schedule.findByIdAndUpdate(id, { status }, { new: true });

    res.json(schedule);
  } catch (error) {
    logger.error("Failed to toggle schedule:", error);
    next(error);
  }
}

// Get schedule statistics
async function getScheduleStats(req, res, next) {
  try {
    const allowedGuildIds = getAccessibleGuildIds(req.session, "manage_settings", {
      requireBotPresent: true
    });

    const stats = await Schedule.aggregate([
      { $match: { guildId: { $in: allowedGuildIds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      active: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.json(result);
  } catch (error) {
    logger.error("Failed to get schedule stats:", error);
    next(error);
  }
}

module.exports = {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleStats
};
