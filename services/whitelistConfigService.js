const WhitelistConfig = require("../models/WhitelistConfig");
const logger = require("../utils/logger");

/**
 * Get whitelist config for a guild
 */
async function getWhitelistConfig(guildId) {
  try {
    const config = await WhitelistConfig.findOne({ guildId });
    return config;
  } catch (error) {
    logger.error(`Error fetching whitelist config for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Save or update whitelist config for a guild
 */
async function saveWhitelistConfig(guildId, configData, adminId = null) {
  try {
    const { channelId, embedTemplate, rejectionTemplate, roleId } = configData;

    if (!channelId) {
      throw new Error("Channel ID is required");
    }

    const update = {
      guildId,
      channelId,
      embedTemplate: embedTemplate || {},
      rejectionTemplate: rejectionTemplate || {},
      roleId,
      updatedAt: new Date()
    };

    if (adminId) {
      update.adminId = adminId;
    }

    const config = await WhitelistConfig.findOneAndUpdate(
      { guildId },
      update,
      { upsert: true, new: true }
    );

    logger.info(`Whitelist config saved for guild ${guildId} by admin ${adminId}`);
    return config;
  } catch (error) {
    logger.error(`Error saving whitelist config for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Delete whitelist config for a guild
 */
async function deleteWhitelistConfig(guildId) {
  try {
    await WhitelistConfig.deleteOne({ guildId });
    logger.info(`Whitelist config deleted for guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting whitelist config for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Get all configs for an admin
 */
async function getAdminConfigs(adminId) {
  try {
    const configs = await WhitelistConfig.find({ adminId });
    return configs;
  } catch (error) {
    logger.error(`Error fetching configs for admin ${adminId}:`, error);
    throw error;
  }
}

module.exports = {
  getWhitelistConfig,
  saveWhitelistConfig,
  deleteWhitelistConfig,
  getAdminConfigs
};
