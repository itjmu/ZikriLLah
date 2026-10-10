const CACHE='zikrillah-v18';
const ASSETS=['/','/style.css','/app.js','/account-data.js','/model.js','/reorder.js','/experience.js','/sounds/beads.wav','/sounds/water.wav','/sounds/rain.wav','/sounds/stones.wav','/sounds/soft.wav','/catalog.js','/publication.js','/links.js','/haptics.js','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('zikrillah-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(/^\/media\/[a-f0-9-]{36}[.](wav|jpg|png|webp)$/.test(url.pathname)){event.respondWith((async()=>{const cache=await caches.open('zikrillah-media-v18');const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok){await cache.put(event.request,response.clone());const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-40)))await cache.delete(key);}return response;})());return;}
  if(!ASSETS.includes(url.pathname))return;
  event.respondWith((async()=>{try{const response=await fetch(event.request);if(response.ok)return response;const cached=await caches.match(event.request);return cached||response;}catch{return await caches.match(event.request)||new Response('Нет подключения',{status:503});}})());
});
