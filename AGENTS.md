# Repository Guidelines

## Project Structure & Module Organization
`index.js` is the entrypoint. Server composition lives in `server/`, HTTP handlers in `controllers/`, business logic in `services/`, middleware in `middlewares/`, and MongoDB schemas in `models/`. Discord runtime code is in `bot/`, with slash commands grouped under `bot/commands/admin`, `moderation`, and `utility`. Frontend assets live in `dashboard/`; the public whitelist form is split between `dashboard/whitelist/` and `dashboard/whitelist.html`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local development with `nodemon index.js`.
- `npm start`: run the production entrypoint.
- `node --check path/to/file.js`: preferred syntax smoke test for touched files before commit.

There is no formal test runner configured yet, so contributors should at minimum boot the app locally and exercise the affected route/page.

## Coding Style & Naming Conventions
Use CommonJS (`require`/`module.exports`) and 2-space indentation, matching the existing code. Keep file names descriptive and lower camel case for modules such as `whitelistController.js` or `minecraftConfigService.js`. Use `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for true constants, and keep route/controller/service names aligned by feature. Prefer small, single-purpose services and route-level permission checks over inline logic.

## Testing Guidelines
No Jest, Mocha, or other framework is currently set up. For now:
- run `node --check` on edited JS files,
- verify `npm run dev` boots cleanly,
- manually test affected API endpoints and dashboard pages,
- validate permission-sensitive changes with both authorized and unauthorized sessions.

If you add automated tests later, place them near the feature or under a top-level `tests/` directory and name them `*.test.js`.

## Commit & Pull Request Guidelines
Recent history follows concise Conventional Commit-style prefixes such as `feat:`, `fix:`, `docs:`, and `chore(minecraft):`. Keep commit messages imperative and scoped when helpful, for example `fix(whitelist): persist rejection template`.

PRs should include:
- a short summary of user-visible changes,
- any required env/config updates,
- screenshots for dashboard UI changes,
- manual verification notes for routes, Discord flows, or scheduler/Minecraft behavior.

## Security & Configuration Tips
Never commit secrets from `.env`. Treat `DISCORD_TOKEN`, OAuth credentials, Mongo URI, and Pterodactyl API keys as private. Any route that accepts `guildId`, `channelId`, or role IDs must validate them server-side against session access; do not trust the frontend.
