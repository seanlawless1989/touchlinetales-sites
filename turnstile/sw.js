// Turnstile service worker: offline shell and push notifications
const CACHE = "turnstile-v5";
const SHELL = ["./", "./index.html", "./config.js", "./icon.svg", "./icon-192.png", "./manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // never cache Supabase data, auth or photos
  if (url.hostname.endsWith("supabase.co")) return;
  // map and satellite tiles: leave to the browser cache, there are far too many to keep
  if (/arcgisonline\.com$/.test(url.hostname)) return;
  if (req.mode === "navigate" || url.origin === location.origin) {
    // network first, so a new version shows up straight away
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  // CDN scripts and fonts: cache first
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Turnstile", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Turnstile", {
    body: d.body || "", tag: d.tag, icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "/turnstile/" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = e.notification.data && e.notification.data.url || "/turnstile/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.includes("/turnstile")) { w.focus(); w.postMessage({ type: "ts-refresh" }); return; }
    return self.clients.openWindow(target);
  }));
});
