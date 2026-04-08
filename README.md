# SKY REALM | SKY BOT S2 Dashboard

Full-stack Discord bot and web dashboard for the official SKY REALM Minecraft community. Built for SKY BOT S2 with creator credit to chriz3656.

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
- Signed-in Discord profile display with avatar
- Guild and channel selector with live sidebar navigation
- Template saving and management
- Secure API routes with session auth
- **Role and capability-based access control** (Owner/Admin/Moderator/Viewer)
- **Guild filtering** (only guilds where user has Manage Guild or Administrator)
- **Bot presence detection** per guild with invite link fallback
- **Server-side permission enforcement** on all protected APIs
- **Persistent MongoDB session storage** for production-safe auth sessions
- Basic rate limiting and centralized error handling
- Analytics page for bot uptime, joined guilds, member totals, and guild breakdown
- **Clean URL routing** - Modern SaaS-style URLs without .html extensions

### Message Scheduler (NEW)
- **Schedule messages** for automatic delivery at specified times
- **One-time scheduling** - Send a message at a specific date/time
- **Recurring scheduling** - Use cron expressions for repeated messages
- **Mention support** - Include @everyone, @here, roles, and channels
- **Schedule management** - View, edit, pause, resume, and delete schedules
- **Preset cron options** - Quick select for common schedules (daily, hourly, etc.)
- **Timezone support** - Schedule messages in your local timezone
- **Owner-level access control** for scheduler management

### Hybrid Message Builder
- **Three-column layout** with left sidebar, center builder, and right preview
- **Tab-based interface** with Embed, Components, Components V2, and Settings tabs
- **Quick templates** for common use cases (Server Online/Offline, Events)
- **Live preview** with Builder/Discord view toggle
- **Message type selection**: Embed Only, Hybrid, or Components V2

#### Embed Tab
- Title, description, color picker
- Author, footer, image, thumbnail
- Timestamp toggle

#### Components Tab
- Add buttons (link / interaction)
- Button styles (Primary, Secondary, Success, Danger, Link)
- Emoji support for buttons
- Up to 5 buttons per row

#### Components V2 Tab
- Add container blocks
- Add text sections
- Add media sections (image/gif)
- Add separators
- Nest buttons inside containers
- Flexible layout ordering

#### Settings Tab
- Message content (text above embed)
- Mentions (@everyone, @here, roles, members, channels)
- Channel and guild selection
- Reactions (emoji reactions to add after sending)

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

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, `MONGO_URI`, and `SESSION_SECRET`.
3. In the Discord Developer Portal, add `http://localhost:3000/auth/callback` under `OAuth2` redirect URLs for local development.
4. Invite the bot to your Discord server with `View Channels`, `Send Messages`, and `Embed Links`.
5. Start MongoDB or configure MongoDB Atlas network access.
6. Install dependencies with `npm install`.
7. Run the app with `npm run dev` or `npm start`.
8. Open `http://localhost:3000`.

## Required Discord Setup

- OAuth scopes: `identify`, `guilds`
- Bot permissions:
  - `Send Messages`
  - `Embed Links`
- Recommended bot permissions:
  - `Add Reactions`
  - `View Channels`
- User permissions in target guild:
  - `Manage Guild` or `Administrator`
- For member mention selection:
  - enable `Server Members Intent` in the Discord Developer Portal under `Bot`

## Access Control Model

### Dashboard Roles
- `Owner` - full access, settings, templates, sending, analytics
- `Admin` - templates, sending, analytics
- `Moderator` - sending only
- `Viewer` - read-only

### Guild Eligibility
- User guilds are fetched from Discord OAuth.
- Dashboard only keeps guilds where the user has `Manage Guild` or `Administrator`.
- If the bot is not in a guild, the guild is marked unavailable and the UI provides an invite link.

### Enforcement
- The frontend only reflects permissions and never acts as the security boundary.
- Every protected API validates:
  - authenticated session
  - guild access
  - required capability
  - bot presence (for guild actions)
- Unauthorized requests are rejected with `401`, `403`, or `409` where appropriate.

## API Endpoints

