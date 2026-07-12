/* ═══════════════════════════════════════════════════════════════
   QuickTech Security — Service Worker
   v39 — bump cache (ADAUGARE LISTA CLIENTI); corectat path icoane, cache strategy hibrid, push backup
   ═══════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const CACHE_NAME = 'quicktech-v39';
const ASSETS = ['/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

firebase.initializeApp({
  apiKey: "AIzaSyAM8xNSobHhJHsrldPTTOuQy2NLno05taA",
  authDomain: "quicktech-security.firebaseapp.com",
  projectId: "quicktech-security",
  storageBucket: "quicktech-security.firebasestorage.app",
  messagingSenderId: "499843441356",
  appId: "1:499843441356:web:53069d73659a73d9669869"
});

const messaging = firebase.messaging();

/* ─── PUSH NOTIFICATIONS (Firebase background message) ─── */
messaging.onBackgroundMessage(async payload => {
  try {
    // Verifică dacă aplicația e deschisă în vreun tab vizibil
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appOpen = clientList.some(c => c.visibilityState === 'visible');
    // Dacă aplicația e activă pe ecran, lasă in-app să gestioneze (clopoțelul)
    if (appOpen) return;

    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    await self.registration.showNotification(title || '🛡 QuickTech Security', {
      body: body || 'Ai o notificare nouă',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'quicktech-notif',
      renotify: true,
      requireInteraction: data.priority === 'priority',  // notif persistente pentru prioritare
      data: {
        url: data.url || '/',
        task_id: data.task_id || null,
        ts: Date.now()
      },
      actions: data.task_id ? [
        { action: 'view', title: 'Vezi task' },
        { action: 'dismiss', title: 'Închide' }
      ] : []
    });
  } catch (err) {
    console.error('[SW] onBackgroundMessage error:', err);
  }
});

/* ─── FALLBACK Web Push API (dacă vine push direct, nu prin FCM) ─── */
self.addEventListener('push', event => {
  // Firebase messaging-compat tratează deja push-urile FCM
  // Acest handler e backup pentru push-uri non-FCM
  if (!event.data) return;
  try {
    const payload = event.data.json();
    if (payload && payload.notification) return;  // FCM se ocupă
  } catch (e) { /* nu e JSON */ }
});

/* ─── CLICK pe notificare → focus pe app sau deschidere ─── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  if (action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Caut un tab deja deschis
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return client.focus();
        }
      }
      // Altfel deschid unul nou
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/* ─── INSTALL ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.error('[SW] install cache error:', err))
  );
  self.skipWaiting();
});

/* ─── ACTIVATE → curăț cache-urile vechi ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ─── FETCH — strategie hibridă ─── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Ignor API calls (nu cache-uiesc apeluri Supabase/Resend/etc.)
  if (event.request.url.includes('/rest/') || event.request.url.includes('/auth/') || event.request.url.includes('/realtime/')) return;

  const url = new URL(event.request.url);

  // STRATEGIA pentru HTML (index.html) → network-first cu fallback la cache
  // Asta înseamnă: dacă ai conexiune, primești versiunea proaspătă; dacă nu, app pornește din cache
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(m => m || caches.match('/index.html')))
    );
    return;
  }

  // STRATEGIA pentru assets (icons, css, js) → cache-first (rapide, rareori se schimbă)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

/* ─── MESAJ din pagina principală (ex: skip waiting după update) ─── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
