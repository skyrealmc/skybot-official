# Copilot Instructions for SKY BOT S2 Dashboard

## Project Overview

A full-stack Discord bot and web dashboard built with Node.js + Express, discord.js v14, and MongoDB. The system consists of:
- **Dashboard**: Web interface for message building, scheduling, analytics, and **whitelist management**
- **Discord Bot**: Slash commands (moderation, utility, admin) with per-guild configuration
- **Scheduler**: Cron-based message scheduling with timezone support
- **Whitelist System**: Application submission, admin approval workflow, Discord notifications
- **API**: RESTful backend with capability-based access control

## Build, Test & Lint Commands

```bash
npm install          # Install dependencies
npm start           # Run production server (node index.js)
npm run dev         # Run with auto-reload (nodemon)
```

**Note**: There are currently no test or lint scripts configured. Tests should be run manually with a test runner if added. The project uses standard JavaScript conventions without a linter.

## High-Level Architecture

### Core Modules
- **`bot/`** - Discord bot client, command loader, and interaction handlers
  - `client.js` - Discord client initialization
  - `commandLoader.js` - Dynamic command registration (slash commands)
  - `eventHandler.js` - Event listeners for bot lifecycle
  - `interactionHandler.js` - Handles slash command executions
  - `commands/` - Command definitions organized by category (moderation, utility, admin)

- **`services/`** - Business logic and integrations
  - `schedulerService.js` - Cron scheduler for scheduled messages
  - `discordService.js` - Discord API utilities (embeds, components, message sending)
  - `permissionService.js` - Role/capability evaluation
  - `databaseService.js` - MongoDB connection management
  - `discordAuthService.js` - OAuth2 flow
  - `metricsService.js`, `moderationLogService.js`, etc. - Domain-specific services

- **`controllers/`** - Request handlers for API endpoints
  - `authController.js` - Login, logout, session
  - `scheduleController.js` - Schedule CRUD
  - `templateController.js` - Message template management
  - `guildConfigController.js` - Per-guild command configuration
  - `embedController.js` - Message sending and validation

- **`routes/`** - API and auth route definitions
  - `apiRoutes.js` - All `/api/*` endpoints with middleware chains
  - `authRoutes.js` - `/auth/*` OAuth flow

- **`server/app.js`** - Express server setup, middleware, and route mounting
- **`middlewares/`** - Express middleware
  - `accessControl.js` - `requireAccountCapability()` and `requireGuildCapability()` middleware
  - `requireAuth.js`, `requireRole.js` - Session and role validation
  - `validators.js` - Input validation helpers
  - `errorHandler.js` - Error response formatting

- **`models/`** - Mongoose schemas
  - `User.js` - User profiles with global roles and per-guild roles
  - `Schedule.js` - Scheduled message definitions
  - `Template.js` - Message templates
  - `GuildConfig.js` - Per-guild settings (command toggles, feature flags, mod-log channel)
  - `Metric.js` - Operational metrics (sent messages, scheduler runs, command usage)
  - `AFK.js`, `Reminder.js`, `Warning.js` - Feature-specific models

- **`dashboard/`** - Frontend HTML/CSS/JS (served statically)
  - `app.js` - Main dashboard SPA entry point
  - `scheduler.js` - Scheduler UI logic
  - `analytics.js` - Analytics UI logic

## Key Conventions

### Access Control
- **Authentication**: Express sessions backed by MongoDB in production (`connect-mongo`), in-memory in dev
- **Capability Model**: Users have global roles (owner, admin, moderator, viewer) and can have per-guild role overrides
- **Enforcement**: All protected routes use middleware (`requireAccountCapability()`, `requireGuildCapability()`)
- **Guild Filtering**: Dashboard only shows guilds where user has `Manage Guild` or `Administrator` Discord permission
- **Patterns**:
  ```js
  // Account-level permission (applies across all guilds)
  router.post('/api/templates', 
    requireAuth, 
    requireAccountCapability('manage_templates'), 
    controller);

  // Guild-level permission (scoped to specific guild)
  router.post('/api/send-message',
    requireAuth,
    requireGuildCapability('send_messages', { source: 'body', key: 'guildId' }),
    controller);
  ```

