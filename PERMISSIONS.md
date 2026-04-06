# Permission Layer Configuration Guide

The SkyBot S2 dashboard now includes a comprehensive permission system with role-based access control and guild filtering.

## Features

### Role-Based Access Control
- **Admin** - Full access to all features
- **Moderator** - Standard access to message builder
- **Owner** - Highest level access (typically bot owner)
- **Global Admin** - Bypasses all permission checks

### Guild Filtering
- Restrict users to specific guilds only
- Only show guilds where user has Manage Guild or Administrator permissions

## Configuration

### Setting Up User Roles and Allowed Guilds

Use MongoDB directly or create a script to configure users:

```javascript
// Example: Set up a user with specific permissions
const User = require('./models/User');

async function configureUser(discordId, config) {
  await User.findOneAndUpdate(
    { discordId },
    {
      $set: {
        roles: config.roles || [],
        allowedGuilds: config.allowedGuilds || [],
        isGlobalAdmin: config.isGlobalAdmin || false
      }
    }
  );
}

// Example usage:
// configureUser('123456789', {
//   roles: [{ type: 'admin', discordRoleId: '' }],
//   allowedGuilds: ['962300040477409280'], // Your server ID
//   isGlobalAdmin: false
// });
```

### Environment Variables (Optional)

Add to `.env`:

```env
# Restrict to specific guild (optional)
ALLOWED_GUILD_ID=your_guild_id_here

# Global admin Discord ID (optional)
GLOBAL_ADMIN_ID=your_discord_id_here
```

### Automatic Configuration on Login

The system automatically:
1. Checks if user has Manage Guild or Administrator permissions
2. Filters guilds based on `allowedGuilds` if set
3. Shows role badges in the UI

## Role Permissions

| Role | Permissions |
|------|-------------|
| **Global Admin** | Bypasses all checks, full access |
| **Admin** | Full access to all features |
| **Moderator** | Standard access to message builder |
| **Owner** | Highest level access |
| **No Role** | Cannot access protected features |

## Guild Filtering

### How It Works

1. User logs in via Discord OAuth
2. System checks user's Discord permissions in each guild
3. Only guilds with Manage Guild or Administrator are shown
4. If `allowedGuilds` is set, further filter to only those guilds

### Example: Restrict to Your Server Only

```javascript
// In MongoDB, update your user document:
{
  discordId: "your_discord_id",
  allowedGuilds: ["962300040477409280"], // Your server ID
  roles: [{ type: "admin" }],
  isGlobalAdmin: false
}
```

## API Usage

### Using requireRole Middleware

```javascript
const express = require('express');
const { requireRole } = require('./middlewares/requireRole');

const router = express.Router();

// Only admins can access
router.get('/admin-only', requireRole(['admin']), handler);

// Admins or owners can access
router.get('/admin-or-owner', requireRole(['admin', 'owner']), handler);

// Any user with a role can access
router.get('/any-role', requireRole(), handler);
```

### Using filterAllowedGuilds

```javascript
const { filterAllowedGuilds } = require('./middlewares/requireRole');

const allGuilds = [/* ... */];
const userAllowedGuilds = ['guild1', 'guild2'];

const filtered = filterAllowedGuilds(allGuilds, userAllowedGuilds);
```

## UI Indicators

After login, users will see role badges next to their username:
- **Red "ADMIN"** badge for global admins
- **Blue "MODERATOR"** badge for moderators
- **Gold "OWNER"** badge for owners

## Security Notes

1. Always verify permissions server-side
2. The `isGlobalAdmin` flag should only be set by database administrators
3. Guild filtering happens both in session creation and API responses
4. Users without proper permissions will receive 403 Forbidden responses

## Troubleshooting

### User Can't See Any Guilds
- Check if user has Manage Guild permission in any guild
- Verify `allowedGuilds` contains valid guild IDs
- Ensure the bot is installed in the target guilds

### User Can't Access Features
- Check user's roles in the database
- Verify role names match exactly (admin, moderator, owner)
- Global admin bypasses all checks

### Testing
To test the permission system:
1. Log in with a test account
2. Check browser console for any permission errors
3. Verify role badges appear correctly
4. Test guild selection with different `allowedGuilds` settings