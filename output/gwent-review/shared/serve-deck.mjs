import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
export function serveDeck(directory,port){
 const root=path.resolve(directory),workspace=path.resolve(root,'../../..'),prefix='/output/gwent-review/'+path.basename(root)+'/';
 const types={'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json; charset=utf-8','.css':'text/css','.md':'text/plain; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain'};
 http.createServer((req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname==='/'){res.writeHead(302,{Location:prefix+'index.html'});res.end();return;}
   let file;
   if(pathname==='/webapp/design-system.css')file=path.join(workspace,'webapp/design-system.css');
   else if(pathname.startsWith(prefix)){file=path.resolve(root,pathname.slice(prefix.length));if(!file.startsWith(root+path.sep))throw Error('outside preview');}
   else{res.writeHead(404);res.end();return;}
   const type=types[path.extname(file)];if(!type){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 }).listen(port,'127.0.0.1',()=>console.log('Deck preview: http://127.0.0.1:'+port+'/'));
}
