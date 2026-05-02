const {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle
} = require("../services/groqService");
const logger = require("../utils/logger");

// GET /api/knowledge-base/articles
async function getArticlesEndpoint(req, res) {
  try {
    const { category } = req.query;
    const articles = await getAllArticles({ category });

    res.json({
      success: true,
      count: articles.length,
      articles
    });
  } catch (error) {
    logger.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
}

// POST /api/knowledge-base/articles
async function createArticleEndpoint(req, res) {
  try {
    const adminId = req.session.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { category, title, content, keywords, priority } = req.body;

    // Validate required fields
    if (!category || !title || !content) {
      return res.status(400).json({ error: "Category, title, and content are required" });
    }

    const result = await createArticle({
      category,
      title,
      content,
      keywords: keywords || [],
      priority: priority || 0,
      createdBy: adminId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      article: result.article
    });
  } catch (error) {
    logger.error("Error creating article:", error);
    res.status(500).json({ error: "Failed to create article" });
  }
}

// PUT /api/knowledge-base/articles/:id
async function updateArticleEndpoint(req, res) {
  try {
    const adminId = req.session.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const { category, title, content, keywords, priority } = req.body;

    // Validate required fields
    if (!category || !title || !content) {
      return res.status(400).json({ error: "Category, title, and content are required" });
    }

    const result = await updateArticle(id, {
      category,
      title,
      content,
      keywords: keywords || [],
      priority: priority || 0
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Article updated successfully",
      article: result.article
    });
  } catch (error) {
    logger.error("Error updating article:", error);
    res.status(500).json({ error: "Failed to update article" });
  }
}

// DELETE /api/knowledge-base/articles/:id
async function deleteArticleEndpoint(req, res) {
  try {
    const adminId = req.session.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    const result = await deleteArticle(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Article deleted successfully"
    });
  } catch (error) {
    logger.error("Error deleting article:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
}

module.exports = {
  getArticlesEndpoint,
  createArticleEndpoint,
  updateArticleEndpoint,
  deleteArticleEndpoint
};
