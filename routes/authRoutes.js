const express = require("express");

const {
  login,
  callback,
  logout,
  getSession
} = require("../controllers/authController");

function createAuthRouter({ client } = {}) {
  const router = express.Router();

  router.get("/login", login);
  router.get("/callback", callback({ client }));
  router.post("/logout", logout);
  router.get("/session", getSession);

  return router;
}

module.exports = createAuthRouter;
