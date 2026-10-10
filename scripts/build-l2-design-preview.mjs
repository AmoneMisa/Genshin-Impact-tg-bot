import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const css=(read('webapp/hud.css')+'\n'+read('webapp/design/l2-windows.css')).replaceAll('../art/','../webapp/art/');
const model=['tattoo-model','economy-model','economy-ui'].map(name=>read(`webapp/design/${name}.js`).replace(/^export /gm,'').replace(/^import[^\n]+\n/gm,'')).join('\n').replaceAll('../art/','../webapp/art/');
const app=read('webapp/design/l2-windows.js').replace(/^import[^\n]+\n/gm,'').replaceAll('../art/','../webapp/art/');
const html=read('webapp/design/l2-windows.html')
  .replace(/  <link rel="stylesheet"[^\n]+\n/g,'')
  .replace('</head>',`<style>${css}</style></head>`)
  .replace('<script type="module" src="l2-windows.js"></script>',`<script>\n(()=>{\n${model}\n${app}\n})();\n</script>`);
fs.writeFileSync('docs/l2-windows-preview.html',html);
console.log('Created docs/l2-windows-preview.html (open directly in a browser).');
