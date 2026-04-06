const Template = require("../models/Template");
const logger = require("../utils/logger");

async function saveTemplate(req, res, next) {
  try {
    const template = await Template.create({
      userId: req.session.user.id,
      name: req.body.name,
      messageType: req.body.messageType || "embed",
      messageContent: req.body.messageContent || "",
      embedData: req.body.embedData || {},
      buttons: req.body.buttons || [],
      componentsV2: req.body.componentsV2 || [],
      mentions: req.body.mentions || [],
      reactions: req.body.reactions || []
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error("Failed to save template:", error);
    next(error);
  }
}

async function getTemplates(req, res, next) {
  try {
    const templates = await Template.find({ userId: req.session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(templates);
  } catch (error) {
    next(error);
  }
}

async function renameTemplate(req, res, next) {
  try {
    const { templateId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Template name is required." });
    }

    const template = await Template.findOneAndUpdate(
      { _id: templateId, userId: req.session.user.id },
      { name: name.trim() },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }

    res.json(template);
  } catch (error) {
    logger.error("Failed to rename template:", error);
    next(error);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const { templateId } = req.params;

    const template = await Template.findOneAndDelete({
      _id: templateId,
      userId: req.session.user.id
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete template:", error);
    next(error);
  }
}

async function exportTemplate(req, res, next) {
  try {
    const { templateId } = req.params;

    const template = await Template.findOne({
      _id: templateId,
      userId: req.session.user.id
    }).lean();

    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }

    // Remove internal fields
    const { _id, userId, createdAt, updatedAt, __v } = template;

    const exportData = {
      $schema: "skybot-s2-template-v1",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        messageType: template.messageType,
        messageContent: template.messageContent,
        embedData: template.embedData,
        buttons: template.buttons,
        componentsV2: template.componentsV2,
        mentions: template.mentions,
        reactions: template.reactions
      }
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${template.name.replace(/[^a-z0-9]/gi, "-")}.json"`);
    res.json(exportData);
  } catch (error) {
    logger.error("Failed to export template:", error);
    next(error);
  }
}

async function importTemplate(req, res, next) {
  try {
    const importData = req.body;

    // Validate import data schema
    if (!importData.$schema || importData.$schema !== "skybot-s2-template-v1") {
      return res.status(400).json({ error: "Invalid template format. Expected skybot-s2-template-v1 schema." });
    }

    if (!importData.template || !importData.template.name) {
      return res.status(400).json({ error: "Template name is required." });
    }

    const templateData = importData.template;

    // Validate message type
    const validTypes = ["embed", "hybrid", "v2"];
    if (templateData.messageType && !validTypes.includes(templateData.messageType)) {
      return res.status(400).json({ error: `Invalid message type. Must be one of: ${validTypes.join(", ")}` });
    }

    const template = await Template.create({
      userId: req.session.user.id,
      name: templateData.name,
      messageType: templateData.messageType || "embed",
      messageContent: templateData.messageContent || "",
      embedData: templateData.embedData || {},
      buttons: templateData.buttons || [],
      componentsV2: templateData.componentsV2 || [],
      mentions: templateData.mentions || [],
      reactions: templateData.reactions || []
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error("Failed to import template:", error);
    next(error);
  }
}

async function duplicateTemplate(req, res, next) {
  try {
    const { templateId } = req.params;

    const template = await Template.findOne({
      _id: templateId,
      userId: req.session.user.id
    }).lean();

    if (!template) {
      return res.status(404).json({ error: "Template not found." });
    }

    // Create a copy with " (Copy)" suffix
    const newTemplate = await Template.create({
      userId: req.session.user.id,
      name: `${template.name} (Copy)`,
      messageType: template.messageType,
      messageContent: template.messageContent,
      embedData: template.embedData,
      buttons: template.buttons,
      componentsV2: template.componentsV2,
      mentions: template.mentions,
      reactions: template.reactions
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    logger.error("Failed to duplicate template:", error);
    next(error);
  }
}

module.exports = {
  saveTemplate,
  getTemplates,
  renameTemplate,
  deleteTemplate,
  exportTemplate,
  importTemplate,
  duplicateTemplate
};