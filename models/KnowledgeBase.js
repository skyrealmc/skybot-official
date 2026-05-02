const mongoose = require("mongoose");

const KnowledgeBaseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ["whitelist", "rules", "getting-started", "troubleshooting", "community", "general"],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  keywords: [String],
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for full-text search
KnowledgeBaseSchema.index({ title: "text", content: "text", keywords: "text" });
KnowledgeBaseSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model("KnowledgeBase", KnowledgeBaseSchema);
