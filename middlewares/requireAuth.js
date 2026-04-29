function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "You must be logged in with Discord."
    });
  }

  return next();
}

module.exports = requireAuth;
