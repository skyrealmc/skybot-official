const axios = require("axios");
const logger = require("./logger");

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * Verify Cloudflare Turnstile token
 * @param {string} token - The token from the frontend
 * @param {string} ip - Optional user IP
 * @returns {Promise<boolean>}
 */
async function verifyTurnstileToken(token, ip) {
  if (!TURNSTILE_SECRET_KEY) {
    logger.warn("TURNSTILE_SECRET_KEY is not set. Skipping verification (Insecure).");
    return true; 
  }

  if (!token) {
    return false;
  }

  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip
      })
    );

    const data = response.data;
    if (!data.success) {
      logger.warn("Turnstile verification failed:", data["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Turnstile API error:", error.message);
    return false;
  }
}

module.exports = { verifyTurnstileToken };
