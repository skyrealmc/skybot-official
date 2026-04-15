const mongoose = require("mongoose");

const whitelistConfigSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      description: "Discord ID of the admin who set this config"
    },
    guildId: {
      type: String,
      required: true,
      description: "Target Discord guild/server ID"
    },
    channelId: {
      type: String,
      required: true,
      description: "Target channel ID for sending approval notifications"
    },
    embedTemplate: {
      title: {
        type: String,
        default: "✅ Whitelist Application Approved"
      },
      description: {
        type: String,
        default: "Welcome to Sky Realms SMP! Your whitelist application has been approved."
      },
      color: {
        type: String,
        default: "#28a745"
      },
      footer: {
        type: String,
        default: "Sky Realms SMP"
      },
      author: {
        type: String,
        default: "Whitelist System"
      },
      includeTimestamp: {
        type: Boolean,
        default: true
      }
    },
    rejectionTemplate: {
      title: {
        type: String,
        default: "❌ Whitelist Application Rejected"
      },
      description: {
        type: String,
        default: "Unfortunately, your whitelist application has been rejected. Please try again later."
      },
      color: {
        type: String,
        default: "#dc3545"
      },
      footer: {
        type: String,
        default: "Sky Realms SMP"
      },
      author: {
        type: String,
        default: "Whitelist System"
      },
      includeTimestamp: {
        type: Boolean,
        default: true
      }
    },
    roleId: {
      type: String,
      description: "Optional: Role ID to assign to approved user"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for quick lookup by guildId
whitelistConfigSchema.index({ guildId: 1 });

// Index for quick lookup by adminId
whitelistConfigSchema.index({ adminId: 1 });

module.exports = mongoose.model("WhitelistConfig", whitelistConfigSchema);
