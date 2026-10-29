/* Drop50 service worker: offline-first app shell. Bump VERSION on every deploy (tools/release.sh does it). */
const VERSION = "2026.10.29-superset";
const CACHE = `drop50-${VERSION}`;
const SHELL = ["./", "index.html", "styles.css", "engine.js", "app.js", "plan.json", "manifest.webmanifest",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];
// cache:'reload' skips the HTTP cache so a new version never mixes in stale files
const put = (c, u) => fetch(new Request(u, { cache: "reload" })).then((r) => { if (r.ok) return c.put(u, r); throw new Error(`${u} ${r.status}`); });

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await Promise.all(SHELL.map((u) => put(c, u)));
    const plan = await (await c.match("plan.json")).json();
    const media = plan.exercises.flatMap((x) => Array.from({ length: x.frames }, (_, i) => `media/${x.id}-${i}.webp`));
    await Promise.all(media.map((u) => put(c, u)));
  }));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("drop50-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => { if (e.data === "skip-waiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.match("index.html").then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
