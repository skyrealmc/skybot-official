# Permission System Guide

This dashboard uses a capability-based access model with strict backend enforcement.

## Overview

- Session auth is required for all `/api/*` routes.
- Guild access is evaluated per guild and stored in session (`guildAccess`).
- Guilds are shown only when user has Discord `Manage Guild` or `Administrator`.
- Guild actions require bot presence in that guild.
- API checks run server-side; frontend state is only UX.

## Roles And Capabilities

Dashboard roles:
- `owner`
- `admin`
- `moderator`
- `viewer`

Capabilities:
- `full_access`
- `manage_settings`
- `manage_templates`
- `send_messages`
- `view_analytics`
- `view_only`

Default behavior:
- `isGlobalAdmin: true` bypasses capability checks.
- Guild role mapping uses `guildRoles` first, then Discord perms fallback.

## Data Model

`User` supports:
- `roles` (global roles)
- `guildRoles` (per-guild role mapping)
- `allowedGuilds` (optional allow-list)
- `isGlobalAdmin`

## Middleware

Use:
- `requireAuth` for session validation
- `requireAccountCapability(capability)`
- `requireGuildCapability(capability, { source: "params" | "body", key })`

Current middleware file:
- `middlewares/accessControl.js`

## Guild Access Rules

Login flow builds `req.session.guildAccess[]`:
- `id`, `name`, `permissions`
- `role`
- `capabilities`
- `botPresent`
- `inviteUrl` (if bot missing)

`GET /api/guilds` returns this list and refreshes bot presence when possible.

## API Enforcement

Examples:
- `POST /api/send-message` requires guild capability `send_messages`
- Template routes require account capability `manage_templates`
- Scheduler routes require `manage_settings`
- Analytics requires `view_analytics`

Unauthorized access returns structured errors:
- `401` unauthenticated
- `403` insufficient access
- `409` bot not present in selected guild

## Security Notes

- Never trust client-provided `guildId`/`channelId`.
- Channel is validated against selected guild on backend.
- Message/scheduler payloads are validated and sanitized server-side.
- Route-level rate limiting is enabled globally and for sensitive actions.

## Operational Notes

- If `DISCORD_TOKEN` is missing, bot login and scheduler startup are skipped.
- Bot status is exposed via `GET /api/bot-status` for UI action gating.
- Session store uses Mongo in production (`connect-mongo`).

## Admin Setup Example

```js
const User = require("./models/User");

await User.findOneAndUpdate(
  { discordId: "1234567890" },
  {
    $set: {
      isGlobalAdmin: false,
      allowedGuilds: ["111111111111111111"],
      guildRoles: [
        { guildId: "111111111111111111", role: "owner" }
      ]
    }
  },
  { upsert: true, new: true }
);
```
