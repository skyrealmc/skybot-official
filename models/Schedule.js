const mongoose = require("mongoose");

function getRecurringNextRun() {
  // Recurring schedules are executed by active in-memory cron jobs.
  // Keep nextRun fresh for UI sorting without relying on external cron parsers.
  return new Date(Date.now() + 60 * 1000);
}

const scheduleSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true
    },
    channelId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    messageType: {
      type: String,
      enum: ["embed", "hybrid", "components_v2"],
      required: true
    },
    payload: {
      type: Object,
      required: true
    },
    scheduleType: {
      type: String,
      enum: ["one_time", "recurring"],
      required: true,
      default: "one_time"
    },
    cronExpression: {
      type: String,
      default: null
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: "UTC"
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "failed"],
      default: "active",
      index: true
    },
    lastRun: {
      type: Date,
      default: null
    },
    nextRun: {
      type: Date,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient querying of active schedules
scheduleSchema.index({ status: 1, nextRun: 1 });
scheduleSchema.index({ guildId: 1, status: 1 });

// Pre-save middleware to calculate nextRun
scheduleSchema.pre("save", function (next) {
  if (this.isModified("scheduledAt") || this.isModified("cronExpression") || this.isModified("scheduleType")) {
    if (this.scheduleType === "one_time") {
      this.nextRun = this.scheduledAt;
    } else if (this.scheduleType === "recurring" && this.cronExpression) {
      this.nextRun = getRecurringNextRun();
    }
  }
  next();
});

// Instance method to mark as completed (for one-time schedules)
scheduleSchema.methods.markCompleted = function () {
  this.status = "completed";
  this.lastRun = new Date();
  return this.save();
};

// Instance method to update after successful run
scheduleSchema.methods.markRan = function () {
  this.lastRun = new Date();
  this.retryCount = 0;

  if (this.scheduleType === "recurring" && this.cronExpression) {
    this.nextRun = getRecurringNextRun();
  } else {
    this.status = "completed";
  }

  return this.save();
};

// Instance method to increment retry count
scheduleSchema.methods.incrementRetry = function () {
  this.retryCount += 1;
  if (this.retryCount >= this.maxRetries) {
    this.status = "failed";
  }
  return this.save();
};

// Static method to get active schedules due for execution
scheduleSchema.statics.getDueSchedules = function () {
  const now = new Date();
  return this.find({
    status: "active",
    nextRun: { $lte: now }
  }).lean();
};

// Static method to get upcoming schedules
scheduleSchema.statics.getUpcomingSchedules = function (guildId, limit = 10) {
  const query = guildId ? { guildId, status: "active" } : { status: "active" };
  return this.find(query)
    .sort({ nextRun: 1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model("Schedule", scheduleSchema);
