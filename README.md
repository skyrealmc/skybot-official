# SKY REALM | SKY BOT S2 Dashboard

Full-stack Discord bot, admin dashboard, and public-facing backend for the SKY REALM community. This repository powers Discord OAuth, dashboard management, whitelist review, Minecraft monitoring, slash commands, and the public whitelist flow used by `skyrealm.fun`.

## Stack

- Node.js + Express
- discord.js v14
- MongoDB + Mongoose
- Discord OAuth2 + `express-session` + `connect-mongo`
- Vanilla JavaScript dashboard UI
- Pterodactyl API integration for Minecraft automation

## Core Features

### Dashboard & Access Control
- Discord OAuth login with Mongo-backed sessions
- Capability-based access model: `owner`, `admin`, `moderator`, `viewer`
- Guild filtering based on Discord `Manage Guild` or `Administrator`
- Bot presence detection with invite fallback for missing guild installs
- Protected API routes with account-level and guild-level permission checks
- Analytics, scheduler, templates, and message builder pages

### Messaging & Templates
- Rich message/embed builder
- Template save, duplicate, rename, import/export, and send flows
- Backend payload validation and guild-bound channel checks

### Scheduler & Reminders
- One-time and recurring scheduled messages
- Persistent schedule recovery across restarts
- Retry/failure tracking
- Reminder service integrated with slash commands

### Slash Commands
- Modular command loader under `bot/commands/`
- Moderation commands: `ban`, `kick`, `timeout`, `untimeout`, `warn`
- Utility commands: `userinfo`, `serverinfo`, `avatar`, `roleinfo`, `poll`, `remind`, `afk`, `status`
- Admin command: `embed`
- Per-guild command configuration support

### Whitelist System
- Public whitelist apply endpoint with rate limiting
- Discord login requirement for submissions
- Guild membership gate via `DISCORD_GUILD_ID`
- Cloudflare Turnstile verification
- Admin whitelist dashboard with search, filters, approve/reject/delete, and resend notification
- Per-guild approval/rejection embed templates
- Optional Minecraft whitelist automation through Pterodactyl command execution

### Minecraft Integration
- Bedrock server monitor with online/offline/restart detection
- Discord alert delivery with customizable templates, GIFs, and mentions
- Auto-restart with cooldown protection
- Live status available in dashboard and `/status` slash command

## Architecture

```text
.
├── bot/             Discord client, interaction handlers, slash commands
├── controllers/     HTTP handlers grouped by feature
├── dashboard/       Admin dashboard pages and frontend assets
├── middlewares/     Auth, access control, and error middleware
├── models/          Mongoose schemas
├── routes/          Auth and API routers
├── server/          Express app composition
├── services/        Business logic, monitoring, scheduler, metrics, whitelist
├── utils/           Shared helpers and logger
└── index.js         Application entrypoint
```

## Public Website Integration

The public website repository `skyrealmc.github.io` uses this backend for:

- `GET /auth/login`
- `GET /auth/session`
- `POST /auth/logout`
- `POST /api/whitelist/apply`

Cross-origin requests from `https://skyrealm.fun` are allowed by the backend CORS configuration. Public whitelist submissions require:

- a valid Discord login session
- membership in the configured Discord guild
- a valid Cloudflare Turnstile token

## Setup

1. Copy `.env.example` to `.env`.
2. Configure required values:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`
   - `MONGO_URI`, `SESSION_SECRET`
   - `DISCORD_GUILD_ID`, `DISCORD_INVITE_URL`
   - `TURNSTILE_SECRET_KEY`
   - `PTERO_API_KEY`, `PTERO_SERVER_ID`, `PTERO_PANEL_URL`
3. Optional branding:
   - `APP_NAME`, `APP_TAGLINE`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run locally:
   ```bash
   npm run dev
   ```
6. Production start:
   ```bash
   npm start
   ```

## Key API Endpoints

### Auth
- `GET /auth/login`
- `GET /auth/callback`
- `GET /auth/session`
- `POST /auth/logout`

### Dashboard
- `GET /api/guilds`
- `POST /api/send-message`
- `GET /api/templates`
- `GET /api/schedules`
- `GET /api/analytics`

### Whitelist
- `POST /api/whitelist/apply`
- `GET /api/whitelist/applications`
- `POST /api/whitelist/applications/:id/approve`
- `POST /api/whitelist/applications/:id/reject`
- `DELETE /api/whitelist/applications/:id`
- `POST /api/whitelist/applications/:id/resend`
- Legacy dashboard aliases remain supported for the current whitelist admin page.

### Minecraft
- `GET /api/minecraft/status`
- `GET /api/minecraft/config`
- `PATCH /api/minecraft/config`
- `POST /api/minecraft/test-alert`

## Development Notes

- Code style follows CommonJS with 2-space indentation.
- Prefer feature-aligned naming across routes, controllers, and services.
- No formal test suite is configured yet; minimum verification should include:
  - `node --check` on edited JS files
  - local boot via `npm run dev`
  - manual route/UI validation for the touched feature
- Never trust frontend-supplied `guildId`, `channelId`, or role IDs; validate on the backend.
- Do not commit `.env` or secret values.

## Operational Notes

- `COMMAND_GUILD_ID` can be used for faster guild-scoped slash command registration in development.
- The VPS deploy workflow lives in `.github/workflows/deploy.yml`.
- The public website repo contains static marketing pages; this repo is the live backend and internal dashboard.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
