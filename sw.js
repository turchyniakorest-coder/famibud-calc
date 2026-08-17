// Робить застосунок доступним без мережі.
//
// Стратегія «спершу мережа, кеш як запасний варіант» для сторінки:
// якщо зв'язок є — людина бачить свіжу версію з новими цінами; якщо ні —
// віддається збережена копія. Для іконок навпаки: спершу кеш, бо вони
// не змінюються, а зайвий запит на об'єкті з поганим зв'язком тільки шкодить.
//
// ВАЖЛИВО: при кожному оновленні index.html піднімайте номер версії нижче,
// інакше люди зі старою копією не побачать змін.
const VERSION = 'famibud-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Чужі домени не чіпаємо: пошук на сайті магазину, посилання на radaway.ua
  // мають ходити в мережу як є.
  if (new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
