// AI Controller - Announcement generation logic

const { generateAnnouncementSuggestion } = require('../services/groqService');
const logger = require('../utils/logger');

async function generateAnnouncement(req, res) {
  try {
    const { request } = req.body;

    if (!request || typeof request !== 'string' || request.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a request description'
      });
    }

    if (request.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Request is too long (max 500 characters)'
      });
    }

    logger.info(`[AI] Generating announcement for user ${req.user?.id}: ${request.substring(0, 50)}...`);

    // Generate announcement suggestion using Groq AI
    const suggestion = await generateAnnouncementSuggestion(request, {
      userId: req.user?.id,
      username: req.user?.username
    });

    if (!suggestion.success) {
      return res.status(500).json({
        success: false,
        message: suggestion.message || 'Failed to generate announcement'
      });
    }

    logger.info(`[AI] Successfully generated announcement suggestion`);

    // Return success response
    return res.json({
      success: true,
      message: suggestion.message,
      suggestion: suggestion.data
    });
  } catch (error) {
    logger.error('Error in generateAnnouncement:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while generating announcement'
    });
  }
}

module.exports = {
  generateAnnouncement
};
