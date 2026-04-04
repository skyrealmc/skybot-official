require("dotenv").config();

const { createDiscordClient } = require("./bot/client");
const { connectDatabase } = require("./services/databaseService");
const { createApp } = require("./server/app");
const logger = require("./utils/logger");

async function bootstrap() {
  await connectDatabase(process.env.MONGO_URI);

  const client = createDiscordClient();
  const app = createApp({ client });
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    logger.info(`Dashboard listening on port ${port}`);
  });

  if (!process.env.DISCORD_TOKEN) {
    logger.warn("DISCORD_TOKEN is missing. Bot login skipped.");
    return;
  }

  await client.login(process.env.DISCORD_TOKEN);
}

bootstrap().catch((error) => {
  logger.error("Startup failure", error);
  process.exit(1);
});
