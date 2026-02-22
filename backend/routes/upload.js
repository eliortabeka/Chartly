const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseFile } = require('../utils/fileParser');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE',
      });
    }

    const result = parseFile(req.file.path, req.file.originalname);

    // Store data in app-level state
    req.app.locals.currentData = result.data;
    req.app.locals.currentColumns = result.columns;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        columns: result.columns,
        preview: result.data.slice(0, 10),
        totalRows: result.totalRows,
        truncated: result.truncated,
      },
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const errorMap = {
      FILE_SIZE_EXCEEDED: { status: 413, message: 'File is too large. Maximum size is 50MB.' },
      INVALID_FILE_TYPE: { status: 400, message: 'Please upload an Excel (.xlsx, .xls) or CSV file.' },
      EMPTY_DATA: { status: 400, message: 'The uploaded file contains no data.' },
    };

    const mapped = errorMap[error.message] || { status: 500, message: 'Failed to process file.' };

    res.status(mapped.status).json({
      success: false,
      error: mapped.message,
      code: error.message,
    });
  }
});

module.exports = router;
