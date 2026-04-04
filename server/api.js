const createApiRouter = require("../routes/apiRoutes");

function apiRouter({ client }) {
  return createApiRouter({ client });
}

module.exports = apiRouter;
