const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const path = require("path");

const authRouter = require("./auth");
const apiRouter = require("./api");
const errorHandler = require("../middlewares/errorHandler");

function getBotAvatarUrl(user) {
  if (!user.avatar) {
    const fallbackIndex = Number(user.discriminator || 0) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

function createApp({ client }) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 8
      }
    })
  );

  // Store bot info in session for easy access
  app.use((req, res, next) => {
    if (client && client.user) {
      req.session.bot = {
        id: client.user.id,
        username: client.user.username,
        discriminator: client.user.discriminator,
        avatarUrl: getBotAvatarUrl(client.user)
      };
    }
    next();
  });

  app.use("/auth", authRouter());
  app.use("/api", apiRouter({ client }));
  app.use(express.static(path.join(__dirname, "..", "dashboard")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
