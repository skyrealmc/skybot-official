function requireAuth(req, res, next) {
  // Allow access if a valid internal API key is provided (for the AI platform)
  const aiPlatformKey = req.headers["x-ai-platform-key"];
  const internalKey = process.env.INTERNAL_API_KEY;

  if (internalKey && aiPlatformKey === internalKey) {
    return next();
  }

  if (!req.session.user) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "You must be logged in with Discord."
    });
  }

  return next();
}

module.exports = requireAuth;
