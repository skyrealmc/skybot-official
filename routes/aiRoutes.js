// AI Routes - Announcement generation endpoints

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const requireAuth = require('../middlewares/requireAuth');

// POST /api/ai/generate-announcement - Generate announcement suggestion
router.post('/generate-announcement', requireAuth, aiController.generateAnnouncement);

module.exports = router;
