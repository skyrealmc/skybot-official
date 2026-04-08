const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

const authRouter = require("./auth");
const apiRouter = require("./api");
const errorHandler = require("../middlewares/errorHandler");
const SchedulerService = require("../services/schedulerService");
const logger = require("../utils/logger");

function getBotAvatarUrl(user) {
  if (!user.avatar) {
    const fallbackIndex = Number(user.discriminator || 0) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

function createApp({ client }) {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const sessionMaxAgeMs = 1000 * 60 * 60 * 8;
  const hasMongoUri = Boolean(process.env.MONGO_URI);

  // Initialize scheduler service
  const scheduler = new SchedulerService(client);

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  const sessionConfig = {
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: sessionMaxAgeMs
    }
  };

  if (hasMongoUri) {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: Math.floor(sessionMaxAgeMs / 1000),
      autoRemove: "native"
    });
  } else {
    logger.warn("MONGO_URI missing: falling back to in-memory session store.");
  }

  app.use(
    session(sessionConfig)
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
    // Store scheduler reference for API access
    req.app.set("scheduler", scheduler);
    next();
  });

  app.use("/auth", authRouter({ client }));
  app.use("/api", apiRouter({ client, scheduler }));

  // Clean route redirects - redirect .html to clean routes
  app.get("/index.html", (_req, res) => {
    res.redirect(301, "/");
  });

  app.get("/analytics.html", (_req, res) => {
    res.redirect(301, "/analytics");
  });

  app.get("/scheduler.html", (_req, res) => {
    res.redirect(301, "/scheduler");
  });

  // Clean routes - serve HTML files without .html extension
  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dashboard", "index.html"));
  });

  app.get("/dashboard", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dashboard", "index.html"));
  });

  app.get("/analytics", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dashboard", "analytics.html"));
  });

  app.get("/scheduler", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dashboard", "scheduler.html"));
  });

  // Static files (CSS, JS, images, etc.)
  app.use(express.static(path.join(__dirname, "..", "dashboard")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Scheduler status endpoint
  app.get("/scheduler/status", (req, res) => {
    res.json(scheduler.getStatus());
  });

  app.use(errorHandler);

  // Start scheduler after app is ready
  setImmediate(async () => {
    try {
      await scheduler.start();
      logger.info("Scheduler initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize scheduler:", error);
    }
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await scheduler.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return app;
}

module.exports = { createApp };
