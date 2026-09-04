const DEFAULT_BASE_URL = 'http://127.0.0.1:3001/v1';
const DEFAULT_MODEL = 'auto:fast';
const DEFAULT_TIMEOUT_MS = 6500;

function endpoint() {
  const base = (process.env.FREE_LLM_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

function normalizeLine(value, maxLength = 160) {
  let text = String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text.replace(/^['"«]+|['"»]+$/g, '').trim();
  const firstSentence = text.split(/(?<=[.!?…])\s+/)[0] || text;
  text = firstSentence.trim();

  if (text.length > maxLength) {
    const boundary = text.lastIndexOf(' ', maxLength - 1);
    text = `${text.slice(0, boundary > 50 ? boundary : maxLength - 1).trimEnd()}…`;
  }

  return text;
}

function fallbackLine(fallbacks) {
  const list = Array.isArray(fallbacks) ? fallbacks.filter(Boolean) : [];
  if (!list.length) return 'Звёзды зависли на загрузке. Попробуй ещё раз чуть позже.';
  return list[Math.floor(Math.random() * list.length)];
}

export async function generateFunnyLine({
  system,
  user,
  maxLength = 160,
  fallbacks = [],
  temperature = 0.75,
} = {}) {
  const apiKey = process.env.FREE_LLM_API_KEY;
  if (!apiKey) return fallbackLine(fallbacks);

  const timeoutMs = Math.max(1000, Number(process.env.FREE_LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const model = process.env.FREE_LLM_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: String(system || '') },
          { role: 'user', content: String(user || '') },
        ],
        temperature,
        max_tokens: 100,
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${details ? `: ${details.slice(0, 180)}` : ''}`);
    }

    const payload = await response.json();
    const generated = normalizeLine(payload?.choices?.[0]?.message?.content, maxLength);
    if (!generated) throw new Error('FreeLLMAPI returned an empty completion');
    return generated;
  } catch (error) {
    console.error('[freellmapi] generation failed:', error?.message || error);
    return fallbackLine(fallbacks);
  }
}

export { normalizeLine };
