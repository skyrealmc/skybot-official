# SKY REALM | SKY BOT S2 Dashboard

Full-stack Discord bot, admin dashboard, and API backend for the SKY REALM community. The same backend powers the internal dashboard and the public `skyrealm.fun` whitelist flow.

## Stack

- Node.js + Express
- discord.js v14
- MongoDB + Mongoose
- connect-mongo session store
- Discord OAuth2
- Vanilla JavaScript dashboard

## Features

### Core Features
- Discord OAuth2 login with session management
- **Discord Guild Membership Gate** - Restrict API and dashboard access to members of a specific server.
- **Cloudflare Turnstile Verification** - Server-side bot protection for public endpoints.
- **Improved Redirect Reliability** - Uses OAuth2 `state` for cross-domain return URLs.
- Signed-in Discord profile display with avatar
- Guild and channel selector with live sidebar navigation
- Template saving and management
- Secure API routes with session auth
- **Role and capability-based access control** (Owner/Admin/Moderator/Viewer)
- **Guild filtering** (only guilds where user has Manage Guild or Administrator)
- **Bot presence detection** per guild with invite link fallback
- **Server-side permission enforcement** on all protected APIs
- **Persistent MongoDB session storage** for production-safe auth sessions
- **Live bot status endpoint + UI indicator** for action gating
- **Per-guild operational metrics** (messages, scheduler runs, failures)
- Basic rate limiting and centralized error handling
- Analytics page for bot uptime, joined guilds, member totals, and guild breakdown
- **Clean URL routing** - Modern SaaS-style URLs without .html extensions

### Message Scheduler
- **Schedule messages** for automatic delivery at specified times
- **One-time scheduling** - Send a message at a specific date/time
- **Recurring scheduling** - Use cron expressions for repeated messages
- **Mention support** - Include @everyone, @here, roles, and channels
- **Schedule management** - View, edit, pause, resume, and delete schedules
- **Preset cron options** - Quick select for common schedules (daily, hourly, etc.)
- **Timezone support** - Schedule messages in your local timezone
- **Owner-level access control** for scheduler management

### Minecraft Integration
- **Automated Whitelisting** - Zero-touch flow: Approve an application and the bot automatically runs `/whitelist add` via Pterodactyl API.
- **Advanced Server Dashboard** - Real-time monitoring of server status and resources.
- **Minecraft-to-Discord Chat Bridge** - Live console streaming that mirrors in-game chat to a Discord channel via Pterodactyl WebSockets.
- **Auto-Cleanup Channel** - Automatically purges all messages in the chat bridge channel when the last player leaves the server.
- **Customizable Embed Templates** - Edit titles, descriptions, and **custom colors** for Online, Offline, and Restart alerts.
- **Real-time Embed Previews** - See exactly how your Minecraft alerts will look in Discord as you edit them.
- **Resource Monitoring** - Live CPU and RAM usage graphs powered by Chart.js.
- **Real-time Player List** - See who is online with Minecraft skin avatars.
- **Auto-Restart System** - Automatic recovery via Pterodactyl power actions when server goes offline.
- **Discord Alerts** - Configurable status alerts with custom GIFs, templates, and mentions.
- **Whitelist Application System** - Public application form with admin review dashboard.

### Whitelist Management Dashboard
- **Admin Review** - View, Approve, and Reject applications with one click.
- **Delete Applications** - New delete action to manage and clean up the application database.
- **Custom Embeds** - Build and customize approval/rejection notifications with real-time previews.
- **Discord Integration** - Automatically notify users and update the Minecraft server whitelist upon approval.
- **Stats & Search** - Track application counts and search for specific players by username or email.
- **Public Website Integration** - Accept whitelist applications from the external website via Discord OAuth session + guild membership gate.

## Project Structure

```text
.
├── bot                    # Discord bot core
├── controllers            # Request handlers
├── dashboard              # Web dashboard (HTML/CSS/JS)
├── middlewares            # Express middleware
├── models                 # MongoDB schemas
├── routes                 # API routes
├── server                 # Express server setup
├── services               # Business logic
├── utils                  # Utility functions
└── index.js               # Application entry point
```

