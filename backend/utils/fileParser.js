const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const MAX_ROWS = 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function parseFile(filePath, originalName) {
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('FILE_SIZE_EXCEEDED');
  }

  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.csv') {
    return parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  } else {
    throw new Error('INVALID_FILE_TYPE');
  }
}

function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!jsonData.length) {
    throw new Error('EMPTY_DATA');
  }

  const limited = jsonData.slice(0, MAX_ROWS);
  const columns = Object.keys(limited[0]);

  return {
    data: limited,
    columns,
    totalRows: jsonData.length,
    truncated: jsonData.length > MAX_ROWS,
  };
}

function parseCSV(filePath) {
  // Use xlsx to parse CSV as well — it handles CSV natively
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!jsonData.length) {
    throw new Error('EMPTY_DATA');
  }

  const limited = jsonData.slice(0, MAX_ROWS);
  const columns = Object.keys(limited[0]);

  return {
    data: limited,
    columns,
    totalRows: jsonData.length,
    truncated: jsonData.length > MAX_ROWS,
  };
}

module.exports = { parseFile };
