# Whitelist Integration: Website Form ↔ Bot Panel

Complete guide on how the official website whitelist form connects to the Discord bot admin panel.

## System Architecture

```
Website Form (https://skyrealm.fun/whitelist/)
    ↓
Discord User ID (17-19 digits)
    ↓
POST /api/whitelist/apply → Backend API
    ↓
MongoDB WhitelistApplication collection
    ↓
Admin Dashboard (https://yourbot.com/whitelist)
    ↓
Approve/Reject → Discord Bot Notification
```

## Form Fields & Data Mapping

### Website Form Input
| Field | Type | Validation | Maps To |
|-------|------|-----------|---------|
| **Minecraft Username** | Text | 3-16 chars, alphanumeric + underscore | `minecraftUsername` |
| **Discord User ID** | Text | 17-19 digit snowflake | `discordId` |
| **Email Address** | Email | Valid RFC email format | `email` |
| **Age** | Number | 13-99 | `age` |
| **Rules Agreement** | Checkbox | Required | (validation only) |

### Discord ID Format
- Users get their ID: Right-click Discord profile → **Copy User ID**
- Format: **17-19 digit number** (Discord snowflake)
- Example: `123456789012345678`
- ❌ NOT username (e.g., "skyrealms_user")
- ❌ NOT discriminator (e.g., "#1234")

## Backend API Integration

### Endpoint Details

**POST `/api/whitelist/apply`**

**Request:**
```json
{
  "minecraftUsername": "Steve_01",
  "discordId": "123456789012345678",
  "email": "user@example.com",
  "age": 18
}
```

**Success Response (200):**
```json
{
  "success": true,
  "application": {
    "_id": "507f1f77bcf86cd799439011",
    "minecraftUsername": "Steve_01",
    "discordId": "123456789012345678",
    "email": "user@example.com",
    "age": 18,
    "status": "pending",
    "appliedAt": "2026-04-15T07:04:36.631Z"
  }
}
```

**Error Response (400/429):**
```json
{
  "success": false,
  "message": "You have already applied in the last 24 hours. Please try again later."
}
```

### Rate Limiting
- **Limit**: 5 requests per minute per IP
- **Window**: 1 minute rolling window
- **Status Code**: 429 (Too Many Requests)
- **Purpose**: Prevent spam/duplicate submissions

## Form Submission Flow

### 1. Client-Side Validation
```javascript
// Happens in whitelist.js initWhitelistForm()

✓ Minecraft Username: /^[A-Za-z0-9_]{3,16}$/
✓ Discord ID: /^\d{17,19}$/
✓ Email: RFC email format
✓ Age: 13-99 integer
✓ Rules: Checkbox must be checked
```

### 2. Backend Validation
```javascript
// Happens in whitelistController.js submitApplication()

✓ All fields present and non-empty
✓ Minecraft Username: 3-16 chars, alphanumeric + underscore
✓ Discord ID: Valid snowflake format (17-19 digits)
✓ Email: Valid email format
✓ Age: Number, 13-99
✓ Duplicate Check: No pending/approved application from same Discord ID in last 24 hours
```

### 3. Database Storage
```javascript
// Stored in MongoDB WhitelistApplication collection

{
  "_id": ObjectId,
  "minecraftUsername": "Steve_01",
  "discordId": "123456789012345678",
  "email": "user@example.com",
  "age": 18,
  "status": "pending",      // pending → approved/rejected
  "appliedAt": Date,        // Timestamp
  "reviewedBy": null,       // Set by admin on approval
  "reviewedAt": null        // Set by admin on approval
}
```

### 4. Duplicate Prevention
- **Check**: Previous application from same `discordId` in last 24 hours
- **Index**: MongoDB compound index on `(discordId, createdAt)`
- **Policy**: One application per Discord user per 24 hours
- **Error**: "You have already applied in the last 24 hours..."

## Website Form (Client-Side)

### File Structure
```
dashboard/whitelist/
├── index.html          # Official website form
├── style.css           # Global website CSS (whitelist section only)
└── whitelist.js        # Form logic + API integration
```

### Form Initialization
```javascript
// Executes on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initWhitelistForm);

// Checks if applications are open via data-applications-open attribute
const applicationsOpen = form.dataset.applicationsOpen === 'true';

// Disables button if closed
applyButton.disabled = !applicationsOpen;
```

### Changing Application Status
To open/close applications, update the HTML form attribute:
```html
<!-- OPEN (users can apply) -->
<form id="whitelistForm" class="whitelist-form" data-applications-open="true">

<!-- CLOSED (applications blocked) -->
<form id="whitelistForm" class="whitelist-form" data-applications-open="false">
```

### User Feedback Messages
- **Pending**: "Submitting your application..."
- **Success**: "✓ Application submitted! Check your email for updates..."
- **Error - Duplicate**: "You have already submitted an application..."
- **Error - Validation**: "Use a valid Minecraft username..."
- **Error - Closed**: "Whitelist applications are currently closed..."

