/**
 * dataAnalyzer.js
 *
 * Computes comprehensive statistics on the full dataset server-side.
 * This is the core of large file support — instead of sending raw rows to Claude,
 * we send compact statistical summaries that represent the entire dataset regardless
 * of size. A 10-million-row file produces the same ~2-3KB stats object as a 100-row file.
 */

function analyzeData(data, columns) {
  const totalRows = data.length;
  const stats = {};

  for (const col of columns) {
    stats[col] = analyzeColumn(data, col, totalRows);
  }

  return {
    totalRows,
    totalColumns: columns.length,
    columns: stats,
  };
}

function analyzeColumn(data, col, totalRows) {
  const values = [];
  let nullCount = 0;
  let numericCount = 0;
  let stringCount = 0;

  for (let i = 0; i < totalRows; i++) {
    const val = data[i][col];
    if (val === null || val === undefined || val === '') {
      nullCount++;
      continue;
    }
    values.push(val);
    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '')) {
      numericCount++;
    } else {
      stringCount++;
    }
  }

  const isNumeric = numericCount > stringCount && numericCount > 0;

  if (isNumeric) {
    return buildNumericStats(values, col, totalRows, nullCount);
  } else {
    return buildCategoricalStats(values, col, totalRows, nullCount);
  }
}

function buildNumericStats(values, col, totalRows, nullCount) {
  const nums = values
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) {
    return { type: 'numeric', nullCount, validCount: 0 };
  }

  nums.sort((a, b) => a - b);

  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const min = nums[0];
  const max = nums[nums.length - 1];

  // Median
  const mid = Math.floor(nums.length / 2);
  const median = nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];

  // Quartiles
  const q1 = percentile(nums, 25);
  const q3 = percentile(nums, 75);

  // Standard deviation
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);

  // Histogram — 10 buckets
  const histogram = buildHistogram(nums, min, max, 10);

  return {
    type: 'numeric',
    validCount: nums.length,
    nullCount,
    min: round(min),
    max: round(max),
    mean: round(mean),
    median: round(median),
    sum: round(sum),
    stdDev: round(stdDev),
    q1: round(q1),
    q3: round(q3),
    histogram,
  };
}

function buildCategoricalStats(values, col, totalRows, nullCount) {
  const freq = {};
  for (const val of values) {
    const key = String(val);
    freq[key] = (freq[key] || 0) + 1;
  }

  const uniqueCount = Object.keys(freq).length;

  // Top values by frequency (up to 20)
  const topValues = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([value, count]) => ({ value, count }));

  return {
    type: 'categorical',
    validCount: values.length,
    nullCount,
    uniqueCount,
    topValues,
  };
}

function buildHistogram(sortedNums, min, max, buckets) {
  if (min === max) {
    return [{ range: `${min}`, count: sortedNums.length }];
  }

  const step = (max - min) / buckets;
  const bins = [];

  for (let i = 0; i < buckets; i++) {
    const lo = min + step * i;
    const hi = min + step * (i + 1);
    bins.push({
      range: `${round(lo)}-${round(hi)}`,
      count: 0,
    });
  }

  for (const num of sortedNums) {
    let idx = Math.floor((num - min) / step);
    if (idx >= buckets) idx = buckets - 1;
    bins[idx].count++;
  }

  return bins;
}

function percentile(sortedArr, p) {
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

function round(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Pre-aggregates data by grouping on categorical columns and summing/averaging numeric columns.
 * This lets Claude answer questions like "total revenue by region" without seeing all rows.
 */
function preAggregate(data, columns, stats) {
  const categoricalCols = columns.filter((c) => stats[c].type === 'categorical');
  const numericCols = columns.filter((c) => stats[c].type === 'numeric');

  if (categoricalCols.length === 0 || numericCols.length === 0) {
    return null;
  }

  const aggregations = {};

  // For each categorical column, group and aggregate numeric columns
  // Limit to categorical columns with <= 50 unique values to keep output compact
  const usableCatCols = categoricalCols.filter(
    (c) => stats[c].uniqueCount <= 50,
  );

  for (const catCol of usableCatCols.slice(0, 5)) {
    const groups = {};

    for (const row of data) {
      const key = String(row[catCol] ?? '(empty)');
      if (!groups[key]) {
        groups[key] = { count: 0 };
        for (const numCol of numericCols) {
          groups[key][numCol] = { sum: 0, count: 0 };
        }
      }
      groups[key].count++;

      for (const numCol of numericCols) {
        const val = typeof row[numCol] === 'number' ? row[numCol] : Number(row[numCol]);
        if (!isNaN(val)) {
          groups[key][numCol].sum += val;
          groups[key][numCol].count++;
        }
      }
    }

    // Compute averages
    const result = {};
    for (const [key, group] of Object.entries(groups)) {
      result[key] = { count: group.count };
      for (const numCol of numericCols) {
        result[key][numCol] = {
          sum: round(group[numCol].sum),
          avg: group[numCol].count > 0 ? round(group[numCol].sum / group[numCol].count) : 0,
        };
      }
    }

    aggregations[catCol] = result;
  }

  return Object.keys(aggregations).length > 0 ? aggregations : null;
}

/**
 * Returns a stratified sample of the dataset.
 * Instead of just taking the first N rows, we take rows from evenly spaced positions
 * throughout the dataset. This gives a more representative view of the data.
 */
function getStratifiedSample(data, sampleSize) {
  if (data.length <= sampleSize) {
    return data;
  }

  const sample = [];
  const step = data.length / sampleSize;

  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.min(Math.floor(i * step), data.length - 1);
    sample.push(data[idx]);
  }

  return sample;
}

module.exports = { analyzeData, preAggregate, getStratifiedSample };