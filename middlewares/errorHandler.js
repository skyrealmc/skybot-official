const logger = require("../utils/logger");

function errorHandler(error, _req, res, _next) {
  logger.error(error.message, error);

  const status = error.statusCode || 500;
  res.status(status).json({
    error: error.message || "Internal server error."
  });
}

module.exports = errorHandler;
