import fs from 'node:fs';

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

/** A random prepared line; `avoid` (the previous result) is skipped while another one exists. */
function fallbackLine(fallbacks, avoid = '') {
  const list = Array.isArray(fallbacks) ? fallbacks.filter(Boolean) : [];
  if (!list.length) return 'Звёзды зависли на загрузке. Попробуй ещё раз чуть позже.';
  const fresh = list.filter(line => !String(avoid).includes(line));
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

let missingKeyReported = false, fileKey = '';

/** The proxy's own unified key file (FREE_LLM_API_KEY_FILE), read until it appears after the proxy's first setup. */
function apiKeyFromEnv() {
  if (process.env.FREE_LLM_API_KEY) return process.env.FREE_LLM_API_KEY;
  const file = process.env.FREE_LLM_API_KEY_FILE;
  if (!fileKey && file) {
    try { fileKey = fs.readFileSync(file, 'utf8').trim(); } catch { /* not created yet */ }
  }
  return fileKey;
}

export async function generateFunnyLine({
  system,
  user,
  maxLength = 160,
  fallbacks = [],
  temperature = 0.75,
  avoid = '',
} = {}) {
  const apiKey = apiKeyFromEnv();
  if (!apiKey) {
    // Without the proxy key every text is a prepared line; say so once instead of failing silently.
    if (!missingKeyReported) { missingKeyReported = true; console.warn('[freellmapi] no FREE_LLM_API_KEY or key file yet: funny lines use prepared fallbacks only'); }
    return fallbackLine(fallbacks, avoid);
  }

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
    return fallbackLine(fallbacks, avoid);
  }
}

export { normalizeLine };
