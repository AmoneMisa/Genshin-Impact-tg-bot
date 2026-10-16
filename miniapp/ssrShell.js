import { navHtml } from '../webapp/nav.js';

// Everything on the first screen that does not depend on the player is rendered here, so it is on screen
// with the first paint instead of after the scripts and /api/bootstrap have finished. app.js renders the
// same markup again (with the player's red dots), so nothing jumps when it takes over.
const BOTTOM_NAV = /(<nav id="bottom-nav"[^>]*>)(\s*)(<\/nav>)/;

export function renderShell(html) {
  return html.replace(BOTTOM_NAV, (match, open, _gap, close) => `${open}${navHtml('city')}${close}`);
}

/** Puts a classic <script> first in <head>, right after the charset declaration. */
export function inlineHeadScript(html, source) {
  const body = source.replace(/^\s*\/\/.*\n/gm, '').trim().replace(/<\/script/gi, '<\\/script');
  return html.replace(/(<meta charset="[^"]*"\s*\/?>)/i, (match) => `${match}\n  <script>${body}</script>`);
}