### Message Building
- **Message Types**: "embed" (traditional embed), "hybrid" (embed + buttons), "v2" (container-based components)
- **Button Handling**: Buttons stored as arrays; empty slots ignored before save
- **Message Validation**: `validateMessage()` in validators sanitizes payloads server-side
- **Sending**: `sendHybridMessage()` in `discordService.js` handles all message type variants

### Scheduler
- **Engine**: `node-cron` for cron expressions
- **Execution**: Tracks running jobs in a Map to prevent duplicates
- **Failure Handling**: Retry backoff for failed one-time jobs; metrics tracked per guild
- **Ready Check**: Waits for `clientReady` event (discord.js v14+ compatible) before starting
- **Gating**: Message sending blocked while bot is offline (checked via `GET /api/bot-status`)

### Database & Models
- **Connection**: `mongoose.connect()` in `connectDatabase()` service
- **Sessions**: Stored in `sessions` collection if `MONGO_URI` set; sessions auto-TTL
- **Metrics**: Aggregated by guildId (messages sent, scheduler runs, command usage)
- **Guild Config**: Allows per-guild command enable/disable and feature flags

### Slash Commands
- **Registration**: `commandLoader.js` dynamically loads commands from `bot/commands/` folders
- **Config Validation**: Commands check `GuildConfig` before execution
- **Moderation Logging**: Moderation commands log to guild's configured mod-log channel if set
- **Per-Guild Metrics**: Command usage and errors tracked in Metric model

### Frontend (Dashboard)
- **Clean URLs**: Routes like `/`, `/analytics`, `/scheduler`, `/whitelist` (no `.html` extensions)
- **SPA Pattern**: Single HTML file with tab-based navigation
- **API Communication**: All data via `/api/*` endpoints; frontend never handles permissions
- **UI State**: Guild/channel selectors sync with backend; bot status gating for actions
- **Whitelist Management**: Admin dashboard at `/whitelist` for reviewing and approving applications

### Whitelist System (NEW)
- **Public Form** (`dashboard/whitelist/whitelist.html`): User submission for whitelist applications
- **Admin Dashboard** (`dashboard/whitelist.html`): Review, filter, approve/reject applications
- **MongoDB Model** (`models/WhitelistApplication.js`): Store application data
- **API Endpoints** (`routes/apiRoutes.js`):
  - `POST /api/whitelist/apply` - Public form submission
  - `GET /api/whitelist/list` - Admin: list applications (filterable by status)
  - `GET /api/whitelist/:id` - Admin: view application details
  - `POST /api/whitelist/approve/:id` - Admin: approve with optional message
  - `POST /api/whitelist/reject/:id` - Admin: reject application
- **Discord Notifications** (`services/whitelistNotificationService.js`): Auto-send approval embeds to Discord
- **Duplicate Prevention**: 24-hour window per Discord ID to prevent spam

### Error Handling
- **Status Codes**: `401` (unauthenticated), `403` (insufficient permission), `409` (bot not present)
- **Response Format**: Consistent `{ error: "message" }` structure
- **Logging**: Winston logger in `utils/logger.js` for all significant events

### Environment Variables
- **Required**: `DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `MONGO_URI`, `SESSION_SECRET`
- **Optional**: `REDIRECT_URI` (defaults to `http://localhost:3000/auth/callback`), `PORT`, `APP_NAME`, `APP_TAGLINE`, `COMMAND_GUILD_ID`
- **Graceful Degradation**: Bot login and scheduler skip if `DISCORD_TOKEN` missing; sessions fallback to in-memory if `MONGO_URI` missing

## Development Notes

- **Nodemon**: Watches `index.js` and auto-restarts on changes
- **Session TTL**: Default 8 hours; matches MongoDB session collection TTL
- **Bot Intents**: Server Members Intent required for member mention selection in message builder
- **Rate Limiting**: Global rate limiting enabled; sensitive actions have stricter limits
- **Discord.js v14**: Uses `clientReady` event (not `ready` for v15 compatibility)