## Website Integration

The public website repo at `skyrealmc.github.io` uses this backend for:

- `GET /auth/login`, `GET /auth/session`, `POST /auth/logout`
- `POST /api/whitelist/apply`

Cross-origin requests from `https://skyrealm.fun` are allowed through the Express CORS configuration. Public whitelist submissions require:

- valid Discord login session
- membership in `DISCORD_GUILD_ID`
- valid Cloudflare Turnstile token

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in required variables:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`
   - `MONGO_URI`, `SESSION_SECRET`
   - `DISCORD_GUILD_ID` (The target server for membership gating)
   - `DISCORD_INVITE_URL` (The invite link for non-members)
   - `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile secret key)
   - `PTERO_API_KEY`, `PTERO_SERVER_ID`, `PTERO_PANEL_URL`
3. (Optional) Set `APP_NAME` and `APP_TAGLINE` to customize public branding.
4. In the Discord Developer Portal, add `http://localhost:3000/auth/callback` under `OAuth2` redirect URLs for local development.
5. Invite the bot to your Discord server with `View Channels`, `Send Messages`, and `Embed Links`.
6. Start MongoDB or configure MongoDB Atlas network access.
7. Install dependencies with `npm install`.
8. Run the app with `npm run dev` or `npm start`.
9. Open `http://localhost:3000`.

## Required Discord Setup

- OAuth scopes: `identify`, `guilds`
- Bot permissions: `Send Messages`, `Embed Links`, `Add Reactions`, `View Channels`
- User permissions in target guild: `Manage Guild` or `Administrator`
- Enable `Server Members Intent` in the Discord Developer Portal for advanced features.

## Access Control Model

### Dashboard Roles
- `Owner` - full access, settings, templates, sending, analytics
- `Admin` - templates, sending, analytics
- `Moderator` - sending only
- `Viewer` - read-only

### Guild Eligibility
- Dashboard only keeps guilds where the user has `Manage Guild` or `Administrator`.
- Membership Gate enforces that users must be in the `DISCORD_GUILD_ID` server to use protected APIs.

## API Endpoints

### Authentication
- `GET /auth/login` - Redirect to Discord OAuth (supports `returnUrl`)
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/logout` - End session
- `GET /auth/session` - Get current session

### Whitelist
- `POST /api/whitelist/apply` - Submit application (Turnstile + Guild Gate required)
- `GET /api/whitelist/applications` - List applications (Admin only)
- `GET /api/whitelist/list` - Legacy alias used by the admin dashboard
- `GET /api/whitelist/:id` - Legacy application detail alias
- `POST /api/whitelist/applications/:id/approve` - Approve application (Admin only)
- `POST /api/whitelist/approve/:id` - Legacy approve alias used by the dashboard
- `POST /api/whitelist/reject/:id` - Legacy reject alias used by the dashboard
- `DELETE /api/whitelist/:id` - Legacy delete alias used by the dashboard
- `POST /api/whitelist/:id/resend` - Legacy resend alias used by the dashboard
- `GET /api/whitelist/config/:guildId` - Get per-guild whitelist notification config
- `POST /api/whitelist/config/:guildId` - Save per-guild whitelist notification config

### Messages & Schedules
- `GET /api/guilds` - List accessible guilds
- `POST /api/send-message` - Send a message
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create a new schedule

## Recent Changes (Latest)

### Added
- **Guild Membership Gate** - Enforces server membership for whitelist and dashboard access.
- **Cloudflare Turnstile Support** - Anti-bot protection for whitelist submissions.
- **Immediate Membership Verification** - Real-time status check during login.
- **Enhanced Redirect Support** - Support for `returnUrl` via OAuth `state`.

### Fixed
- Fixed session bootstrap flicker and redirect reliability.
- Improved cross-domain session handling for `skyrealm.fun`.
- Restored whitelist dashboard API compatibility after route refactor.
- Fixed whitelist config persistence for rejection templates.
- Fixed public whitelist auth handling by returning structured `AUTH_REQUIRED` errors.