### Fallback Storage
```javascript
// Even if backend fails, applications are saved locally
localStorage.setItem('skyrealms-whitelist-applications-v1', JSON.stringify(applications));

// This allows:
// - Users to see their submission succeeded locally
// - Admin to recover submissions if server was down
// - Analytics on attempted submissions
```

## Admin Dashboard (Server-Side)

### File Location
```
dashboard/whitelist.html   # Admin management page
```

### Admin Endpoints
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/whitelist/list` | Required | List applications (with filters) |
| GET | `/api/whitelist/:id` | Required | View application details |
| POST | `/api/whitelist/approve/:id` | Required | Approve application |
| POST | `/api/whitelist/reject/:id` | Required | Reject application |

### Approve Workflow
```
1. Admin views application in dashboard
2. Admin clicks "Approve"
3. Modal opens for optional message
4. Admin submits approve request
   POST /api/whitelist/approve/:id
   {
     "message": "Welcome to Sky Realms!"  // Optional
   }
5. Backend:
   - Updates application status to "approved"
   - Records admin ID + timestamp
   - Calls whitelistNotificationService.sendWhitelistApproved()
6. Discord Bot:
   - Builds approval embed
   - Sends to configured whitelist announcement channel
   - Optionally assigns role to approved user
7. Dashboard:
   - Updates table row (status changes to green "approved")
   - Shows success notification
```

### Reject Workflow
```
1. Admin views application in dashboard
2. Admin clicks "Reject"
3. Backend:
   - Updates application status to "rejected"
   - Records admin ID + timestamp
4. Dashboard:
   - Updates table row (status changes to red "rejected")
   - Shows success notification
```

### Dashboard Features
- **Filter Tabs**: Pending, Approved, Rejected, All
- **Search**: Real-time filter by username, email, Discord ID
- **Stats Cards**: Count of pending, approved, rejected applications
- **Modal Details**: Click "View" to see full application info
- **Bulk Visibility**: Table shows all applications with pagination
- **Status Badges**: Visual indicators (yellow pending, green approved, red rejected)

## Discord Bot Integration

### Approval Notification

**When**: Application is approved by admin
**Where**: Configured Discord channel (whitelist announcement channel)
**What**: Rich embed message

**Embed Structure:**
```
┌─────────────────────────────────────────┐
│ ✓ Player Whitelist Approved              │
│                                          │
│ • Minecraft: Steve_01                    │
│ • Discord: @user (mention by ID)         │
│ • Applied: 2 hours ago                   │
│                                          │
│ Welcome to Sky Realms SMP!               │
│ Follow all server rules in #rules.       │
│                                          │
│ Staff will update server whitelist.      │
└─────────────────────────────────────────┘
```

**Implementation:**
```javascript
// File: services/whitelistNotificationService.js

exports.sendWhitelistApproved = async (application, discordClient, options = {}) => {
  // application = WhitelistApplication document
  // discordClient = Discord.js client
  // options = { message, channelId, roleId }

  // 1. Build embed
  const embed = {
    title: '✓ Player Whitelist Approved',
    color: 0x22c55e,  // Green
    fields: [
      { name: 'Minecraft', value: application.minecraftUsername, inline: true },
      { name: 'Discord', value: `<@${application.discordId}>`, inline: true },
      { name: 'Applied', value: formatTimeAgo(application.appliedAt), inline: true }
    ],
    description: options.message || 'Welcome to Sky Realms SMP! Follow all server rules in #rules.'
  };

  // 2. Send to channel
  const channel = await discordClient.channels.fetch(channelId);
  await channel.send({ embeds: [embed] });

  // 3. Optional: Assign role
  if (options.roleId) {
    const guild = channel.guild;
    const member = await guild.members.fetch(application.discordId);
    await member.roles.add(roleId);
  }
};
```

## Complete Data Flow Example

### User submits application

**Website Form:**
```
User fills form:
- Minecraft: Steve_01
- Discord ID: 123456789012345678
- Email: steve@example.com
- Age: 18
- Agrees to rules

Clicks "Apply Whitelist"
```

**Client-Side (whitelist.js):**
```javascript
// 1. Validates all fields locally
// 2. Calls submitToBackend()
// 3. Sends POST /api/whitelist/apply with JSON

fetch('/api/whitelist/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    minecraftUsername: 'Steve_01',
    discordId: '123456789012345678',
    email: 'steve@example.com',
    age: 18
  })
});

// 4. Saves to localStorage as backup
localStorage.setItem('skyrealms-whitelist-applications-v1', [...]);

