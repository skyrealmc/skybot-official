# SKY REALM | SKY BOT S2 Dashboard

Full-stack Discord bot and web dashboard for the official SKY REALM Minecraft community. Built for SKY BOT S2 with creator credit to chriz3656.

## Stack

- Node.js + Express
- discord.js v14
- MongoDB + Mongoose
- Discord OAuth2
- Vanilla JavaScript dashboard

## Features

- Discord OAuth login
- Signed-in Discord profile display with avatar
- Guild and channel selector with live sidebar navigation
- Live embed preview
- Analytics page for bot uptime, joined guilds, member totals, and guild breakdown
- Link and interaction buttons
- Message content above embeds
- Mention builder for members, roles, channels, `@everyone`, and `@here`
- Post-send reactions
- Template saving
- Secure API routes with session auth
- Basic rate limiting and centralized error handling
- Discord-style single-canvas control panel UI
- Full-width responsive workspace layout for desktop and mobile
- Channel selection persistence in both sidebar and selector controls

## Project Structure

```text
.
├── bot
├── controllers
├── dashboard
├── middlewares
├── models
├── routes
├── server
├── services
├── utils
└── index.js
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

## Notes

- The bot login is skipped if `DISCORD_TOKEN` is empty.
- The database connection is skipped if `MONGO_URI` is empty.
- Interaction buttons currently reply with a simple ephemeral confirmation and are ready for custom behavior.
- Empty button rows are ignored before save/send so unfinished slots do not trigger validation errors.
- The bot startup uses the current `clientReady` event name for discord.js compatibility.
- If `Server Members Intent` is disabled or member fetch times out, member mention options are limited but the dashboard still works.
- The builder page now supports analytics, reactions, mentions, and message content alongside embeds.
- The real dashboard is intended to run through the Express server, not directly from the filesystem.
- A separate isolated demo sandbox exists in `dashboard/demo/` and is excluded from git.
