const createApiRouter = require("../routes/apiRoutes");

function apiRouter({ client, scheduler }) {
  return createApiRouter({ client, scheduler });
}

module.exports = apiRouter;
