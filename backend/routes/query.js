const express = require('express');
const { buildPrompt } = require('../utils/promptConstructor');
const { queryClaude } = require('../utils/claudeHandler');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a question.',
        code: 'NO_QUESTION',
      });
    }

    const data = req.app.locals.currentData;
    const columns = req.app.locals.currentColumns;

    if (!data || !data.length) {
      return res.status(400).json({
        success: false,
        error: 'No data uploaded yet. Please upload a file first.',
        code: 'NO_DATA',
      });
    }

    const prompt = buildPrompt(question.trim(), data, columns);
    const result = await queryClaude(prompt);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Query error:', error);

    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.',
        code: 'AUTH_ERROR',
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limited. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process your question. Please try again.',
      code: 'QUERY_ERROR',
    });
  }
});

module.exports = router;
