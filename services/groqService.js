const Groq = require("groq-sdk");
const logger = require("../utils/logger");

// Initialize Groq only if API key is available
const groq = process.env.GROQ_API_KEY 
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
  : null;

/**
 * Generate announcement suggestion based on user request
 * Analyzes the request and returns structured data for announcement creation
 */
async function generateAnnouncementSuggestion(userRequest, context = {}) {
  if (!groq) {
    return {
      success: false,
      message: 'AI service not configured'
    };
  }

  try {
    const systemPrompt = `You are an expert Discord announcement writer for Sky Realms SMP. 
    Analyze the user's request and generate a JSON response with announcement details.
    
    IMPORTANT: Respond with ONLY valid JSON, no other text.
    
    JSON Schema:
    {
      "title": "Clear, attention-grabbing title (max 256 chars)",
      "description": "Detailed announcement content (max 2000 chars)",
      "color": "#RRGGBB color code (choose based on announcement type: red for urgent, green for positive, blue for info, orange for updates)",
      "buttons": [
        {
          "label": "Button text",
          "url": "Optional URL",
          "id": "unique_id"
        }
      ],
      "channel": "announcements or general or news (appropriate channel)",
      "mentions": ["@everyone", "@roles_if_applicable"],
      "reasoning": "Brief explanation of choices"
    }
    
    Guidelines:
    - Mod releases: Green color, include download links, mention @everyone
    - Maintenance/Downtime: Red/Orange, clear timing, mention affected users
    - Server updates: Blue, include patch notes link
    - Events: Green with enthusiasm, include date/time
    - Emergency: Red, urgent tone, mention @everyone
    - General announcements: Blue/Purple, informative
    
    Always include relevant links and make announcements professional yet community-friendly.`;

    const message = await groq.messages.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Create an announcement for: ${userRequest}`
        }
      ],
      system: systemPrompt
    });

    let responseText = message.content[0].text.trim();
    
    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        message: 'Failed to parse announcement data'
      };
    }

    let suggestionData = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!suggestionData.title || !suggestionData.description) {
      return {
        success: false,
        message: 'Invalid announcement data generated'
      };
    }

    logger.info(`[AI] Generated announcement: ${suggestionData.title}`);

    return {
      success: true,
      message: `📝 I've created a "${suggestionData.title}" announcement. Review and customize as needed!`,
      data: {
        title: suggestionData.title.substring(0, 256),
        description: suggestionData.description.substring(0, 2000),
        color: suggestionData.color || '#5865F2',
        buttons: Array.isArray(suggestionData.buttons) ? suggestionData.buttons.slice(0, 5) : [],
        channel: suggestionData.channel || 'announcements',
        mentions: Array.isArray(suggestionData.mentions) ? suggestionData.mentions : [],
        reasoning: suggestionData.reasoning || ''
      }
    };
  } catch (error) {
    logger.error('Error generating announcement suggestion:', error);
    return {
      success: false,
      message: 'Failed to generate announcement. Please try again.'
    };
  }
}

/**
 * Initialize Groq AI service
 */
function initializeGroqService() {
  if (groq) {
    logger.info('Groq AI service initialized');
    return true;
  } else {
    logger.info('Groq AI service not configured (GROQ_API_KEY not set)');
    return false;
  }
}

module.exports = {
  generateAnnouncementSuggestion,
  initializeGroqService
};
