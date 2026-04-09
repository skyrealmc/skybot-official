const Reminder = require("../models/Reminder");
const logger = require("../utils/logger");

class ReminderService {
  constructor(client) {
    this.client = client;
    this.interval = null;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.processDueReminders().catch((error) => {
        logger.error("Reminder processing failed", error);
      });
    }, 30000);
    logger.info("Reminder service started");
  }

  stop() {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    logger.info("Reminder service stopped");
  }

  async processDueReminders() {
    if (!this.client?.isReady || !this.client.isReady()) return;

    const due = await Reminder.find({
      status: "pending",
      dueAt: { $lte: new Date() }
    }).limit(20);

    for (const reminder of due) {
      try {
        const channel = await this.client.channels.fetch(reminder.channelId);
        if (!channel || !("send" in channel)) {
          reminder.status = "failed";
          await reminder.save();
          continue;
        }

        await channel.send({
          content: `<@${reminder.userId}> Reminder: ${reminder.message}`
        });

        reminder.status = "sent";
        reminder.sentAt = new Date();
        await reminder.save();
      } catch (error) {
        reminder.status = "failed";
        await reminder.save();
        logger.warn(`Reminder ${reminder.id} failed: ${error.message}`);
      }
    }
  }
}

module.exports = ReminderService;
