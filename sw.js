const BUILD='202610101111';
const SHELL='kotoba-shell-'+BUILD, AUDIO='kotoba-audio', DOCS='kotoba-docs';
const FILES=['./','index.html','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==AUDIO&&k!==DOCS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function audioReq(req){
  const c=await caches.open(AUDIO),url=new URL(req.url);url.search='';
  const key=url.href;let hit=await c.match(key);
  if(!hit){
    try{const r=await fetch(key);if(r.ok&&r.status===200)c.put(key,r.clone());hit=r}catch(e){return new Response('',{status:504})}
  }
  const rg=req.headers.get('range');
  if(rg&&hit.status===200){
    const b=await hit.clone().blob(),m=/bytes=(\d*)-(\d*)/.exec(rg)||[];
    const st=m[1]?+m[1]:0,en=m[2]?Math.min(+m[2],b.size-1):b.size-1;
    return new Response(b.slice(st,en+1),{status:206,headers:{'Content-Type':hit.headers.get('Content-Type')||'audio/mpeg','Content-Range':`bytes ${st}-${en}/${b.size}`,'Content-Length':String(en+1-st),'Accept-Ranges':'bytes'}});
  }
  return hit;
}
async function docReq(req){
  const c=await caches.open(DOCS),url=new URL(req.url);url.search='';
  const key=url.href;let hit=await c.match(key);
  if(!hit){try{const r=await fetch(key);if(r.ok&&r.status===200)c.put(key,r.clone());hit=r}catch(e){return new Response('',{status:504})}}
  const rg=req.headers.get('range');
  if(rg&&hit.status===200){
    const b=await hit.clone().blob(),m=/bytes=(\d*)-(\d*)/.exec(rg)||[];
    const st=m[1]?+m[1]:0,en=m[2]?Math.min(+m[2],b.size-1):b.size-1;
    return new Response(b.slice(st,en+1),{status:206,headers:{'Content-Type':hit.headers.get('Content-Type')||'application/octet-stream','Content-Range':`bytes ${st}-${en}/${b.size}`,'Content-Length':String(en+1-st),'Accept-Ranges':'bytes'}});
  }
  return hit;
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);if(u.origin!==location.origin)return;
  if(u.pathname.endsWith('/audio/index.json')){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(AUDIO).then(c=>c.put(u.pathname,cp))}return r}).catch(()=>caches.open(AUDIO).then(c=>c.match(u.pathname)).then(r=>r||new Response('{}',{headers:{'Content-Type':'application/json'}}))));return;
  }
  if(u.pathname.endsWith('/docs/index.json')){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(DOCS).then(c=>c.put(u.pathname,cp))}return r}).catch(()=>caches.open(DOCS).then(c=>c.match(u.pathname)).then(r=>r||new Response('[]',{headers:{'Content-Type':'application/json'}}))));return;
  }
  if(/firebase-config\.js$/.test(u.pathname)){e.respondWith(caches.open(SHELL).then(c=>fetch(req,{cache:'no-store'}).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>c.match(req).then(r=>r||new Response('',{status:504})))));return}
  if(/\/(docs|lib)\/[^/]/.test(u.pathname)){e.respondWith(docReq(req));return}
  if(/\/audio\/[^/]+\.(mp3|bin)$/.test(u.pathname)){e.respondWith(audioReq(req));return}
  e.respondWith(caches.open(SHELL).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:true})||(req.mode==='navigate'?await c.match('index.html'):null);
    const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>null);
    return hit||(await net)||new Response('Offline',{status:503});
  }));
});
