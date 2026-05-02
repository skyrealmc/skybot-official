# 🤖 Groq AI Community Assistant - Setup Guide

Welcome! This guide will help you set up the AI-powered community assistant for Sky Realms SMP.

## What's New?

The system includes:
- **Discord Slash Command** (`/ask`) - Ask questions about the server
- **Mention Support** - Reply to the bot with questions  
- **DM Support** - Message the bot directly
- **Knowledge Base Management** - Admin dashboard to create/edit help articles
- **Smart Context** - Bot uses your knowledge base to answer questions

## Prerequisites

✅ Discord bot token (already have)  
✅ MongoDB database (already have)  
✅ **Groq API key** (need to get)

## Step 1: Get Your Groq API Key

1. Go to https://console.groq.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need this in the next step)

**Note:** Groq offers free tier with generous rate limits - perfect for community bots!

## Step 2: Update Your .env File

Add this line to your `.env` file:

```
GROQ_API_KEY=your_actual_groq_api_key_here
```

Replace `your_actual_groq_api_key_here` with the key you got from Groq.

**Important:** Keep this key SECRET! Never share it or commit it to GitHub.

## Step 3: Bot Permissions

Make sure your Discord bot has these permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

## Step 4: Deploy & Test

1. **Deploy to Railway:**
   ```bash
   git add .
   git commit -m "Add Groq AI Community Assistant"
   git push origin main
   ```

2. **Wait for deployment** (2-5 minutes)

3. **Test in Discord:**

   **Option A: Slash Command**
   ```
   /ask How do I apply for the whitelist?
   ```

   **Option B: Mention**
   ```
   @bot How do I apply for the whitelist?
   ```

   **Option C: DM**
   Just message the bot directly with any question

## Step 5: Manage Knowledge Base

The bot comes with **pre-loaded articles** about:
- How to apply for whitelist
- Finding Discord User ID
- Server rules
- Getting started guide
- Troubleshooting common issues
- Community values

**To add more articles:**

1. Go to `https://your-domain/knowledge-base` (dashboard)
2. Click **+ New Article**
3. Fill in:
   - **Category** (whitelist, rules, etc.)
   - **Title** (what people search for)
   - **Content** (the answer/help text)
   - **Keywords** (search terms, optional)
   - **Priority** (0-10, higher shows first)
4. Click **Save Article**

**To edit/delete:**
- Find the article in the dashboard
- Click Edit or Delete button

## How It Works

### When someone asks a question:

1. **Bot receives** the message via `/ask`, mention, or DM
2. **Bot searches** the knowledge base for relevant articles
3. **Groq AI analyzes** the question + knowledge base
4. **Bot responds** with a helpful, contextualized answer
5. **Bot shows** sources (which articles it used)

### Example:

**Member asks:** "How do I find my Discord ID?"

**Bot searches knowledge base** → finds "Discord User ID - How to Find It" article

**Groq AI** → generates response from article + system prompt

**Bot responds:** Detailed answer with step-by-step instructions

## Features

✨ **Smart Search** - Natural language matching, not just keywords  
✨ **Context Aware** - Remembers your community knowledge base  
✨ **Source Attribution** - Shows which articles it used  
✨ **Multiple Interfaces** - Slash commands, mentions, DMs  
✨ **Easy Management** - Web dashboard to manage articles  
✨ **Fast** - Groq is super fast (5-10x faster than other providers)  
✨ **Free Tier** - No credit card for testing!

## Troubleshooting

### Bot doesn't respond
- ✅ Check that `GROQ_API_KEY` is set in .env
- ✅ Restart the bot after updating .env
- ✅ Check bot permissions in Discord

### Responses are generic/wrong
- ✅ Add more articles to knowledge base
- ✅ Use specific keywords in article titles
- ✅ Update existing articles with better content

### Rate limiting
- ✅ Groq free tier: 30 requests per minute (plenty!)
- ✅ If you hit limits, upgrade on Groq console

### Bot says "I don't know"
- ✅ This means no relevant articles found
- ✅ Create an article about that topic
- ✅ Add keywords to help bot find it

## Commands Reference

| Command | Usage | Context |
|---------|-------|---------|
| `/ask` | `/ask <question>` | Slash command in any channel |
| `@mention` | `@bot <question>` | Reply to bot anywhere |
| `DM` | Message bot directly | Private messages |

## Dashboard

Access the Knowledge Base manager at:
```
https://your-domain/knowledge-base
```

Requirements:
- ✅ Logged into dashboard
- ✅ Have "manage_settings" capability (admin)

## Environment Variables Recap

```env
# Required for AI features
GROQ_API_KEY=grsk_xxxxxxxxxxxxxxxxxxxxx

# Already configured
DISCORD_TOKEN=...
MONGO_URI=...
CLIENT_ID=...
CLIENT_SECRET=...
```

## What Gets Stored

- ✅ Questions are NOT logged permanently
- ✅ Knowledge base articles are stored in MongoDB
- ✅ Conversation history is NOT saved
- ✅ Only metadata (timestamps, user IDs) for analytics

## Performance Notes

- Groq API: ~300-500ms response time
- Database lookups: ~50-100ms
- Total response time: Usually under 1 second

## Support

If the AI isn't working:

1. Check logs: Look for errors mentioning "Groq" or "AI"
2. Verify API key is correct
3. Test with a simple question first
4. Add more articles to knowledge base

## Next Steps

1. ✅ Add your Groq API key to .env
2. ✅ Restart the bot
3. ✅ Test with `/ask How to apply for whitelist?`
4. ✅ Log into dashboard and customize knowledge base
5. ✅ Announce feature in Discord!

## Features Coming Soon

- 📅 Scheduled message summaries
- 📊 AI analytics dashboard
- 🔄 Auto-generate FAQ from support questions
- 🌐 Multi-language support

---

Enjoy your new AI assistant! Questions? Check the knowledge base or ask the bot itself! 🚀
