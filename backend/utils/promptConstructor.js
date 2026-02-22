const { getStratifiedSample } = require('./dataAnalyzer');

/**
 * Threshold: if dataset has <= this many rows, include ALL data in the prompt.
 * Above this, we switch to stats + sample + aggregations mode.
 */
const SMALL_DATASET_THRESHOLD = 200;

/**
 * Number of sample rows to include for large datasets.
 * These are stratified (evenly spaced) across the full dataset.
 */
const SAMPLE_SIZE = 30;

function buildPrompt(question, data, columns, dataStats, aggregations) {
  const totalRows = data.length;

  // Small dataset: include ALL rows directly (same as before, but with higher limit)
  if (totalRows <= SMALL_DATASET_THRESHOLD) {
    return buildSmallDatasetPrompt(question, data, columns, totalRows);
  }

  // Large dataset: use statistics + sample + aggregations
  return buildLargeDatasetPrompt(question, data, columns, dataStats, aggregations);
}

/**
 * For small files: include all data directly. Claude sees every row.
 */
function buildSmallDatasetPrompt(question, data, columns, totalRows) {
  const columnInfo = buildColumnInfo(data, columns);

  return `You are a data analysis assistant. A user has uploaded a dataset and wants to ask questions about it.

Here are the column names and their data types with sample values:
${columnInfo.join('\n')}

Total rows in dataset: ${totalRows}

Here is the COMPLETE dataset (all ${totalRows} rows):
${JSON.stringify(data, null, 0)}

User question: ${question}

${responseFormatInstructions()}`;
}

/**
 * For large files: send statistics, sample rows, and pre-aggregated data.
 * This is the key innovation — the stats represent the FULL dataset regardless of size.
 */
function buildLargeDatasetPrompt(question, data, columns, dataStats, aggregations) {
  const sample = getStratifiedSample(data, SAMPLE_SIZE);

  // Build column statistics section
  const statsSection = buildStatsSection(dataStats);

  // Build aggregations section
  const aggSection = aggregations ? buildAggregationsSection(aggregations) : '';

  return `You are a data analysis assistant. A user has uploaded a LARGE dataset (${dataStats.totalRows.toLocaleString()} rows, ${dataStats.totalColumns} columns) and wants to ask questions about it.

IMPORTANT: This dataset is too large to include in full. Instead, you are provided with:
1. Complete statistical summary computed over ALL ${dataStats.totalRows.toLocaleString()} rows
2. A representative sample of ${sample.length} rows (evenly spaced throughout the dataset)
3. Pre-computed group-by aggregations across the full dataset

Use the statistics and aggregations as your PRIMARY source of truth — they cover every row. The sample rows are provided only to help you understand the data format and spot-check values.

=== COLUMN STATISTICS (computed over ALL ${dataStats.totalRows.toLocaleString()} rows) ===
${statsSection}

${aggSection ? `=== PRE-COMPUTED AGGREGATIONS (computed over ALL ${dataStats.totalRows.toLocaleString()} rows) ===\n${aggSection}\n` : ''}=== SAMPLE ROWS (${sample.length} rows, stratified from full dataset) ===
${JSON.stringify(sample, null, 0)}

User question: ${question}

${responseFormatInstructions()}`;
}

function buildColumnInfo(data, columns) {
  return columns.map((col) => {
    const sampleValues = data
      .slice(0, 5)
      .map((row) => row[col])
      .filter((v) => v !== '' && v !== null && v !== undefined);
    const types = sampleValues.map((v) => typeof v);
    const uniqueTypes = [...new Set(types)];
    return `- ${col} (${uniqueTypes.join('/')}): e.g. ${sampleValues.slice(0, 3).join(', ')}`;
  });
}

function buildStatsSection(dataStats) {
  const lines = [];

  for (const [col, stats] of Object.entries(dataStats.columns)) {
    if (stats.type === 'numeric') {
      lines.push(`📊 ${col} [numeric]:`);
      lines.push(`   Valid: ${stats.validCount}, Null/empty: ${stats.nullCount}`);
      lines.push(`   Min: ${stats.min}, Max: ${stats.max}, Mean: ${stats.mean}, Median: ${stats.median}`);
      lines.push(`   Sum: ${stats.sum}, Std Dev: ${stats.stdDev}`);
      lines.push(`   Q1: ${stats.q1}, Q3: ${stats.q3}`);
      if (stats.histogram) {
        const histStr = stats.histogram
          .filter((b) => b.count > 0)
          .map((b) => `${b.range}: ${b.count}`)
          .join(', ');
        lines.push(`   Distribution: ${histStr}`);
      }
    } else {
      lines.push(`🏷️ ${col} [categorical]:`);
      lines.push(`   Valid: ${stats.validCount}, Null/empty: ${stats.nullCount}, Unique values: ${stats.uniqueCount}`);
      const topStr = stats.topValues
        .slice(0, 10)
        .map((tv) => `"${tv.value}" (${tv.count})`)
        .join(', ');
      lines.push(`   Top values: ${topStr}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildAggregationsSection(aggregations) {
  const lines = [];

  for (const [catCol, groups] of Object.entries(aggregations)) {
    lines.push(`Group by "${catCol}":`);
    for (const [groupVal, metrics] of Object.entries(groups)) {
      const metricStrs = Object.entries(metrics)
        .filter(([k]) => k !== 'count')
        .map(([numCol, vals]) => `${numCol}: sum=${vals.sum}, avg=${vals.avg}`)
        .join('; ');
      lines.push(`  ${groupVal} (${metrics.count} rows): ${metricStrs}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function responseFormatInstructions() {
  return `Please respond with ONLY valid JSON in exactly this structure (no markdown, no code fences):
{
  "textAnswer": "Natural language explanation answering the user's question. Use markdown formatting for readability.",
  "chartData": [{"label": "Category1", "value": 100}, {"label": "Category2", "value": 200}],
  "chartType": "bar"
}

Rules:
- chartType must be one of: "bar", "pie", "line", "table", "none"
- For "table" chartType, chartData should be an array of objects with the relevant columns
- For "line" chartType, ensure data is ordered logically (by date, sequence, etc.)
- If the question doesn't need a chart, set chartData to [] and chartType to "none"
- For pie charts, include no more than 10 slices (group small values into "Other")
- All numeric values in chartData must be numbers, not strings
- The textAnswer should be comprehensive and well-formatted with markdown`;
}

module.exports = { buildPrompt };