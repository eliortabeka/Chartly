const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { analyzeData, preAggregate } = require('./dataAnalyzer');

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

  const columns = Object.keys(jsonData[0]);

  // Compute full-dataset statistics — this is what enables large file support
  const dataStats = analyzeData(jsonData, columns);
  const aggregations = preAggregate(jsonData, columns, dataStats.columns);

  return {
    data: jsonData,
    columns,
    totalRows: jsonData.length,
    dataStats,
    aggregations,
  };
}

function parseCSV(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!jsonData.length) {
    throw new Error('EMPTY_DATA');
  }

  const columns = Object.keys(jsonData[0]);

  const dataStats = analyzeData(jsonData, columns);
  const aggregations = preAggregate(jsonData, columns, dataStats.columns);

  return {
    data: jsonData,
    columns,
    totalRows: jsonData.length,
    dataStats,
    aggregations,
  };
}

module.exports = { parseFile };