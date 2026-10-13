// Test-only server. Never included in the deployed application.
import http from 'node:http'; import path from 'node:path'; import fs from 'node:fs/promises';
let build='b10';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/__build'){build=url.searchParams.get('value')==='b9'?'b9':url.searchParams.get('value')==='b8'?'b8':url.searchParams.get('value')==='b7'?'b7':url.searchParams.get('value')==='b6'?'b6':url.searchParams.get('value')==='b5'?'b5':url.searchParams.get('value')==='b4'?'b4':url.searchParams.get('value')==='b3'?'b3':url.searchParams.get('value')==='b2'?'b2':url.searchParams.get('value')==='legacy'?'b1':'b10';res.end(build);return;}
 let p=decodeURIComponent(url.pathname);if(p.endsWith('/'))p+='index.html';
 // /demo/ exercises GitHub project-site subpaths; other tests run at /.
 if(p.startsWith('/demo/'))p=p.slice(5);
 const root=path.resolve('dist-'+build),file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
}).listen(4174,'127.0.0.1');
