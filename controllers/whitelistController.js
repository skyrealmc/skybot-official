const {
  createApplication,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication
} = require("../services/whitelistService");
const { sendWhitelistApproved } = require("../services/whitelistNotificationService");
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
    const { approvalMessage, notificationChannelId, notificationGuildId, assignRoleId } = req.body;
    const adminId = req.session.user?.discordId;
    const client = req.app.locals.discordClient;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const application = await approveApplication(id, adminId, approvalMessage);

    // Send Discord notification if client and channel are available
    if (client && notificationChannelId) {
      const notificationSuccess = await sendWhitelistApproved(client, application, {
        channelId: notificationChannelId,
        guildId: notificationGuildId,
        message: approvalMessage,
        roleId: assignRoleId
      });

      if (!notificationSuccess) {
        logger.warn(`Approval notification failed for application ${id}, but approval was recorded`);
      }
    }

    res.json({
      success: true,
      message: "Application approved successfully",
      application,
      notificationSent: client && notificationChannelId ? true : false
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
    const adminId = req.session.user?.discordId;

    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const application = await rejectApplication(id, adminId);

    res.json({
      success: true,
      message: "Application rejected",
      application
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error("Error rejecting application", error);
    res.status(500).json({ error: "Failed to reject application" });
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

module.exports = {
  submitApplication,
  listApplications,
  getApplication,
  approveApplicationEndpoint,
  rejectApplicationEndpoint
};
