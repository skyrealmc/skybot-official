const {
  createApplication,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  deleteApplication
} = require("../services/whitelistService");
const {
  sendWhitelistApproved,
  sendWhitelistRejected
} = require("../services/whitelistNotificationService");
const {
  getWhitelistConfig,
  saveWhitelistConfig
} = require("../services/whitelistConfigService");
const logger = require("../utils/logger");

// POST /api/whitelist/apply
// Public endpoint - create new application
async function submitApplication(req, res) {
  try {
    const { minecraftUsername, discordId, email, age } = req.body;

    const application = await createApplication({
      minecraftUsername,
      discordId,
      email,
      age
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully. Staff will review it shortly.",
      applicationId: application._id,
      status: application.status
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error submitting whitelist application", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
}

// GET /api/whitelist/list
// Admin endpoint - list all applications with optional filter
async function listApplications(req, res) {
  try {
    const { status } = req.query;
    const filters = {};

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filters.status = status;
    }

    const applications = await getApplications(filters);

    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    logger.error("Error listing whitelist applications", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
}

// POST /api/whitelist/approve/:id
// Admin endpoint - approve an application
async function approveApplicationEndpoint(req, res) {
  try {
    const { id } = req.params;
    const { notificationGuildId, notificationChannelId } = req.body;
    const adminId = req.session.user?.id;
    const client = req.app.locals.discordClient;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const application = await approveApplication(id, adminId);

    // Auto-send Discord notification using provided channel or saved config
    let notificationSent = false;
    if (client && notificationGuildId) {
      try {
        let channelId = notificationChannelId;
        let roleId = null;
        let embedTemplate = null;

        // If no channel ID provided, try to load from config
        if (!channelId) {
          const config = await getWhitelistConfig(notificationGuildId);
          if (config && config.channelId) {
            channelId = config.channelId;
            roleId = config.roleId;
            embedTemplate = config.embedTemplate;
          }
        } else {
          // If channel ID was provided, still try to load template from config
          const config = await getWhitelistConfig(notificationGuildId);
          if (config) {
            roleId = config.roleId;
            embedTemplate = config.embedTemplate;
          }
        }

        if (channelId) {
          const notificationSuccess = await sendWhitelistApproved(client, application, {
            channelId,
            guildId: notificationGuildId,
            roleId,
            embedTemplate
          });

          notificationSent = notificationSuccess;
          if (!notificationSuccess) {
            logger.warn(`Approval notification failed for application ${id}, but approval was recorded`);
          }
        }
      } catch (configError) {
        logger.warn(`Could not load config for guild ${notificationGuildId}:`, configError.message);
      }
    }

    res.json({
      success: true,
      message: "Application approved successfully",
      application,
      notificationSent
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error approving application", error);
    res.status(500).json({ error: "Failed to approve application" });
  }
}

// POST /api/whitelist/reject/:id
// Admin endpoint - reject an application
async function rejectApplicationEndpoint(req, res) {
  try {
    const { id } = req.params;
    const { notificationGuildId, notificationChannelId } = req.body;
    const adminId = req.session.user?.id;
    const client = req.app.locals.discordClient;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const application = await rejectApplication(id, adminId);

    // Auto-send Discord rejection notification using provided channel or saved config
    let notificationSent = false;
    if (client && notificationGuildId) {
      try {
        let channelId = notificationChannelId;
        let embedTemplate = null;

        // If no channel ID provided, try to load from config
        if (!channelId) {
          const config = await getWhitelistConfig(notificationGuildId);
          if (config && config.channelId) {
            channelId = config.channelId;
            embedTemplate = config.rejectionTemplate;
          }
        } else {
          // If channel ID was provided, still try to load template from config
          const config = await getWhitelistConfig(notificationGuildId);
          if (config) {
            embedTemplate = config.rejectionTemplate;
          }
        }

        if (channelId) {
          const notificationSuccess = await sendWhitelistRejected(client, application, {
            channelId,
            guildId: notificationGuildId,
            embedTemplate
          });

          notificationSent = notificationSuccess;
          if (!notificationSuccess) {
            logger.warn(`Rejection notification failed for application ${id}, but rejection was recorded`);
          }
        }
      } catch (configError) {
        logger.warn(`Could not load config for guild ${notificationGuildId}:`, configError.message);
      }
    }

    res.json({
      success: true,
      message: "Application rejected successfully",
      application,
      notificationSent
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error rejecting application", error);
    res.status(500).json({ error: "Failed to reject application" });
  }
}

// DELETE /api/whitelist/:id
// Admin endpoint - delete an application
async function deleteApplicationEndpoint(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.session.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await deleteApplication(id, adminId);

    res.json({
      success: true,
      message: "Application deleted successfully"
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error deleting application", error);
    res.status(500).json({ error: "Failed to delete application" });
  }
}

// POST /api/whitelist/:id/resend
// Admin endpoint - resend notification for an approved application
async function resendApplicationNotification(req, res) {
  try {
    const { id } = req.params;
    const { notificationGuildId, notificationChannelId } = req.body;
    const adminId = req.session.user?.id;
    const client = req.app.locals.discordClient;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!notificationGuildId) {
      return res.status(400).json({ error: "Guild ID is required" });
    }

    const application = await getApplicationById(id);

    if (application.status !== "approved") {
      return res.status(400).json({ error: "Only approved applications can have notifications resent" });
    }

    // Resend Discord notification using provided channel or saved config
    let notificationSent = false;
    if (client) {
      try {
        let channelId = notificationChannelId;
        let roleId = null;
        let embedTemplate = null;

        // If no channel ID provided, try to load from config
        if (!channelId) {
          const config = await getWhitelistConfig(notificationGuildId);
          if (config && config.channelId) {
            channelId = config.channelId;
            roleId = config.roleId;
            embedTemplate = config.embedTemplate;
          }
        } else {
          // If channel ID was provided, still try to load template from config
          const config = await getWhitelistConfig(notificationGuildId);
          if (config) {
            roleId = config.roleId;
            embedTemplate = config.embedTemplate;
          }
        }

        if (channelId) {
          const notificationSuccess = await sendWhitelistApproved(client, application, {
            channelId,
            guildId: notificationGuildId,
            roleId,
            embedTemplate
          });

          notificationSent = notificationSuccess;
          if (!notificationSuccess) {
            return res.status(500).json({ error: "Failed to send notification - bot may not have permission to send messages" });
          }
        } else {
          return res.status(400).json({ error: "No configuration found for this guild" });
        }
      } catch (configError) {
        logger.error(`Could not resend notification:`, configError);
        return res.status(500).json({ error: "Failed to load guild configuration" });
      }
    } else {
      return res.status(500).json({ error: "Discord client not available" });
    }

    res.json({
      success: true,
      message: "Notification resent successfully",
      notificationSent
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error resending notification", error);
    res.status(500).json({ error: "Failed to resend notification" });
  }
}

// GET /api/whitelist/:id
// Get a single application (admin only)
async function getApplication(req, res) {
  try {
    const { id } = req.params;
    const application = await getApplicationById(id);

    res.json({
      success: true,
      application
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error fetching application", error);
    res.status(500).json({ error: "Failed to fetch application" });
  }
}

// GET /api/whitelist/config/:guildId
// Get whitelist embed config for a guild
async function getWhitelistConfigEndpoint(req, res) {
  try {
    const { guildId } = req.params;
    const config = await getWhitelistConfig(guildId);

    res.json({
      success: true,
      config: config || {
        guildId,
        embedTemplate: {
          title: "✅ Whitelist Application Approved",
          description: "Welcome to Sky Realms SMP! Your whitelist application has been approved.",
          color: "#28a745",
          footer: "Sky Realms SMP",
          author: "Whitelist System",
          includeTimestamp: true
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching whitelist config", error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
}

// POST /api/whitelist/config/:guildId
// Save whitelist embed config for a guild
// POST /api/whitelist/config/:guildId
// Admin endpoint - save whitelist config (approval and rejection templates)
async function saveWhitelistConfigEndpoint(req, res) {
  try {
    const { guildId } = req.params;
    const adminId = req.session.user?.id;
    const { channelId, embedTemplate, rejectionTemplate, roleId } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID is required" });
    }

    const configData = {
      channelId,
      roleId
    };

    if (embedTemplate) {
      configData.embedTemplate = embedTemplate;
    }

    if (rejectionTemplate) {
      configData.rejectionTemplate = rejectionTemplate;
    }

    const config = await saveWhitelistConfig(guildId, adminId, configData);

    res.json({
      success: true,
      message: "Whitelist config saved successfully",
      config
    });
  } catch (error) {
    logger.error("Error saving whitelist config", error);
    res.status(500).json({ error: "Failed to save config" });
  }
}

module.exports = {
  submitApplication,
  listApplications,
  getApplication,
  approveApplicationEndpoint,
  rejectApplicationEndpoint,
  deleteApplicationEndpoint,
  resendApplicationNotification,
  getWhitelistConfigEndpoint,
  saveWhitelistConfigEndpoint
};
