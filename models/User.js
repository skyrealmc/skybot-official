const mongoose = require("mongoose");

const guildSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    permissions: String
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["admin", "moderator", "owner", "viewer"],
      default: "moderator"
    },
    discordRoleId: { type: String, default: "" }
  },
  { _id: false }
);

const guildRoleSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "moderator", "viewer"],
      default: "viewer"
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String, default: null },
    guilds: { type: [guildSchema], default: [] },
    roles: { type: [roleSchema], default: [] },
    guildRoles: { type: [guildRoleSchema], default: [] },
    allowedGuilds: { type: [String], default: [] },
    isGlobalAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
