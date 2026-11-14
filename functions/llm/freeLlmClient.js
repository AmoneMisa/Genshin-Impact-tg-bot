import fs from 'node:fs';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3001/v1';
const DEFAULT_MODEL = 'auto:fast';
const DEFAULT_TIMEOUT_MS = 6500;

function endpoint() {
  const base = (process.env.FREE_LLM_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

/** First line of the answer; up to two sentences, so a set-up and its punchline stay together. */
function normalizeLine(value, maxLength = 160) {
  const firstLine = String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .find(Boolean) || '';
  let text = firstLine.replace(/\s+/g, ' ').replace(/^['"«]+|['"»]+$/g, '').trim();
  const sentences = text.split(/(?<=[.!?…])\s+/);
  text = sentences[0] || text;
  if (sentences[1] && `${text} ${sentences[1]}`.length <= maxLength) text = `${text} ${sentences[1]}`;
  text = text.trim();

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
  variants = 0,
} = {}) {
  const apiKey = apiKeyFromEnv();
  if (!apiKey) {
    // Without the proxy key every text is a prepared line; say so once instead of failing silently.
    if (!missingKeyReported) { missingKeyReported = true; console.warn('[freellmapi] no FREE_LLM_API_KEY or key file yet: funny lines use prepared fallbacks only'); }
    return fallbackLine(fallbacks, avoid);
  }

  const timeoutMs = Math.max(1000, Number(process.env.FREE_LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  // A comma-separated chain: each model is tried in turn within one shared time budget.
  const models = String(process.env.FREE_LLM_MODEL || DEFAULT_MODEL).split(',').map(m => m.trim()).filter(Boolean);
  const deadline = Date.now() + timeoutMs;
  const failures = [];

  for (const model of models) {
    const left = deadline - Date.now();
    if (left < 300) break;
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
            { role: 'system', content: String(system || '') + (variants > 1 ? bestOfInstruction(variants) : '') },
            { role: 'user', content: String(user || '') },
          ],
          temperature,
          max_tokens: variants > 1 ? Math.max(400, variants * 140) : 160,
          ...(variants > 1 ? { response_format: { type: 'json_object' } } : {}),
          stream: false,
        }),
        signal: AbortSignal.timeout(left),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${details ? `: ${details.slice(0, 120)}` : ''}`);
      }

      const payload = await response.json();
      // A reply cut by the token limit ends mid-word; the next model gets the request instead.
      if (payload?.choices?.[0]?.finish_reason === 'length') throw new Error('cut by the token limit');
      const content = payload?.choices?.[0]?.message?.content;
      const generated = normalizeLine(variants > 1 ? bestVariant(content) : content, maxLength);
      if (!generated) throw new Error('empty completion');
      if (!usableLine(generated)) throw new Error('reasoning text instead of an answer');
      return generated;
    } catch (error) {
      failures.push(`${model}: ${error?.message || error}`);
    }
  }
  console.error('[freellmapi] generation failed:', failures.join(' | ') || 'no time left');
  return fallbackLine(fallbacks, avoid);
}

/** Best-of-N in one request: the model writes variants, checks them and names the best one. */
function bestOfInstruction(count) {
  return `\n\nСначала придумай ${count} разных вариантов. Проверь каждый: понятна ли шутка сразу, связаны ли начало и концовка, грамотен ли русский. Выбери самый смешной из прошедших проверку.\nОтветь только JSON без пояснений: {"variants": ["...", ...], "best": <номер лучшего, начиная с 1>}`;
}

/** The chosen variant of a best-of-N JSON answer; throws when the answer is not usable JSON. */
function bestVariant(content) {
  const parsed = JSON.parse(String(content || '').replace(/^\s*```(?:json)?|```\s*$/g, '').trim());
  const list = Array.isArray(parsed?.variants) ? parsed.variants.map(item => String(item || '').trim()).filter(item => item && !/^\.{3}$/.test(item)) : [];
  if (!list.length) throw new Error('no variants in the answer');
  const picked = list[Number(parsed.best) - 1];
  return picked && !/^\.{3}$/.test(picked) ? picked : list[0];
}

/** Reasoning models sometimes answer with their English thinking; a usable line is Russian text. */
function usableLine(text) {
  return /[А-Яа-яЁё]{3}/.test(text) && !/^(thinking process|we need|the user|okay|let me|analy[sz]e)/i.test(text.replace(/^\W+/, ''));
}

export { normalizeLine };
