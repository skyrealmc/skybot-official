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
- Guild and channel selector
- Live embed preview
- Link and interaction buttons
- Template saving
- Secure API routes with session auth
- Basic rate limiting and centralized error handling

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
2. Fill in Discord OAuth and bot credentials.
3. Set `REDIRECT_URI` in the Discord developer portal.
4. Start MongoDB.
5. Install dependencies with `npm install`.
6. Run the app with `npm run dev` or `npm start`.

## Required Discord Setup

- OAuth scopes: `identify`, `guilds`
- Bot permissions:
  - `Send Messages`
  - `Embed Links`
- User permissions in target guild:
  - `Manage Guild` or `Administrator`

## Notes

- The bot login is skipped if `DISCORD_TOKEN` is empty.
- The database connection is skipped if `MONGO_URI` is empty.
- Interaction buttons currently reply with a simple ephemeral confirmation and are ready for custom behavior.
