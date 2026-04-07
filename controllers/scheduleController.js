const Schedule = require("../models/Schedule");
const logger = require("../utils/logger");
const cron = require("node-cron");

// Validate cron expression
function isValidCronExpression(expression) {
  try {
    cron.validate(expression);
    return true;
  } catch {
    return false;
  }
}

// Get all schedules for user's guilds
async function getSchedules(req, res, next) {
  try {
    const { guildId, status } = req.query;
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    let query = { guildId: { $in: userGuilds } };

    if (guildId) {
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
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    const schedule = await Schedule.findOne({
      _id: id,
      guildId: { $in: userGuilds }
    }).lean();

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found." });
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
    const userGuilds = (req.session.guilds || []).map(g => g.id);
    if (!userGuilds.includes(guildId)) {
      return res.status(403).json({ error: "Access denied to this guild." });
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
      payload,
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
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    // Remove immutable fields from updates
    const { _id, createdAt, updatedAt, __v, ...allowedUpdates } = updates;

    const schedule = await Schedule.findOneAndUpdate(
      { _id: id, guildId: { $in: userGuilds } },
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found." });
    }

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
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    const schedule = await Schedule.findOneAndDelete({
      _id: id,
      guildId: { $in: userGuilds }
    });

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found." });
    }

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
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'active' or 'paused'." });
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: id, guildId: { $in: userGuilds } },
      { status },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    res.json(schedule);
  } catch (error) {
    logger.error("Failed to toggle schedule:", error);
    next(error);
  }
}

// Get schedule statistics
async function getScheduleStats(req, res, next) {
  try {
    const userGuilds = (req.session.guilds || []).map(g => g.id);

    const stats = await Schedule.aggregate([
      { $match: { guildId: { $in: userGuilds } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      active: 0,
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