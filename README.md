# SKY REALM | SKY BOT S2 Dashboard

Full-stack Discord bot and web dashboard for the official SKY REALM Minecraft community. Built for SKY BOT S2 with creator credit to chriz3656.

## Stack

- Node.js + Express
- discord.js v14
- MongoDB + Mongoose
- Discord OAuth2
- Vanilla JavaScript dashboard

## Features

### Core Features
- Discord OAuth2 login with session management
- Signed-in Discord profile display with avatar
- Guild and channel selector with live sidebar navigation
- Template saving and management
- Secure API routes with session auth
- Basic rate limiting and centralized error handling
- Analytics page for bot uptime, joined guilds, member totals, and guild breakdown

### Hybrid Message Builder (NEW)
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
- `GET /api/analytics` - Get bot analytics
- `POST /api/send-message` - Send a message (embed, hybrid, or V2)
- `POST /api/validate-message` - Validate message payload

### Templates
- `POST /api/save-template` - Save a message template
- `GET /api/templates` - List user's templates

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
- The database connection is skipped if `MONGO_URI` is empty.
- Interaction buttons currently reply with a simple ephemeral confirmation and are ready for custom behavior.
- Empty button rows are ignored before save/send so unfinished slots do not trigger validation errors.
- The bot startup uses the current `clientReady` event name for discord.js compatibility.
- If `Server Members Intent` is disabled or member fetch times out, member mention options are limited but the dashboard still works.
- The real dashboard is intended to run through the Express server, not directly from the filesystem.
- A separate isolated demo sandbox exists in `dashboard/demo/` and is excluded from git.

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