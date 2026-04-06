const mongoose = require("mongoose");

const buttonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["link", "interaction"], required: true },
    style: { type: String, enum: ["Primary", "Secondary", "Success", "Danger", "Link"], default: "Primary" },
    label: { type: String, required: true },
    url: String,
    customId: String,
    emoji: { type: String, default: "" }
  },
  { _id: false }
);

const componentV2ItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "image", "button", "separator", "media"],
      required: true
    },
    content: { type: String, default: "" },
    url: { type: String, default: "" },
    style: { type: String, default: "" },
    emoji: { type: String, default: "" },
    customId: { type: String, default: "" },
    label: { type: String, default: "" }
  },
  { _id: false }
);

const containerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["container"], required: true, default: "container" },
    children: { type: [componentV2ItemSchema], default: [] }
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["embed", "hybrid", "v2"],
      default: "embed"
    },
    messageContent: { type: String, default: "" },
    embedData: {
      type: Object,
      default: {
        title: "",
        description: "",
        color: "#5865f2",
        author: "",
        footer: "",
        image: "",
        thumbnail: "",
        timestamp: false
      }
    },
    buttons: { type: [buttonSchema], default: [] },
    componentsV2: { type: [containerSchema], default: [] },
    mentions: { type: [Object], default: [] },
    reactions: { type: [String], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Template", templateSchema);
