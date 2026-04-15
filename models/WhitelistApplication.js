const mongoose = require("mongoose");

const whitelistApplicationSchema = new mongoose.Schema(
  {
    minecraftUsername: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 16
    },
    discordId: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    age: {
      type: Number,
      required: true,
      min: 13,
      max: 99
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    reviewedBy: {
      type: String,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    approvalMessage: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Prevent duplicate submissions from same Discord ID within 24 hours
whitelistApplicationSchema.index({ discordId: 1, createdAt: -1 });

module.exports = mongoose.model("WhitelistApplication", whitelistApplicationSchema);
