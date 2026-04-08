const { PermissionsBitField } = require("discord.js");

const DASHBOARD_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MODERATOR: "moderator",
  VIEWER: "viewer"
};

const ROLE_CAPABILITIES = {
  [DASHBOARD_ROLES.OWNER]: {
    full_access: true,
    manage_settings: true,
    manage_templates: true,
    send_messages: true,
    view_analytics: true,
    view_only: true
  },
  [DASHBOARD_ROLES.ADMIN]: {
    full_access: false,
    manage_settings: false,
    manage_templates: true,
    send_messages: true,
    view_analytics: true,
    view_only: true
  },
  [DASHBOARD_ROLES.MODERATOR]: {
    full_access: false,
    manage_settings: false,
    manage_templates: false,
    send_messages: true,
    view_analytics: false,
    view_only: true
  },
  [DASHBOARD_ROLES.VIEWER]: {
    full_access: false,
    manage_settings: false,
    manage_templates: false,
    send_messages: false,
    view_analytics: false,
    view_only: true
  }
};

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  return ROLE_CAPABILITIES[value] ? value : DASHBOARD_ROLES.VIEWER;
}

function hasDiscordAdminPerms(permissionBits) {
  const permissions = BigInt(permissionBits || "0");
  const administrator = BigInt(PermissionsBitField.Flags.Administrator);
  return (permissions & administrator) !== 0n;
}

function hasDiscordManageGuildPerms(permissionBits) {
  const permissions = BigInt(permissionBits || "0");
  const manageGuild = BigInt(PermissionsBitField.Flags.ManageGuild);
  const administrator = BigInt(PermissionsBitField.Flags.Administrator);
  return (permissions & manageGuild) !== 0n || (permissions & administrator) !== 0n;
}

function resolveRoleForGuild({ user, guild }) {
  if (user?.isGlobalAdmin) {
    return DASHBOARD_ROLES.OWNER;
  }

  const guildRole = Array.isArray(user?.guildRoles)
    ? user.guildRoles.find((entry) => entry.guildId === guild.id)
    : null;

  if (guildRole?.role) {
    return normalizeRole(guildRole.role);
  }

  if (hasDiscordAdminPerms(guild.permissions)) {
    return DASHBOARD_ROLES.OWNER;
  }

  if (hasDiscordManageGuildPerms(guild.permissions)) {
    return DASHBOARD_ROLES.ADMIN;
  }

  const globalRole = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles[0].type
    : DASHBOARD_ROLES.VIEWER;
  return normalizeRole(globalRole);
}

function buildCapabilities(role) {
  const normalized = normalizeRole(role);
  return {
    ...ROLE_CAPABILITIES[normalized]
  };
}

function hasCapability(guildAccess, capability) {
  if (!guildAccess || !capability) return false;
  return Boolean(guildAccess.capabilities?.full_access || guildAccess.capabilities?.[capability]);
}

function getGuildAccess(session, guildId) {
  const list = session?.guildAccess || [];
  return list.find((entry) => entry.id === guildId) || null;
}

function getAccessibleGuildIds(session, capability, { requireBotPresent = true } = {}) {
  const list = session?.guildAccess || [];
  return list
    .filter((entry) => {
      if (requireBotPresent && !entry.botPresent) return false;
      if (!capability) return true;
      return hasCapability(entry, capability);
    })
    .map((entry) => entry.id);
}

function buildInviteUrl({ clientId, guildId }) {
  if (!clientId || !guildId) return "";
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("permissions", String(PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.EmbedLinks | PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.AddReactions));
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("disable_guild_select", "true");
  return url.toString();
}

function buildAccountCapabilities(guildAccessList = []) {
  return guildAccessList.reduce(
    (acc, guild) => {
      if (!guild.botPresent) return acc;
      Object.keys(acc).forEach((key) => {
        acc[key] = acc[key] || Boolean(guild.capabilities?.[key]);
      });
      return acc;
    },
    {
      full_access: false,
      manage_settings: false,
      manage_templates: false,
      send_messages: false,
      view_analytics: false,
      view_only: false
    }
  );
}

module.exports = {
  DASHBOARD_ROLES,
  hasDiscordManageGuildPerms,
  resolveRoleForGuild,
  buildCapabilities,
  hasCapability,
  getGuildAccess,
  getAccessibleGuildIds,
  buildInviteUrl,
  buildAccountCapabilities
};
