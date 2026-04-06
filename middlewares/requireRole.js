/**
 * Role-based access control middleware
 * 
 * Usage:
 * - requireRole(['admin', 'owner']) - Only admin or owner can access
 * - requireRole(['admin']) - Only admin can access
 * - requireRole() - Any authenticated user with a role can access
 */

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    // Check if user is a global admin (bypasses all role checks)
    if (req.session.user.isGlobalAdmin) {
      return next();
    }

    // If no specific roles required, just check if user has any role
    if (allowedRoles.length === 0) {
      if (!req.session.user.roles || req.session.user.roles.length === 0) {
        return res.status(403).json({ error: "Insufficient permissions. Admin access required." });
      }
      return next();
    }

    // Check if user has one of the required roles
    const userRoles = req.session.user.roles?.map(r => r.type) || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required roles: ${allowedRoles.join(' or ')}.` 
      });
    }

    return next();
  };
}

/**
 * Guild access filter middleware
 * Filters guilds based on user's allowedGuilds list
 * If allowedGuilds is empty, user can access all guilds they have permissions for
 */
function filterAllowedGuilds(guilds, userAllowedGuilds = []) {
  // If no specific guilds are set, return all guilds
  if (!userAllowedGuilds || userAllowedGuilds.length === 0) {
    return guilds;
  }

  // Filter to only allowed guilds
  return guilds.filter(guild => userAllowedGuilds.includes(guild.id));
}

module.exports = {
  requireRole,
  filterAllowedGuilds
};