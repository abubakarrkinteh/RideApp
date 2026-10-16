import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end('Invalid URL');return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 8080 is already in use. Stop the other preview and try again.':error.message);process.exitCode=1;});
server.listen(8080,'127.0.0.1',()=>console.log('RideApp demo: http://127.0.0.1:8080\nPress Ctrl+C to stop.'));
