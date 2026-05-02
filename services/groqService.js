const Groq = require("groq-sdk");
const KnowledgeBase = require("../models/KnowledgeBase");
const logger = require("../utils/logger");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// System prompt for the community assistant
const SYSTEM_PROMPT = `You are a helpful Discord bot assistant for Sky Realms SMP, a Minecraft community. Your role is to:
1. Help members understand the whitelist application process
2. Answer questions about server rules and community guidelines
3. Provide troubleshooting help for common issues
4. Represent the community professionally and warmly

Important guidelines:
- Be friendly, professional, and concise (Discord has message limits)
- Keep responses under 2000 characters when possible
- If unsure, say so and suggest contacting staff via Discord
- Never share sensitive information or admin credentials
- For whitelist issues, guide them to the application website
- Always include relevant links when appropriate`;

/**
 * Get relevant knowledge base articles for a query
 */
async function getRelevantKnowledge(query) {
  try {
    // Search by keywords and full-text
    const articles = await KnowledgeBase.find({
      isActive: true,
      $or: [
        { $text: { $search: query } },
        { keywords: { $in: query.toLowerCase().split(" ") } }
      ]
    })
      .select("category title content keywords priority")
      .sort({ priority: -1, score: { $meta: "textScore" } })
      .limit(3)
      .lean();

    if (articles.length === 0) {
      // Fallback: get articles from most relevant category
      const categoryMatch = await KnowledgeBase.findOne({
        isActive: true,
        category: { $in: ["general", "getting-started"] }
      })
        .sort({ priority: -1 })
        .lean();

      return categoryMatch ? [categoryMatch] : [];
    }

    return articles;
  } catch (error) {
    logger.error("Error fetching knowledge base articles:", error);
    return [];
  }
}

/**
 * Generate response using Groq AI with knowledge base context
 */
async function generateResponse(userMessage, context = {}) {
  try {
    // Get relevant knowledge base articles
    const knowledgeArticles = await getRelevantKnowledge(userMessage);

    // Build context from knowledge base
    let knowledgeContext = "";
    if (knowledgeArticles.length > 0) {
      knowledgeContext = "\n\nRelevant information from our knowledge base:\n";
      knowledgeArticles.forEach((article, i) => {
        knowledgeContext += `\n${i + 1}. **${article.title}** (${article.category}):\n${article.content}\n`;
      });
    }

    // Build the message for Groq
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + knowledgeContext
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    // Add context if provided (like username, guild info)
    if (context.username) {
      messages[0].content += `\n\nUser: ${context.username}`;
    }

    const response = await groq.chat.completions.create({
      messages,
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stop: null
    });

    const reply = response.choices[0]?.message?.content || "I couldn't generate a response. Please try again or contact staff.";

    return {
      success: true,
      reply: reply.slice(0, 2000),
      sourceArticles: knowledgeArticles.map(a => ({ title: a.title, category: a.category }))
    };
  } catch (error) {
    logger.error("Error generating response with Groq:", error);
    return {
      success: false,
      reply: "I encountered an error processing your question. Please try again or contact staff in Discord.",
      error: error.message
    };
  }
}

/**
 * Get all knowledge base articles (for dashboard)
 */
async function getAllArticles(filters = {}) {
  try {
    const query = { isActive: true };

    if (filters.category) {
      query.category = filters.category;
    }

    const articles = await KnowledgeBase.find(query)
      .sort({ category: 1, priority: -1, createdAt: -1 })
      .lean();

    return articles;
  } catch (error) {
    logger.error("Error fetching all articles:", error);
    return [];
  }
}

/**
 * Create a new knowledge base article
 */
