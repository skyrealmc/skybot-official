const Template = require("../models/Template");

async function saveTemplate(req, res, next) {
  try {
    const template = await Template.create({
      userId: req.session.user.id,
      name: req.body.name,
      messageContent: req.body.messageContent || "",
      embedData: req.body.embedData,
      buttons: req.body.buttons || [],
      mentions: req.body.mentions || [],
      reactions: req.body.reactions || []
    });

    res.status(201).json(template);
  } catch (error) {
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

module.exports = {
  saveTemplate,
  getTemplates
};
