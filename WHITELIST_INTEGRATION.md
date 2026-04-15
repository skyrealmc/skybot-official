# Whitelist Automation System Integration

## Overview

This is a complete whitelist application system integrating a public submission form, admin dashboard, database, and Discord bot notifications.

## Components

### 1. Public Website Form
**File**: `dashboard/whitelist/whitelist.html`
- Users submit whitelist applications with Minecraft username, Discord ID, email, and age
- Form validates input client-side
- Submits to `/api/whitelist/apply`
- Shows success/error messages with proper feedback

### 2. Backend API
**Base**: `/api/whitelist`

#### Endpoints:
- **POST /api/whitelist/apply** (Public, Rate Limited)
  - Submit a new whitelist application
  - Required: minecraftUsername, discordId, email, age
  - Returns: applicationId and status
  - Prevents duplicate submissions within 24 hours

- **GET /api/whitelist/list** (Admin Only)
  - List all applications with optional status filter
  - Query: `?status=pending|approved|rejected`
  - Returns: Array of applications with counts

- **GET /api/whitelist/:id** (Admin Only)
  - Get detailed view of a single application

- **POST /api/whitelist/approve/:id** (Admin Only)
  - Approve an application
  - Optional body: `{ approvalMessage, notificationChannelId, notificationGuildId, assignRoleId }`
  - Triggers Discord bot notification if channel provided

- **POST /api/whitelist/reject/:id** (Admin Only)
  - Reject an application

### 3. MongoDB Model
**File**: `models/WhitelistApplication.js`

Fields:
- `minecraftUsername` (String, 3-16 chars)
- `discordId` (String, 17-19 digits)
- `email` (String, valid email)
- `age` (Number, 13-99)
- `status` (String: pending|approved|rejected)
- `appliedAt` (Date, auto)
- `reviewedBy` (String, Discord ID of reviewer)
- `reviewedAt` (Date)
- `approvalMessage` (String, custom message)
- Timestamps (createdAt, updatedAt)

### 4. Admin Dashboard
**File**: `dashboard/whitelist.html`
- Statistics: Pending, Approved, Rejected counts
- Filter tabs for each status
- Search by username or email
- Table view of all applications
- View full application details in modal
- Approve/Reject with optional custom message
- Real-time status update after actions

### 5. Discord Bot Integration
**File**: `services/whitelistNotificationService.js`

Functions:
- `sendWhitelistApproved(client, application, options)`
  - Sends approval embed to Discord channel
  - Includes: Minecraft username, Discord mention, custom message
  - Optional: Assigns role to approved user

- `sendWhitelistApprovedBatch(client, applications, options)`
  - Send approval to multiple applications

## Installation & Setup

### 1. Database
No migration needed - Mongoose will create collections automatically.

### 2. Discord Bot Intents
Ensure your bot has the following intents in `bot/client.js`:
- `GuildMembers` (for assigning roles)
- `DirectMessages` (optional, for DM notifications)

### 3. Environment Variables (Optional)
```env
# If using a specific channel for approvals:
WHITELIST_APPROVAL_CHANNEL_ID=your_channel_id
WHITELIST_APPROVAL_GUILD_ID=your_guild_id
WHITELIST_APPROVAL_ROLE_ID=your_role_id
```

### 4. Bot Permissions Required
- `Send Messages`
- `Embed Links`
- `Manage Roles` (if assigning roles)

## Usage Flow

### User Submitting Application
1. User visits `/whitelist/` on website
2. Fills form: Minecraft username, Discord ID, email, age
3. Agrees to rules
4. Submits form → POST `/api/whitelist/apply`
5. Receives success message

### Admin Approving Application
1. Admin logs in to dashboard
2. Navigates to `/whitelist` page
3. Views pending applications (default filter)
4. Clicks "Approve" on application
5. Optionally customizes approval message
6. Clicks "Confirm Approval"
7. Backend:
   - Updates application status to "approved"
   - Sends Discord notification to configured channel
   - Optionally assigns role to approved user
   - Returns confirmation

### Data Storage
- Applications stored in MongoDB `whitelistapplications` collection
- Each application tracked with timestamps and reviewer info
- No data is deleted, only status is changed

## API Response Examples

