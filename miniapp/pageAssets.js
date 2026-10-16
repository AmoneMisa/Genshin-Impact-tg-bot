import crypto from 'node:crypto';

const stylesheet = /<link rel="stylesheet" href="(\/[^\"]+\.css)" \/>\s*/g;
const critical = new Set(['styles.css','hud.css','feature-availability.css','item-art.css','vfx.css','loading.css','table-seats.css','city.css','icons.css','design-system.css']);

// Preserve the original cascade in the feature bundle, including shared overrides last.
export function bundlePageAssets(html, readCss) {
  const files = [...html.matchAll(stylesheet)].map(match => match[1]);
  const bundle = files => {
    const css = files.map(readCss).join('\n');
    const path = `/bundle.${crypto.createHash('sha1').update(css).digest('hex').slice(0,10)}.css`;
    return {css,path,files};
  };
  if (!files.length) return {html,bundles:[]};
  const initial = bundle(files.filter(file => critical.has(file.slice(1))));
  const features = bundle(files);
  let inserted = false;
  html = html.replace(stylesheet, () => {
    if (inserted) return '';
    inserted = true;
    return `<link rel="stylesheet" href="${initial.path}" />\n  <meta name="game-feature-styles" content="${features.path}" />\n  `;
  });
  return {html,bundles:[initial,features]};
}

const staticImport = /^\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

function resolveModule(from, specifier) {
  if (!/^\.{0,2}\//.test(specifier)) return null;
  const parts = (specifier.startsWith('/') ? specifier : `${from.slice(0, from.lastIndexOf('/') + 1)}${specifier}`).split('/');
  const out = [];
  for (const part of parts) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return `/${out.join('/')}`;
}

/** Every module the entry script imports statically (breadth first, entry first). */
export function staticModuleGraph(entry, readJs) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    let source;
    try { source = readJs(url); } catch { continue; }
    seen.add(url);
    for (const match of source.matchAll(staticImport)) {
      const next = resolveModule(url, match[1] || match[2]);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return [...seen];
}

// Static imports form a chain several levels deep (app.js -> city.js -> ...), and a browser only learns about
// each level after it has downloaded the previous one. Listing the whole graph up front turns that chain of
// round trips into one parallel batch. The Telegram script is deferred so it no longer blocks the HTML parser;
// deferred and module scripts run in document order, so it still runs before the app.
export function optimizeScripts(html, readJs) {
  const entry = html.match(/<script type="module" src="(\/[^"]+\.js)"><\/script>/)?.[1];
  if (!entry) return html;
  const hints = staticModuleGraph(entry, readJs).map(url => `<link rel="modulepreload" href="${url}" />`).join('\n  ');
  return html
    .replace(/<script src="(https:\/\/telegram\.org\/[^"]+)"><\/script>/, '<script defer src="$1"></script>')
    .replace(/(<script type="importmap">)/, `${hints}\n  $1`);
}
