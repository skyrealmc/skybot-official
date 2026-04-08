const cron = require("node-cron");
const Schedule = require("../models/Schedule");
const logger = require("../utils/logger");
const {
  buildEmbedPayload,
  buildButtonRows,
  buildComponentsV2Payload,
  buildComponentsV2Content,
  buildOutgoingContent,
  sendHybridMessage
} = require("./discordService");

class SchedulerService {
  constructor(client) {
    this.client = client;
    this.cronJobs = new Map();
    this.isRunning = false;
    this.checkInterval = null;
  }

  // Initialize and start the scheduler
  async start() {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    if (!process.env.DISCORD_TOKEN) {
      logger.warn("Scheduler start skipped because DISCORD_TOKEN is missing.");
      return;
    }

    logger.info("Starting scheduler service...");
    this.isRunning = true;

    // Wait for client to be ready
    if (!this.client.isReady()) {
      logger.info("Waiting for Discord client to be ready...");
      await new Promise(resolve => {
        this.client.once("ready", () => {
          logger.info("Discord client is ready");
          resolve();
        });
      });
    }

    // Load all active schedules
    await this.loadActiveSchedules();

    // Check for due schedules every minute
    this.checkInterval = setInterval(() => this.checkDueSchedules(), 60000);

    logger.info("Scheduler service started");
  }

  // Stop the scheduler
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping scheduler service...");
    this.isRunning = false;

    // Clear all cron jobs
    this.cronJobs.forEach((job, scheduleId) => {
      job.stop();
    });
    this.cronJobs.clear();

    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info("Scheduler service stopped");
  }

  // Load all active schedules from database
  async loadActiveSchedules() {
    try {
      const activeSchedules = await Schedule.find({ status: "active" }).lean();
      logger.info(`Loading ${activeSchedules.length} active schedules`);

      for (const schedule of activeSchedules) {
        this.registerSchedule(schedule);
      }
    } catch (error) {
      logger.error("Failed to load active schedules:", error);
    }
  }

  // Register a schedule (create cron job or schedule one-time execution)
  registerSchedule(schedule) {
    try {
      if (schedule.scheduleType === "recurring" && schedule.cronExpression) {
        // Create cron job for recurring schedules
        const job = cron.schedule(schedule.cronExpression, async () => {
          await this.executeSchedule(schedule._id.toString());
        }, {
          timezone: schedule.timezone,
          scheduled: true
        });

        this.cronJobs.set(schedule._id.toString(), job);
        logger.info(`Registered recurring schedule: ${schedule.name} (${schedule.cronExpression})`);
      } else {
        // For one-time schedules, we'll check them in the checkDueSchedules method
        logger.info(`Registered one-time schedule: ${schedule.name} (scheduled for ${schedule.scheduledAt})`);
      }
    } catch (error) {
      logger.error(`Failed to register schedule ${schedule._id}:`, error);
    }
  }

  // Unregister a schedule
  unregisterSchedule(scheduleId) {
    const job = this.cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      this.cronJobs.delete(scheduleId);
      logger.info(`Unregistered schedule: ${scheduleId}`);
    }
  }

  // Check for due one-time schedules
  async checkDueSchedules() {
    if (!this.isRunning) return;

    try {
      const dueSchedules = await Schedule.getDueSchedules();

      for (const schedule of dueSchedules) {
        // Skip if already being executed
        if (this.cronJobs.has(schedule._id.toString())) {
          continue;
        }

        await this.executeSchedule(schedule._id.toString());
      }
    } catch (error) {
      logger.error("Failed to check due schedules:", error);
    }
  }

  // Execute a schedule (send the message)
  async executeSchedule(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        logger.warn(`Schedule ${scheduleId} not found, removing from cron jobs`);
        this.unregisterSchedule(scheduleId);
        return;
      }

      if (schedule.status !== "active") {
        logger.warn(`Schedule ${scheduleId} is not active (status: ${schedule.status})`);
        return;
      }

      logger.info(`Executing schedule: ${schedule.name} (${scheduleId})`);

      // Get the channel
      const channel = await this.client.channels.fetch(schedule.channelId);
      if (!channel) {
        logger.error(`Channel ${schedule.channelId} not found for schedule ${scheduleId}`);
        await schedule.incrementRetry();
        return;
      }

      // Check if we have permission to send messages
      if (!channel.isTextBased()) {
        logger.error(`Channel ${schedule.channelId} is not text-based`);
        await schedule.incrementRetry();
        return;
      }

      // Send the message based on message type
      await this.sendMessage(channel, schedule);

      // Update schedule
      await schedule.markRan();
      logger.info(`Successfully executed schedule: ${schedule.name}`);

    } catch (error) {
      logger.error(`Failed to execute schedule ${scheduleId}:`, error);

      // Increment retry count
      try {
        const schedule = await Schedule.findById(scheduleId);
        if (schedule) {
          await schedule.incrementRetry();
          if (schedule.status === "failed") {
            logger.error(`Schedule ${scheduleId} marked as failed after ${schedule.maxRetries} retries`);
          }
        }
      } catch (retryError) {
        logger.error(`Failed to update schedule ${scheduleId} after error:`, retryError);
      }
    }
  }

  // Send message using existing discordService pipeline
  async sendMessage(channel, schedule) {
    const { messageType, payload } = schedule;

    // Reuse existing message building functions from discordService
    const content = buildOutgoingContent({
      messageContent: payload.messageContent,
      mentions: payload.mentions || []
    });

    // Build embed if needed
    let embed = null;
    if (messageType === "embed" || messageType === "hybrid") {
      embed = buildEmbedPayload(payload.embedData || {});
    }

    // Build components based on message type
    let components = [];
    if (messageType === "embed" || messageType === "hybrid") {
      components = buildButtonRows(payload.buttons || []);
    } else if (messageType === "components_v2") {
      components = buildComponentsV2Payload(payload.componentsV2 || []);
      const v2Content = buildComponentsV2Content(payload.componentsV2 || []);
      if (v2Content) {
        // Append V2 content to existing content
        const originalContent = content || "";
        return sendHybridMessage(this.client, {
          channelId: channel.id,
          content: originalContent ? `${originalContent}\n${v2Content}` : v2Content,
          embed: null,
          components,
          componentsV2: [],
          messageType,
          reactions: payload.reactions || []
        });
      }
    }

    // Use the existing sendHybridMessage function
    return sendHybridMessage(this.client, {
      channelId: channel.id,
      content,
      embed,
      components,
      componentsV2: [],
      messageType,
      reactions: payload.reactions || []
    });
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      clientReady: this.client?.isReady() || false
    };
  }
}

module.exports = SchedulerService;
