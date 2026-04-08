const createAuthRouter = require("../routes/authRoutes");

function authRouter({ client }) {
  return createAuthRouter({ client });
}

module.exports = authRouter;
