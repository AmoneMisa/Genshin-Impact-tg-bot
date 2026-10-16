// Classic script (not a module). The server inlines it into <head>, so the first two requests of the
// game start while the scripts are still downloading instead of after they have all run. app.js picks
// the answers up through early-data.js and falls back to a normal request when anything differs.
(function () {
  try {
    var data = new URLSearchParams(location.hash.slice(1)).get('tgWebAppData');
    if (!data) return;
    var lang = null;
    try { lang = localStorage.getItem('app-language'); } catch (error) { /* storage may be unavailable */ }
    if (lang !== 'ru' && lang !== 'uz') {
      var user = {};
      try { user = JSON.parse(new URLSearchParams(data).get('user') || '{}'); } catch (error) { /* no user */ }
      lang = String(user.language_code || '').toLowerCase().indexOf('uz') === 0 ? 'uz' : 'ru';
    }
    var headers = { 'x-telegram-init-data': data, 'x-app-lang': lang };
    var early = window.__early = { initData: data, lang: lang, requests: {} };
    ['/api/bootstrap', '/api/builds'].forEach(function (path) {
      var signal = window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined;
      var request = fetch(path, { headers: headers, signal: signal }).then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status));
      });
      request.catch(function () { /* app.js repeats the request normally */ });
      early.requests[path] = request;
    });
  } catch (error) { /* the game works without the head start */ }
})();
