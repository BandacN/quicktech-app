/* ═══════════════════════════════════════════════════════════════
   QuickTech Security — Service Worker
   v65 — resetare parolă utilizator din lista de utilizatori (Admin API)
   v66 — tokenul FCM se retrage la deconectare (nu mai vin notificări
          pe un cont delogat, nici pe telefon partajat)
   v67 — crearea unui utilizator nu mai deconectează adminul (Admin API
          în loc de signUp); rolul se aplică din prima
   v68 — telefon de contact la mentenanțe, preluat în taskul automat
   v69 — fix creare cont: acțiunea se decide din corpul cererii
   v70 — raport lunar gestiune stoc pe email, cu setări în tab-ul Istoric
   v71 — proba de raport întreabă pentru ce lună (implicit luna curentă)
   v72 — butonul Înapoi de pe Android închide modalul sau modulul curent,
          nu aplicația; ieșire doar cu dublă apăsare de pe dashboard
   v73 — Înapoi închide și panourile glisante: detaliul taskului și
          panoul de notificări
   v74 — Înapoi închide și poza pe tot ecranul
   v75 — interfață nouă (listă grupată, meniu restrâns, tema Grafit);
          versiunea nouă nu se mai activează singură: așteaptă apăsarea
          pe „Actualizează” din banner (SKIP_WAITING)
   ═══════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const CACHE_NAME = 'quicktech-v75';
const ASSETS = ['/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-notification.png'];

firebase.initializeApp({
  apiKey: "AIzaSyAM8xNSobHhJHsrldPTTOuQy2NLno05taA",
  authDomain: "quicktech-security.firebaseapp.com",
  projectId: "quicktech-security",
  storageBucket: "quicktech-security.firebasestorage.app",
  messagingSenderId: "499843441356",
  appId: "1:499843441356:web:53069d73659a73d9669869"
});

const messaging = firebase.messaging();

/* ─── PUSH NOTIFICATIONS (Firebase background message) ───
   Payload-ul e DATA-ONLY (fără "notification") pentru a preveni afișarea
   dublă — dacă payload-ul are "notification", Firebase îl afișează automat
   ÎNAINTE ca acest handler să ruleze, plus încă o dată aici = dublură. */
messaging.onBackgroundMessage(async payload => {
  try {
    // Verifică dacă aplicația e deschisă în vreun tab vizibil
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appOpen = clientList.some(c => c.visibilityState === 'visible');
    // Dacă aplicația e activă pe ecran, lasă in-app să gestioneze (clopoțelul)
    if (appOpen) return;

    const data = payload.data || {};
    const title = data.title || '🛡 QuickTech Security';
    const body = data.body || 'Ai o notificare nouă';

    await self.registration.showNotification(title, {
      body: body,
      // icon = imaginea mare, color, din corpul notificării
      icon: '/icon-192.png',
      // badge = silueta monocromă din bara de status. Android o randează
      // ca formă albă, ignorând culorile — de aceea are nevoie de un fișier
      // separat, alb pe transparent. Cu icon-192 aici apărea un pătrat alb.
      badge: '/icon-notification.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'quicktech-notif',
      renotify: true,
      requireInteraction: data.priority === 'priority',
      data: {
        // URL cu ?task=ID — dacă app-ul nu e deschis, se lansează direct pe task
        url: data.task_id ? `/?task=${data.task_id}` : (data.url || '/'),
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
  // Fără skipWaiting automat: altfel versiunea nouă preia controlul imediat,
  // pagina se reîncarcă singură și bannerul „Versiune nouă disponibilă” nu
  // apucă să fie văzut. Activarea vine din mesajul SKIP_WAITING (jos).
  // La prima instalare (fără versiune veche) se activează oricum imediat.
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
