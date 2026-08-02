# QuickTech Security Tasks

Aplicație PWA pentru gestionarea echipelor tehnice pe teren — QuickTech Security.

🔗 **Live:** [app.quicktechsecurity.ro](https://app.quicktechsecurity.ro)

---

## Stack tehnic

- **Frontend:** HTML/CSS/JS vanilla, PWA (service worker + manifest)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- **Push notifications:** Firebase Cloud Messaging (FCM)
- **Email:** Resend
- **GPS:** Integrare Tracksolid (sync kilometraj)
- **Cron jobs:** pg_cron (Supabase)

---

## Fișiere principale

| Fișier | Descriere |
|---|---|
| `index.html` | Aplicația completă (UI + logică) |
| `service-worker.js` | Cache PWA + push notifications |

---

## Module implementate

### Core
- **Sarcini** — creare, atribuire (individual/echipă/open pool), priorități, statusuri, mențiuni, poze intervenție
- **Echipe** — gestiune echipe (min. 2 membri), taskuri colaborative

### Standard
- **Mentenanțe** — programare periodică, alertă automată cu 7 zile înainte, generare task automat, actualizare dată la finalizare
- **Garanții Echipamente** — urmărire echipamente în service, alerte termene
- **Parc Auto** — ITP/RCA/revizii, integrare GPS Tracksolid, calcul km estimat (bord + GPS)
- **Materiale** — propuneri materiale de la tehnicieni

### Premium
- **Gestiune Stoc** — scanare coduri de bare (scanner USB/Bluetooth), intrări/ieșiri automate, alertă stoc minim, rol dedicat "Stație Scanare"
- **Listă Clienți** — evidență clienți cu sistem instalat, garanție, buton "Creează task" direct din card
- **Cereri Invoiri (HR)** — cerere cu semnătură digitală, confirmare email antifraudă, aprobare admin, calcul automat zile concediu, export PDF, alertă email cu 4 zile înainte de absență

---

## Roluri utilizatori

| Rol | Acces |
|---|---|
| `admin` | Acces complet la toate modulele |
| `technician` | Sarcini, Materiale, Cereri invoiri, Gestiune Stoc (ieșiri) |
| `stoc` | Doar Gestiune Stoc (scanare) — pentru stație fixă în depozit |

---

## Edge Functions (Supabase)

- `sync-tracksolid-mileage` — sync zilnic kilometraj GPS (cron)
- `confirm-absence` — email confirmare + notificare admin la cereri invoiri
- `check-invoiri-alerts` — alertă email cu 4 zile înainte de absență aprobată (cron zilnic 07:00)
- `send-push` — trimitere push notifications FCM

---

## Deploy

1. Modifică `index.html`
2. Bump `CACHE_NAME` în `service-worker.js` (versiune +1)
3. Upload ambele fișiere pe hosting (cPanel File Manager)
4. Service worker detectează automat versiunea nouă → banner update în app

---

## Istoric versiuni recente

- **v43** — Fix Istoric colapsabil pe 2 nivele (An → Lună) în sidebar
- **v42** — Buton "Istoric" în bottom nav (admin), deschide automat sidebar
- **v41** — Eliminat câmp Status din formular task, Prioritate+Data pe același rând
- **v40** — Badge-uri uniforme (width fix 92px) pentru priorități/statusuri
- **v39** — Modul Listă Clienți

---

## Contact

Dezvoltat pentru **QuickTech Security** — Iași, România.
