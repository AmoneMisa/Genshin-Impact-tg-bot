// Answers to the requests that webapp/early-fetch.js started before the scripts loaded.
// Each answer is used once, only for a plain GET made by the same player in the same language.
export function takeEarly(path, options = {}, initData, language, scope = globalThis.__early) {
  if (!scope?.requests || options.body || (options.method && options.method !== 'GET')) return null;
  if (!initData || scope.initData !== initData || scope.lang !== language) return null;
  const request = scope.requests[path];
  if (!request) return null;
  delete scope.requests[path];
  return request;
}