### Authentication
- `GET /auth/login` - Redirect to Discord OAuth
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/logout` - End session
- `GET /auth/session` - Get current session

### Messages
- `GET /api/guilds` - List accessible guilds
- `GET /api/channels/:guildId` - List channels in a guild
- `GET /api/resources/:guildId` - Get guild resources (channels, roles, members)
- `GET /api/analytics` - Get bot analytics (`view_analytics` required)
- `POST /api/send-message` - Send a message (`send_messages` required)
- `POST /api/validate-message` - Validate message payload (`send_messages` required)

### Templates
- `POST /api/save-template` - Save a message template (`manage_templates` required)
- `POST /api/import-template` - Import a template (`manage_templates` required)
- `GET /api/templates` - List user's templates (`manage_templates` required)
- `GET /api/templates/:templateId/export` - Export template (`manage_templates` required)
- `PATCH /api/templates/:templateId/rename` - Rename template (`manage_templates` required)
- `DELETE /api/templates/:templateId` - Delete template (`manage_templates` required)
- `POST /api/templates/:templateId/duplicate` - Duplicate template (`manage_templates` required)

### Schedules
- `GET /api/schedules` - List all schedules (`manage_settings` required)
- `GET /api/schedules/stats` - Get schedule statistics (`manage_settings` required)
- `GET /api/schedules/:id` - Get a specific schedule (`manage_settings` required)
- `POST /api/schedules` - Create a new schedule (`manage_settings` required)
- `PUT /api/schedules/:id` - Update a schedule (`manage_settings` required)
- `DELETE /api/schedules/:id` - Delete a schedule (`manage_settings` required)
- `POST /api/schedules/:id/toggle` - Pause/resume a schedule (`manage_settings` required)
- `GET /scheduler/status` - Get scheduler service status

## Message Types

### 1. Embed Only
Traditional Discord embed with optional buttons:
```json
{
  "messageType": "embed",
  "embedData": { "title": "Hello", "description": "World" },
  "buttons": []
}
```

### 2. Hybrid
Embed combined with components:
```json
{
  "messageType": "hybrid",
  "embedData": { "title": "Hello", "description": "World" },
  "buttons": [{ "type": "link", "label": "Click", "url": "https://..." }]
}
```

### 3. Components V2
Container-based layout without embed:
```json
{
  "messageType": "v2",
  "componentsV2": [
    {
      "type": "container",
      "children": [
        { "type": "text", "content": "Hello World" },
        { "type": "button", "label": "Click Me", "style": "Primary" }
      ]
    }
  ]
}
```

## Notes

- The bot login is skipped if `DISCORD_TOKEN` is empty.
- The scheduler startup is skipped if `DISCORD_TOKEN` is empty.
- The database connection is skipped if `MONGO_URI` is empty.
- Session storage uses MongoDB (`connect-mongo`) when `MONGO_URI` is set; otherwise it falls back to in-memory sessions for local/dev only.
- Interaction buttons currently reply with a simple ephemeral confirmation and are ready for custom behavior.
- Empty button rows are ignored before save/send so unfinished slots do not trigger validation errors.
- The bot startup uses the current `clientReady` event name for discord.js compatibility.
- If `Server Members Intent` is disabled or member fetch times out, member mention options are limited but the dashboard still works.
- The real dashboard is intended to run through the Express server, not directly from the filesystem.
- A separate isolated demo sandbox exists in `dashboard/demo/` and is excluded from git.

## Recent Changes (Latest)

### Added
- **Message Scheduler System** - Full scheduling engine with cron support
- **Clean URL Routing** - URLs like `/`, `/analytics`, `/scheduler` instead of `.html` files
- **Mention Support in Scheduler** - @everyone, @here, roles, and channels
- **Schedule Management API** - Full CRUD operations for schedules
- **Scheduler Dashboard UI** - Dedicated page for managing scheduled messages
- **SaaS-grade access control** - role/capability checks for UI and API
- **Guild bot-presence validation** - unavailable guild handling + invite flow

### Fixed
- Form validation issues with hidden required fields
- Session structure compatibility in schedule controller
- Module loading issues in scheduler JavaScript
- Scheduler recurring runtime issue with undefined next-run helper
- Frontend escaping issues in dashboard scripts
- Discord.js scheduler readiness listener now uses `clientReady` to avoid v15 deprecation warnings
- Production session warning addressed by replacing default `MemoryStore` with Mongo-backed sessions

## Deployment (Railway)

1. Connect your GitHub repository to Railway
2. Add the required environment variables:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `REDIRECT_URI` (your production URL)
   - `MONGO_URI` (MongoDB Atlas connection string)
   - `SESSION_SECRET` (long random string)
3. Deploy!

## License

ISC
