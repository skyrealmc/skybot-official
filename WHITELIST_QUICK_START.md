# Whitelist Integration - Quick Start Guide

Connect your official website form to the Discord bot admin dashboard in 3 simple steps.

## 🚀 How It Works (30-Second Overview)

```
User fills form on website
        ↓
Form sends data to /api/whitelist/apply
        ↓
Backend stores in MongoDB
        ↓
Admin sees application in dashboard
        ↓
Admin clicks "Approve"
        ↓
Discord bot sends announcement in Discord
```

## 📋 Website Form → Backend Connection

### What Changed
Your website form at `dashboard/whitelist/index.html` now:
- ✅ Sends data to backend API (`POST /api/whitelist/apply`)
- ✅ Validates Discord ID (17-19 digit snowflake)
- ✅ Shows loading states and error messages
- ✅ Stores data in MongoDB (not just localStorage)

### Critical: Discord ID Field
**Users must provide their Discord User ID, NOT username.**

```
❌ WRONG (Discord Username):     "skyrealms_user"
✅ CORRECT (Discord User ID):    "123456789012345678"

How users get it:
1. Open Discord
2. Right-click on their profile picture/name
3. Click "Copy User ID"
4. Paste into form
```

## 🎮 Admin Dashboard → Database → Discord Bot

### What the Admin Sees
Dashboard at `http://yourbot.com/whitelist` shows:

1. **Stats Cards**
   - Pending applications
   - Approved applications
   - Rejected applications

2. **Filterable Table**
   - All submitted applications
   - Filter by status (Pending/Approved/Rejected)
   - Search by username, email, or Discord ID

3. **Action Buttons**
   - View full details (modal)
   - Approve (opens message editor)
   - Reject (quick action)

### What Happens on Approval

```
1. Admin clicks "Approve" button
2. Modal opens with optional message
3. Admin enters message like: "Welcome to Sky Realms!"
4. Admin clicks "Confirm"
5. Backend processes:
   - Updates status to "approved" in MongoDB
   - Calls Discord bot to send notification
6. Discord bot:
   - Builds rich embed
   - Sends to whitelist announcement channel
   - Optionally assigns whitelist role
7. Dashboard updates:
   - Row status changes from pending → approved (green)
   - Shows success notification
8. User sees announcement in Discord!
```

## 🔌 API Endpoints (Backend)

All whitelist endpoints use `/api/whitelist/` prefix:

### Submit Application (Public)
```
POST /api/whitelist/apply
Rate Limited: 5 requests/minute per IP

Request:
{
  "minecraftUsername": "Steve_01",
  "discordId": "123456789012345678",
  "email": "user@example.com",
  "age": 18
}

Response (Success):
{
  "success": true,
  "application": { ... }
}

Response (Error):
{
  "success": false,
  "message": "You have already applied in the last 24 hours."
}
```

### List Applications (Admin Only)
```
GET /api/whitelist/list?status=pending

Query Params:
- status: pending | approved | rejected (optional)

Response:
{
  "applications": [ ... ],
  "total": 15
}
```

### Get Application Details (Admin Only)
```
GET /api/whitelist/:id

Response:
{
  "application": {
    "_id": "...",
    "minecraftUsername": "Steve_01",
    "discordId": "123456789012345678",
    "email": "user@example.com",
    "age": 18,
    "status": "pending",
    "appliedAt": "2026-04-15T07:04:36.631Z",
    "reviewedBy": null,
    "reviewedAt": null
  }
}
```

### Approve Application (Admin Only)
```
POST /api/whitelist/approve/:id

Request Body (Optional):
{
  "message": "Welcome to Sky Realms!"
}

Response:
{
  "success": true,
  "application": { ... updated with status: "approved" }
}
```

### Reject Application (Admin Only)
```
POST /api/whitelist/reject/:id

Response:
{
  "success": true,
  "application": { ... updated with status: "rejected" }
}
```

## 🗄️ Database Schema

Applications are stored in MongoDB collection `whitelistapplications`:

```javascript
{
  _id: ObjectId,
  minecraftUsername: String,      // e.g., "Steve_01"
  discordId: String,              // e.g., "123456789012345678"
  email: String,                  // e.g., "user@example.com"
  age: Number,                    // e.g., 18
  status: "pending" | "approved" | "rejected",
  appliedAt: Date,                // Auto-set on creation
  reviewedBy: String | null,      // Admin user ID (set on approval)
  reviewedAt: Date | null         // Admin timestamp (set on approval)
}
```

**Index**: Compound index on `(discordId, createdAt)` prevents duplicate submissions within 24 hours.

## 🤖 Discord Bot Integration

### What Gets Sent to Discord

When admin approves an application, a rich embed is sent to the whitelist announcement channel:

```
╔════════════════════════════════════════╗
║ ✓ Player Whitelist Approved            ║
║                                        ║
║ Minecraft: Steve_01                    ║
║ Discord: @Steve_01                     ║
║ Applied: 2 hours ago                   ║
║                                        ║
║ Welcome to Sky Realms SMP!              ║
║ Follow all server rules in #rules       ║
║                                        ║
║ Staff will update server whitelist.    ║
╚════════════════════════════════════════╝
```

### Configuration

Edit these settings in your bot/config files:

