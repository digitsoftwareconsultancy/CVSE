/* Service worker of the installable student app.
   It keeps only the app's own files (page, styles, icons) so the app opens fast and shows its screen even with a weak
   connection. It NEVER keeps anything that comes from the server (marks, attendance, results): those always come live.
   To release a new version of the pages, change VERSION below. */
var VERSION = 'v3';
var CACHE = 'digit-student-' + VERSION;
var FILES = ['student.html', 'rc-render.js', 'rc-card.css', 'manifest-student.webmanifest', 'icons/student-192.png', 'icons/student-512.png', 'icons/student-512-maskable.png', 'icons/apple-touch-icon.png', 'icons/digit-logo.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf('digit-student-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== self.location.origin) return;           // server data: never touched
  var name = url.pathname.split('/').pop();
  if(FILES.indexOf(name) < 0 && FILES.indexOf('icons/' + name) < 0) return;
  // network first (always the newest page when online), the kept copy when offline
  e.respondWith(fetch(req).then(function(res){
    var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); return res;
  }).catch(function(){ return caches.match(req); }));
});