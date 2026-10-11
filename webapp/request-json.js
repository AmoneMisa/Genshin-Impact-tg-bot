export async function requestJson(path, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, {once:true});
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {...options, signal:controller.signal});
    const payload = await response.json().catch(error => {if (controller.signal.aborted) throw error;return {};});
    if (!response.ok) {
      const error = new Error(payload.error || payload.reason || `HTTP ${response.status}`);
      error.payload = payload;error.status = response.status;throw error;
    }
    return payload;
  } finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
