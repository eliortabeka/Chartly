function buildPrompt(question, data, columns) {
  const sampleSize = Math.min(data.length, 50);
  const sampleData = data.slice(0, sampleSize);

  const columnInfo = columns.map((col) => {
    const sampleValues = data
      .slice(0, 5)
      .map((row) => row[col])
      .filter((v) => v !== '' && v !== null && v !== undefined);
    const types = sampleValues.map((v) => typeof v);
    const uniqueTypes = [...new Set(types)];
    return `- ${col} (${uniqueTypes.join('/')}): e.g. ${sampleValues.slice(0, 3).join(', ')}`;
  });

  return `You are a data analysis assistant. A user has uploaded a dataset and wants to ask questions about it.

Here are the column names and their data types with sample values:
${columnInfo.join('\n')}

Total rows in dataset: ${data.length}

Here is the dataset (first ${sampleSize} rows):
${JSON.stringify(sampleData, null, 0)}

User question: ${question}

Please respond with ONLY valid JSON in exactly this structure (no markdown, no code fences):
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