// 5. Shows success message
// "✓ Application submitted for Steve_01!..."
```

**Backend (whitelistController.js):**
```javascript
// 1. Receives POST /api/whitelist/apply
// 2. Validates all fields
// 3. Checks duplicate (same discordId in 24h)
// 4. Creates WhitelistApplication document
// 5. Returns 200 + application data
// 6. Rate limiter prevents >5/min per IP
```

**Database (MongoDB):**
```javascript
db.whitelistapplications.insertOne({
  minecraftUsername: 'Steve_01',
  discordId: '123456789012345678',
  email: 'steve@example.com',
  age: 18,
  status: 'pending',
  appliedAt: 2026-04-15T07:04:36.631Z,
  reviewedBy: null,
  reviewedAt: null
});
```

### Admin approves application

**Dashboard (whitelist.html):**
```
1. Admin logs in → sees applications table
2. Sees "Steve_01" with status "pending"
3. Clicks "Approve" button
4. Modal opens: "Optional message..."
5. Enters: "Welcome to Sky Realms! Have fun!"
6. Clicks submit

JavaScript sends:
POST /api/whitelist/approve/:id
{
  "message": "Welcome to Sky Realms! Have fun!"
}
```

**Backend (whitelistController.js):**
```javascript
// 1. Receives POST /api/whitelist/approve/:id
// 2. Checks admin has manage_settings capability
// 3. Updates application:
//    - status = "approved"
//    - reviewedBy = admin user ID
//    - reviewedAt = now
// 4. Calls whitelistNotificationService.sendWhitelistApproved()
```

**Discord Bot (whitelistNotificationService.js):**
```javascript
// 1. Fetches whitelist announcement channel
// 2. Builds embed with:
//    - Green color (0x22c55e)
//    - Minecraft username
//    - Discord user mention (@Steve_01)
//    - Custom approval message
// 3. Sends embed to channel
// 4. Optional: Assigns whitelist role to user
```

**Discord Server:**
```
#whitelist-announcements channel shows:

┌──────────────────────────────────────┐
│ ✓ Player Whitelist Approved          │
│                                      │
│ Minecraft: Steve_01                  │
│ Discord: @Steve_01 (ID: 123...)      │
│ Applied: 2 hours ago                 │
│                                      │
│ Welcome to Sky Realms! Have fun!     │
│                                      │
│ Staff will update server whitelist.  │
└──────────────────────────────────────┘
```

## Environment Variables

No additional environment variables required. The system uses:
- **API Endpoint**: `/api/whitelist/apply` (relative URL)
- **Discord Channel**: Configured in admin panel or bot config
- **Discord Role**: Optional, configured in admin panel or bot config

## Testing the Integration

### 1. Test Website Form Submission
```bash
# Start server
npm run dev

# Open website form
http://localhost:3000/whitelist/

# Fill form with test data
# Click "Apply Whitelist"
# Verify success message
```

### 2. Test Admin Dashboard
```bash
# Navigate to admin dashboard
http://localhost:3000/whitelist

# Verify application appears in "Pending" tab
# Click "View" to see details
# Click "Approve"
# Verify status changes to "approved"
```

### 3. Test Discord Notification
```bash
# After approval in admin dashboard
# Check configured whitelist announcement channel
# Verify embed message appears with correct data
```

### 4. Test Duplicate Prevention
```bash
# Submit form with same Discord ID twice
# Second submission should fail with:
# "You have already applied in the last 24 hours..."

# Wait 24 hours or modify test data to use different Discord ID
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Form submits locally but not to backend | CORS error or API down | Check browser console for errors; verify `/api/whitelist/apply` is accessible |
| Application doesn't appear in admin dashboard | API returned error | Check error message in website form; verify Discord ID format (17-19 digits) |
| Admin approval doesn't send Discord message | Bot not connected or channel ID wrong | Verify bot is online; check whitelist channel configuration |
| Rate limit blocking submissions | User submitted >5 times/minute | Tell user to wait 1 minute before retrying |
| Duplicate error but no previous application | Check within 24-hour window | Current policy allows one per Discord ID per 24 hours |

## Security Considerations

### Client-Side
- ✓ Input validation before submission
- ✓ Email format validation (basic)
- ✓ Discord ID format validation (regex)
- ✗ No sensitive data stored in localStorage (passwords, tokens)

### Server-Side
- ✓ Backend validates all inputs again
- ✓ Rate limiting (5/min per IP)
- ✓ Duplicate prevention (24-hour window)
- ✓ Admin routes require authentication + capability
- ✓ No SQL injection (MongoDB with Mongoose)
- ✓ CORS enabled for website domain

### Best Practices
1. **Never send Discord tokens or passwords** via form
2. **Use HTTPS** in production for all API calls
3. **Sanitize email** before sending to Discord notifications
4. **Validate Discord ID** server-side (not just client-side)
5. **Rate limit** to prevent spam/abuse
6. **Log approvals** for audit trail (optional enhancement)

## Future Enhancements

- [ ] Email notifications on approval/rejection
- [ ] Public status check endpoint (by Discord ID)
- [ ] Bulk export of approved users (CSV)
- [ ] Auto-rejection after 30 days if not reviewed
- [ ] Application history/audit log
- [ ] Webhook integration for external systems
- [ ] Custom approval message templates
- [ ] Multi-language support
