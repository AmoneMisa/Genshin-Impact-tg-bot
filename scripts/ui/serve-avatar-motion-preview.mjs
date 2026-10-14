import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('webapp');
http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/avatar-motion-preview.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
  response.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(response);
}).listen(4328,'127.0.0.1',()=>console.log('Avatar motion preview: http://127.0.0.1:4328/'));