### Submit Application (Success)
```json
{
  "success": true,
  "message": "Application submitted successfully. Staff will review it shortly.",
  "applicationId": "507f1f77bcf86cd799439011",
  "status": "pending"
}
```

### Submit Application (Duplicate)
```json
{
  "error": "You have already submitted an application. Please wait 24 hours before submitting again."
}
```

### List Applications
```json
{
  "success": true,
  "count": 5,
  "applications": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "minecraftUsername": "Steve_01",
      "discordId": "123456789012345678",
      "email": "user@example.com",
      "age": 18,
      "status": "pending",
      "appliedAt": "2026-04-15T06:00:00.000Z",
      "createdAt": "2026-04-15T06:00:00.000Z",
      "updatedAt": "2026-04-15T06:00:00.000Z"
    }
  ]
}
```

### Approve Application
```json
{
  "success": true,
  "message": "Application approved successfully",
  "application": {
    "_id": "507f1f77bcf86cd799439011",
    "minecraftUsername": "Steve_01",
    "discordId": "123456789012345678",
    "status": "approved",
    "reviewedBy": "987654321098765432",
    "reviewedAt": "2026-04-15T06:30:00.000Z",
    "approvalMessage": "Welcome to the server!"
  },
  "notificationSent": true
}
```

## Security Notes

1. **Rate Limiting**: `/api/whitelist/apply` is rate-limited to 5 requests per minute
2. **Duplicate Prevention**: Check 24-hour window before allowing new submission
3. **Input Validation**: All fields validated server-side
4. **Admin Protection**: All admin endpoints require authentication and `manage_settings` capability
5. **Discord ID Validation**: Must be 17-19 digits (valid Discord snowflake)
6. **Email Validation**: Simple regex validation on client and server

## Troubleshooting

### Form Not Submitting
- Check browser console for errors
- Verify `/api/whitelist/apply` is accessible (check network tab)
- Ensure Discord ID format is correct (17-19 digits)

### Discord Notification Not Sending
- Verify bot is in the target channel's guild
- Check bot permissions (Send Messages, Embed Links)
- Verify channel ID is correct (18+ digits)
- Check server logs for detailed error messages

### Duplicate Submission Error
- User must wait 24 hours from their last submission with same Discord ID
- Error message indicates when they can submit again

## Advanced Usage

### Custom Approval Message with Variables
In future updates, support for variables like `{username}`, `{discord}`:

```javascript
// Example (not yet implemented)
const message = `Welcome ${username}! You've been approved for the server.`;
```

### Batch Approvals
```javascript
const { sendWhitelistApprovedBatch } = require("./services/whitelistNotificationService");

const applications = await WhitelistApplication.find({ status: "pending" }).limit(5);
const results = await sendWhitelistApprovedBatch(client, applications, {
  channelId: "channel_id",
  guildId: "guild_id",
  message: "You're approved!"
});
```

### Scheduled Notifications
Use the scheduler to send bulk notifications:

```javascript
// In scheduler config
{
  "type": "whitelist-notification",
  "action": "approveBatch",
  "maxCount": 5
}
```

## Files Modified/Created

### Created:
- `models/WhitelistApplication.js` - Mongoose schema
- `services/whitelistService.js` - Business logic
- `services/whitelistNotificationService.js` - Discord notifications
- `controllers/whitelistController.js` - Request handlers
- `dashboard/whitelist.html` - Admin dashboard page

### Modified:
- `routes/apiRoutes.js` - Added whitelist routes
- `server/app.js` - Added whitelist route and client reference
- `dashboard/whitelist/whitelist.html` - Updated form to use API

## Next Steps / Future Enhancements

1. **Email Notifications**: Send confirmation email after approval/rejection
2. **Application Status Endpoint**: Public endpoint to check application status by Discord ID
3. **Whitelist Data Export**: Export approved users as CSV
4. **Bulk Actions**: Approve/reject multiple applications at once
5. **Custom Rejection Messages**: Per-user rejection reasons
6. **Application Expiry**: Auto-reject applications not reviewed after 30 days
7. **Webhook Integration**: Notify third-party services on approval
8. **Email Templates**: Customizable email notifications

## Support

For issues or questions:
1. Check server logs: `npm run dev` output
2. Verify Discord bot is online: `/api/bot-status`
3. Check database connection: MongoDB logs
4. Test API directly with curl or Postman
