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
