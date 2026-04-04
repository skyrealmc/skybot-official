const mongoose = require("mongoose");

const buttonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["link", "interaction"], required: true },
    label: { type: String, required: true },
    url: String,
    customId: String
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    messageContent: { type: String, default: "" },
    embedData: { type: Object, required: true },
    buttons: { type: [buttonSchema], default: [] },
    mentions: { type: [Object], default: [] },
    reactions: { type: [String], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Template", templateSchema);
