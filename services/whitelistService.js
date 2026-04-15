const WhitelistApplication = require("../models/WhitelistApplication");
const logger = require("../utils/logger");

// Validate whitelist application input
function validateWhitelistInput(data) {
  const errors = [];

  if (!data.minecraftUsername || typeof data.minecraftUsername !== "string") {
    errors.push("Minecraft username is required");
  } else if (data.minecraftUsername.length < 3 || data.minecraftUsername.length > 16) {
    errors.push("Minecraft username must be 3-16 characters");
  }

  if (!data.discordId || typeof data.discordId !== "string") {
    errors.push("Discord ID is required");
  } else if (!/^\d{17,19}$/.test(data.discordId)) {
    errors.push("Invalid Discord ID format");
  }

  if (!data.email || typeof data.email !== "string") {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (!data.age || typeof data.age !== "number") {
    errors.push("Age is required");
  } else if (data.age < 13 || data.age > 99) {
    errors.push("Age must be between 13 and 99");
  }

  return errors;
}

// Check for duplicate applications in the last 24 hours
async function checkDuplicateSubmission(discordId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await WhitelistApplication.findOne({
    discordId,
    createdAt: { $gte: oneDayAgo }
  });
  return existing;
}

// Create a new whitelist application
async function createApplication(data) {
  const errors = validateWhitelistInput(data);
  if (errors.length > 0) {
    throw {
      status: 400,
      message: errors[0],
      errors
    };
  }

  const duplicate = await checkDuplicateSubmission(data.discordId);
  if (duplicate) {
    throw {
      status: 409,
      message: "You have already submitted an application. Please wait 24 hours before submitting again."
    };
  }

  const application = new WhitelistApplication({
    minecraftUsername: data.minecraftUsername,
    discordId: data.discordId,
    email: data.email,
    age: data.age
  });

  await application.save();
  logger.info(`New whitelist application from ${data.minecraftUsername} (${data.discordId})`);
  return application;
}

// Get all applications with optional filters
async function getApplications(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  const applications = await WhitelistApplication.find(query).sort({
    createdAt: -1
  });

  return applications;
}

// Get a single application by ID
async function getApplicationById(id) {
  const application = await WhitelistApplication.findById(id);
  if (!application) {
    throw {
      status: 404,
      message: "Application not found"
    };
  }
  return application;
}

// Approve an application
async function approveApplication(id, adminId, approvalMessage = null) {
  const application = await getApplicationById(id);

  if (application.status !== "pending") {
    throw {
      status: 400,
      message: "Only pending applications can be approved"
    };
  }

  application.status = "approved";
  application.reviewedBy = adminId;
  application.reviewedAt = new Date();
  if (approvalMessage) {
    application.approvalMessage = approvalMessage;
  }

  await application.save();
  logger.info(`Application ${id} approved by ${adminId}`);
  return application;
}

// Reject an application
async function rejectApplication(id, adminId) {
  const application = await getApplicationById(id);

  if (application.status !== "pending") {
    throw {
      status: 400,
      message: "Only pending applications can be rejected"
    };
  }

  application.status = "rejected";
  application.reviewedBy = adminId;
  application.reviewedAt = new Date();

  await application.save();
  logger.info(`Application ${id} rejected by ${adminId}`);
  return application;
}

module.exports = {
  validateWhitelistInput,
  checkDuplicateSubmission,
  createApplication,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication
};
