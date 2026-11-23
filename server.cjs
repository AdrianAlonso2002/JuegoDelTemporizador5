const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer((req,res)=>{
  let file;
  try { file = path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if(file===root)file=path.join(root,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!['.html','.css','.js','.svg','.jpg','.jpeg','.png','.webp'].includes(path.extname(file))){res.writeHead(404).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('No encontrado');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache'});res.end(data);});
}).listen(5173,'127.0.0.1',()=>console.log('Calendario disponible en http://127.0.0.1:5173'));
