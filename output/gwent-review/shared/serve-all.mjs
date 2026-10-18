import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const workspace=path.resolve('.'),root=path.join(workspace,'output/gwent-review');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf'};
http.createServer((req,res)=>{
 try{
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url==='/'){res.writeHead(302,{Location:'/output/gwent-review/index.html'});res.end();return;}
  const file=path.resolve(workspace,'.'+url);
  if(!(file.startsWith(root+path.sep)||/^\/webapp\/[\w-]+\.(js|css)$/.test(url))||!types[path.extname(file)])throw Error('Not found');
  res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end();}
}).listen(8800,'127.0.0.1',()=>console.log('Gwent review: http://127.0.0.1:8800/'));
