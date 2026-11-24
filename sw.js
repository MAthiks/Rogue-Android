'use strict';
// Scope-specific caches: never clear a sibling project on the same GitHub Pages origin.
const ROOT=new URL(self.registration.scope);
const PREFIX='rogue-pwa:'+ROOT.pathname+':';
const CACHE=PREFIX+'008c-__BUILD_ID__';
const FILES=['index.html','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png'];
const urls=FILES.map(f=>new URL(f,ROOT).href);
const INDEX=urls[0];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))));
 // An update waits for old game windows to close; never force a mid-run reload.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==ROOT.origin)return;
 const isNavigation=req.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===new URL(INDEX).pathname);
 if(!isNavigation&&!urls.includes(url.href))return;
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   const saved=await cache.match(isNavigation?INDEX:req.url);
   return saved||fetch(req);
 })());
});