```javascript
// Where to send approval messages
WHITELIST_CHANNEL_ID = "your-channel-id"

// Optional: Role to assign on approval
WHITELIST_ROLE_ID = "your-role-id"

// Custom announcement message
WHITELIST_ANNOUNCEMENT_MESSAGE = "Welcome to Sky Realms!"
```

## ✅ Testing Checklist

### 1. Test Website Form
- [ ] Navigate to `http://localhost:3000/whitelist/`
- [ ] Fill form with valid data
- [ ] Click "Apply Whitelist"
- [ ] See success message: "✓ Application submitted for [username]!"

### 2. Test Admin Dashboard
- [ ] Navigate to `http://localhost:3000/whitelist` (admin page)
- [ ] Verify submitted application appears in table
- [ ] Click "View" to see details modal
- [ ] Close modal without action

### 3. Test Filtering
- [ ] Click "Pending" tab - should show pending applications
- [ ] Click "All" tab - should show all applications
- [ ] Use search box - filter by username/email

### 4. Test Approval
- [ ] Click "Approve" button on pending application
- [ ] Modal opens asking for optional message
- [ ] Enter: "Welcome to Sky Realms!"
- [ ] Click "Confirm"
- [ ] Table updates - status changes to green "approved"
- [ ] Check Discord channel - approval embed appears

### 5. Test Rejection
- [ ] Click "Reject" button on pending application
- [ ] Status changes to red "rejected"
- [ ] No Discord message sent (rejection is silent)

### 6. Test Duplicate Prevention
- [ ] Submit form with same Discord ID twice
- [ ] Second attempt shows: "You have already applied in the last 24 hours"
- [ ] Prevents spam submissions

### 7. Test Rate Limiting
- [ ] Submit form more than 5 times in 1 minute
- [ ] After 5th: "Rate limit exceeded - try again in 1 minute"
- [ ] Wait 1 minute, try again
- [ ] Should work after cooldown

## 🐛 Troubleshooting

### Form submission shows success but application doesn't appear in dashboard
**Problem**: Form succeeded locally but API failed
**Solution**:
1. Check browser console (F12 → Console tab) for error message
2. Verify Discord ID format (17-19 digits, no letters)
3. Check `/api/whitelist/apply` endpoint is accessible
4. Verify MongoDB is running and connected

### Discord bot doesn't send approval message
**Problem**: Approval succeeded but no embed in Discord
**Solution**:
1. Verify whitelist announcement channel ID is correct
2. Check bot has permission to send messages in that channel
3. Verify bot is online (check bot status in Discord)
4. Check server logs for errors during approval

### Admin dashboard shows 0 applications
**Problem**: Form is submitting but dashboard is empty
**Solution**:
1. Check MongoDB collection exists: `db.whitelistapplications.find()`
2. Verify admin is authenticated (check cookie/token)
3. Try refreshing dashboard page
4. Check browser console for API errors

### Getting "Rate limit exceeded" on every submission
**Problem**: Too many submissions in short time
**Solution**:
1. Wait 1 minute before next attempt (rate limit window)
2. Different IP address (if behind proxy)
3. Check if form is auto-submitting (JavaScript loop)

### Getting "Duplicate application" error but I haven't submitted before
**Problem**: Recent submission from same Discord ID
**Solution**:
1. Current policy: 1 application per Discord ID per 24 hours
2. Wait 24 hours before next submission
3. Use different Discord account to test
4. Check if ID is formatted correctly (no spaces, exactly 17-19 digits)

## 📚 Files Modified

### New Files Created
- `dashboard/whitelist/index.html` - Official website form
- `dashboard/whitelist/style.css` - Form styling
- `dashboard/whitelist/whitelist.js` - Form logic + API integration
- `models/WhitelistApplication.js` - MongoDB schema
- `services/whitelistService.js` - Business logic
- `services/whitelistNotificationService.js` - Discord notifications
- `controllers/whitelistController.js` - API handlers
- `dashboard/whitelist.html` - Admin dashboard page

### Files Modified
- `routes/apiRoutes.js` - Added 5 whitelist endpoints
- `server/app.js` - Exposed Discord client for notifications
- `dashboard/index.html` - Added whitelist navigation button

## 🔐 Security Notes

✅ What's protected:
- Admin endpoints require authentication + `manage_settings` capability
- All inputs validated server-side (not just client-side)
- Rate limiting prevents abuse (5/min per IP)
- Duplicate prevention (24-hour window)
- No SQL injection (MongoDB with Mongoose)

⚠️ What to watch for:
- Never send passwords or tokens via form
- Use HTTPS in production
- Keep Discord bot token secret (not in code)
- Validate Discord IDs server-side

## 🎯 Next Steps

1. **Deploy**: Test in development first (`npm run dev`)
2. **Configure**: Set whitelist announcement channel ID in bot config
3. **Announce**: Tell users about the form at `https://skyrealm.fun/whitelist/`
4. **Monitor**: Check dashboard regularly for new applications
5. **Review**: Approve/reject applications as they come in

## 📖 Full Documentation

For detailed information, see:
- `WHITELIST_WEBSITE_INTEGRATION.md` - Complete integration guide
- `WHITELIST_INTEGRATION.md` - System architecture and setup

## 💬 Questions?

If something doesn't work:
1. Check browser console (F12) for client-side errors
2. Check server logs for backend errors
3. Verify MongoDB is running: `mongosh`
4. Verify bot is online in Discord
5. Review error messages carefully - they explain what went wrong
