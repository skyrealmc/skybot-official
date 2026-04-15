# Whitelist Form Deployment Guide

How to move the whitelist form from the bot repo to the official website and deploy.

## 📋 URLs

- **Official Website**: https://skyrealm.fun/
- **Bot Website**: https://skybot.up.railway.app/
- **Form Submission API**: https://skybot.up.railway.app/api/whitelist/apply

## ✅ Pre-Deployment Checklist

- ✅ CORS enabled on bot backend (already configured)
- ✅ API endpoint configured in form (already updated)
- ✅ cors npm package installed in bot repo (already done)
- ✅ Bot backend deployed to https://skybot.up.railway.app/

## 📁 Files to Copy to Official Website

Copy these 3 files from the bot repo to your official website repo:

```
Source (Bot Repo):           Destination (Official Website):
dashboard/whitelist/         → whitelist/
├── index.html              → index.html
├── style.css               → style.css
└── whitelist.js            → whitelist.js
```

## 🔧 Configuration Already Done

The form is already configured for cross-domain requests:

```javascript
// dashboard/whitelist/whitelist.js (Line 7)
const API_ENDPOINT = 'https://skybot.up.railway.app/api/whitelist/apply';
```

**This is already set!** No changes needed when you copy the files.

## 🚀 Deployment Steps

### 1. Copy Files to Official Website Repo

```bash
# In your official website repo directory:
mkdir -p whitelist

# Copy the files:
cp /path/to/bot-repo/dashboard/whitelist/index.html whitelist/
cp /path/to/bot-repo/dashboard/whitelist/style.css whitelist/
cp /path/to/bot-repo/dashboard/whitelist/whitelist.js whitelist/
```

### 2. Verify the Files Are Copied

```bash
# Check the files exist:
ls -la whitelist/
# Should show: index.html, style.css, whitelist.js
```

### 3. Test Locally (Optional)

Before pushing to production:

```bash
# Start your official website locally
npm run dev  # or your local server command

# Visit: http://localhost:5000/whitelist/
# (or whatever port your official website uses)

# Fill out form and submit
# Should see: "✓ Application submitted for [username]!"
```

### 4. Deploy Official Website

```bash
# Commit and push to your official website repo:
git add whitelist/
git commit -m "feat: Add whitelist application form"
git push origin main

# Then deploy using your normal deployment process
# (GitHub Pages, Netlify, Vercel, etc.)
```

### 5. Verify Production Deployment

Visit: https://skyrealm.fun/whitelist/

- ✅ Form loads
- ✅ Can fill out form
- ✅ Click "Apply Whitelist"
- ✅ See success message

## 🧪 Test the Complete Flow

### Step 1: Submit Form
1. Visit: https://skyrealm.fun/whitelist/
2. Fill form:
   - Minecraft: `Test_User_01`
   - Discord ID: `123456789012345678` (use a real Discord ID)
   - Email: `test@example.com`
   - Age: `18`
   - ✓ Check rules
3. Click "Apply Whitelist"
4. See: "✓ Application submitted for Test_User_01!"

### Step 2: Check Admin Dashboard
1. Visit: https://skybot.up.railway.app/whitelist
2. Log in as admin (if required)
3. Look in "Pending" tab
4. See the application from Step 1
5. Click "View" to confirm it has your test data

### Step 3: Test Approval
1. Click "Approve" button
2. Enter message: "Test approval message"
3. Click "Confirm"
4. Status changes to "approved" (green)

### Step 4: Check Discord
1. Look in the whitelist announcement channel
2. See the approval embed:
   ```
   ✓ Player Whitelist Approved
   
   Minecraft: Test_User_01
   Discord: @[your user]
   Applied: Just now
   
   Test approval message
   ```

## 🔐 How CORS Works

The form on **https://skyrealm.fun/whitelist/** makes a request to **https://skybot.up.railway.app/api/whitelist/apply**

Without CORS, the browser blocks this cross-domain request. CORS is now enabled on the bot backend to allow:

```
Origin: https://skyrealm.fun ✅ ALLOWED
Methods: POST ✅ ALLOWED
Headers: Content-Type ✅ ALLOWED
```

## 🐛 Troubleshooting

### "CORS Policy Error" when submitting

**Error message:**
```
Access to XMLHttpRequest at 'https://skybot.up.railway.app/api/whitelist/apply' 
from origin 'https://skyrealm.fun' has been blocked by CORS policy
```

**Solution:** CORS is already enabled on the bot backend. If you still see this error:

1. Verify the bot backend is running: https://skybot.up.railway.app/
2. Check bot backend logs for errors
3. Verify CORS middleware is loaded in server/app.js

### Form submits but application doesn't appear in dashboard

1. Check Discord ID format (17-19 digits, no letters)
2. Check browser console (F12) for error message
3. Verify API endpoint is correct: https://skybot.up.railway.app/api/whitelist/apply
4. Check bot backend logs for validation errors

### Success message but no Discord notification

1. Verify Discord ID is correct (must be numeric)
2. Check Discord bot is online
3. Verify whitelist announcement channel is configured
4. Check bot logs for notification errors

## 📦 What Happens After Deployment

```
User fills form on https://skyrealm.fun/whitelist/
         ↓
Form POSTs to https://skybot.up.railway.app/api/whitelist/apply
         ↓
Bot backend validates and stores in MongoDB
         ↓
Admin views in https://skybot.up.railway.app/whitelist
         ↓
Admin approves
         ↓
Discord bot sends notification
         ↓
User sees announcement in Discord
```

All data flows to the bot website. The official website is just the entry point!

## 🎯 Final Checklist Before Going Live

- ✅ Copy whitelist folder to official website repo
- ✅ Official website whitelist folder has: index.html, style.css, whitelist.js
- ✅ Test form locally (optional but recommended)
- ✅ Deploy official website
- ✅ Test form on live https://skyrealm.fun/whitelist/
- ✅ Verify application appears in admin dashboard
- ✅ Test approval workflow
- ✅ Check Discord notification

## 📞 Support

If something goes wrong:

1. Check browser console (F12) for errors
2. Check bot backend logs
3. Verify Discord ID format (17-19 digits)
4. Verify CORS origin matches (https://skyrealm.fun)
5. Verify bot backend is running

## 🎉 Success!

Once deployed:
- Users can apply from the official website
- Applications stored in bot database
- Admins can review in bot dashboard
- Discord bot sends notifications
- Full integration working across domains

**You're ready to deploy!** 🚀
