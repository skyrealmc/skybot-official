const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDatabase(mongoUri) {
  if (!mongoUri) {
    logger.warn("MONGO_URI is missing. Database connection skipped.");
    return;
  }

  await mongoose.connect(mongoUri);
  logger.info("MongoDB connected");
}

module.exports = { connectDatabase };
