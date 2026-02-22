const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

async function queryClaude(prompt) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text.trim();

  // Try to parse JSON — handle cases where Claude wraps in code fences
  let cleaned = responseText;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed.textAnswer || typeof parsed.textAnswer !== 'string') {
      throw new Error('Missing or invalid textAnswer');
    }
    if (!Array.isArray(parsed.chartData)) {
      parsed.chartData = [];
    }
    if (!parsed.chartType || !['bar', 'pie', 'line', 'table', 'none'].includes(parsed.chartType)) {
      parsed.chartType = 'none';
    }

    return parsed;
  } catch (parseError) {
    // If JSON parsing fails, return the raw text as the answer
    return {
      textAnswer: responseText,
      chartData: [],
      chartType: 'none',
    };
  }
}

module.exports = { queryClaude };