async function createArticle(data) {
  try {
    const article = new KnowledgeBase({
      category: data.category,
      title: data.title,
      content: data.content,
      keywords: data.keywords || [],
      priority: data.priority || 0,
      createdBy: data.createdBy
    });

    await article.save();
    logger.info(`Knowledge base article created: ${article.title}`);
    return { success: true, article };
  } catch (error) {
    logger.error("Error creating article:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a knowledge base article
 */
async function updateArticle(articleId, data) {
  try {
    const article = await KnowledgeBase.findByIdAndUpdate(
      articleId,
      {
        title: data.title,
        content: data.content,
        category: data.category,
        keywords: data.keywords || [],
        priority: data.priority || 0,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!article) {
      return { success: false, error: "Article not found" };
    }

    logger.info(`Knowledge base article updated: ${article.title}`);
    return { success: true, article };
  } catch (error) {
    logger.error("Error updating article:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a knowledge base article
 */
async function deleteArticle(articleId) {
  try {
    const article = await KnowledgeBase.findByIdAndUpdate(
      articleId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!article) {
      return { success: false, error: "Article not found" };
    }

    logger.info(`Knowledge base article deleted: ${article.title}`);
    return { success: true };
  } catch (error) {
    logger.error("Error deleting article:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize knowledge base with default articles
 */
async function initializeDefaultArticles() {
  try {
    const count = await KnowledgeBase.countDocuments();

    // Only initialize if empty
    if (count > 0) {
      logger.info("Knowledge base already initialized");
      return;
    }

    const defaultArticles = [
      {
        category: "whitelist",
        title: "How to Apply for Whitelist",
        content: `To apply for the Sky Realms SMP whitelist:

1. Visit the official whitelist application form
2. Enter your Minecraft username (case-sensitive)
3. Provide your Discord User ID (enable Developer Mode in Discord settings → right-click profile → Copy User ID)
4. Enter a valid email address
5. Confirm your age (must be 13+)
6. Agree to the server rules
7. Submit your application

Staff will review your application and you'll receive an email update. Whitelist results are announced in Discord!`,
        keywords: ["whitelist", "apply", "application", "form", "how to"],
        priority: 10
      },
      {
        category: "whitelist",
        title: "Discord User ID - How to Find It",
        content: `To find your Discord User ID:

1. Open Discord
2. Go to User Settings (gear icon)
3. Click "Advanced" in the left sidebar
4. Enable "Developer Mode" (toggle the switch)
5. Close settings and right-click your profile name anywhere
6. Click "Copy User ID"
7. Paste this ID in the whitelist application form

Your User ID is a 17-19 digit number (e.g., 123456789012345678).
Do NOT use your username - use your numeric ID!`,
        keywords: ["discord", "id", "user id", "find", "developer mode"],
        priority: 9
      },
      {
        category: "rules",
        title: "Server Rules",
        content: `Sky Realms SMP Community Rules:

1. **Respect** - Treat all members with kindness and respect
2. **No Griefing** - Don't destroy or steal others' builds
3. **No Hacking/Cheats** - Vanilla survival only (no hacked clients)
4. **English** - Use English in public channels
5. **No Spam** - Don't spam chat, messages, or commands
6. **No NSFW** - Keep content appropriate for all ages
7. **Follow Discord TOS** - You must be 13+ to participate
8. **Listen to Staff** - Moderators keep the server fun and safe

Violations may result in warnings, kicks, or permanent bans.`,
        keywords: ["rules", "server", "guidelines", "policy", "violations"],
        priority: 10
      },
      {
        category: "getting-started",
        title: "First Steps on Sky Realms",
        content: `Welcome to Sky Realms SMP! Here's what to do first:

1. **Join the Discord** - Get updates and connect with the community
2. **Read the Rules** - Make sure you understand server guidelines
3. **Find a Spawn Location** - Don't build too close to spawn
4. **Get Settled** - Gather resources and start your base
5. **Introduce Yourself** - Say hi in Discord to meet other players
6. **Explore** - The map is huge - find your favorite biome!
7. **Enjoy!** - This is a community - help each other and have fun

Need help? Ask questions in Discord! Staff and veterans are happy to help.`,
        keywords: ["welcome", "start", "first", "new", "help"],
        priority: 8
      },
      {
        category: "troubleshooting",
        title: "Whitelist Application Rejected",
        content: `If your whitelist application was rejected:

**Common reasons:**
- Incomplete or low-effort application
- Discord ID or Minecraft username mismatch
- Previous rule violations
- Age requirement not met

**What to do:**
1. Wait 7 days before reapplying (if allowed)
2. Write a more detailed application next time
3. Double-check your Discord ID and Minecraft username
4. Join the Discord and ask staff for feedback
5. Don't spam - staff will help if they can

Staff may not always explain rejections, but they want members who will be good community fits.`,
        keywords: ["rejected", "rejected", "reapply", "denied", "why"],
        priority: 7
      },
      {
        category: "troubleshooting",
        title: "Application Stuck in Pending",
        content: `If your application has been pending for a while:

**Typical review time:** 24-72 hours
**Peak times:** May take longer during busy periods

**What to do:**
1. Be patient - staff reviews applications manually
2. Join the Discord to stay updated
3. Don't spam the form - multiple applications may cause rejection
4. If pending for over a week, mention it in Discord
5. Staff will prioritize if there's an issue

**Note:** Sometimes applications are intentionally held while staff verify information.`,
        keywords: ["pending", "stuck", "waiting", "how long", "status"],
        priority: 7
      },
      {
        category: "general",
        title: "About Sky Realms SMP",
        content: `Sky Realms SMP is a vanilla survival Minecraft server focused on community, creativity, and cooperative gameplay.

**Server Details:**
- **Version:** Latest Java Edition
- **Gameplay:** Vanilla Survival (no plugins that affect gameplay)
- **Community:** Welcoming and inclusive
- **Rules:** Enforced to keep everyone safe and having fun
- **Playstyle:** Building, exploring, and enjoying together

**Join us on Discord** for announcements, events, and to connect with the community!`,
        keywords: ["sky realms", "about", "server", "info", "version"],
        priority: 6
      },
      {
        category: "community",
        title: "Community Values",
        content: `Sky Realms is built on these core values:

🤝 **Respect** - We value every member and their contributions
🎨 **Creativity** - Express yourself through your builds and ideas
🆘 **Helpfulness** - We help each other succeed and have fun
🌍 **Inclusivity** - Everyone is welcome regardless of background
🎮 **Fun** - This is a game - enjoy it and help others enjoy it too

When in doubt, ask yourself: "Is this respectful to the community?" Usually, the answer will guide you right.`,
        keywords: ["community", "values", "culture", "welcoming"],
        priority: 6
      }
    ];

    await KnowledgeBase.insertMany(defaultArticles);
    logger.info(`Initialized knowledge base with ${defaultArticles.length} default articles`);
  } catch (error) {
    logger.error("Error initializing knowledge base:", error);
  }
}

module.exports = {
  generateResponse,
  getRelevantKnowledge,
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  initializeDefaultArticles
};
