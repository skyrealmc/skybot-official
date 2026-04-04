const createAuthRouter = require("../routes/authRoutes");

function authRouter() {
  return createAuthRouter();
}

module.exports = authRouter;
