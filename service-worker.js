const CACHE="autocollimator-v7-full";
const ASSETS=["./","./index.html","./style.css","./calc.js","./graph.js","./app.js","./manifest.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
