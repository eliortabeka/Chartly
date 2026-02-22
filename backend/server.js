require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRouter = require('./routes/upload');
const queryRouter = require('./routes/query');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory data store
app.locals.currentData = null;
app.locals.currentColumns = null;

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/query', queryRouter);

// GET current data info
app.get('/api/data', (req, res) => {
  const data = req.app.locals.currentData;
  const columns = req.app.locals.currentColumns;

  if (!data) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: {
      columns,
      preview: data.slice(0, 10),
      totalRows: data.length,
    },
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File is too large. Maximum size is 50MB.',
      code: 'FILE_SIZE_EXCEEDED',
    });
  }

  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
      code: 'INVALID_FILE_TYPE',
    });
  }

  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
