# AtithiBandhu — 客人の友

A premium Japanese sakura-inspired frontend for **AtithiBandhu**, a tourist safety companion. The original React/CRA app (JWT + Socket.IO against `localhost:5000`) is re-expressed as a static site so it can run in this environment, while preserving the same journeys: Digital Tourist ID, live location, SOS, geofence groves, and an admin command garden.

> Walking through a peaceful Japanese sakura garden during spring, translated into a modern digital watch.

## Goals

- Keep the original product structure: login, register, tourist dashboard, admin command center.
- Elevate the UI into a cohesive **sakura / washi / kamon** visual language — elegant, not neon, not anime-cliché.
- Persist travelers, geofences, SOS alerts, and anomalies through the project Table API.

## Completed features

- **Landing garden** with sequential hero entrance, floating petals, kamon mark, and atmospheric photography.
- **Login / Register** with the original field set (name, email, password, phone, nationality, ID number, emergency contact).
- **Tourist dashboard**
  - Browser `watchPosition` live sharing
  - Leaflet map with you-are-here lantern
  - Geofence polygon overlay + client-side breach detection
  - Circular SOS seal that writes an alert for command
- **Admin command garden**
  - Live traveler markers (poll every 5s)
  - Active SOS list with resolve
  - Anomaly / geofence feed
  - Create geofence zone (`lat,lng; lat,lng; …`)
  - Registered traveler roster
- Sticky glass navigation, mobile drawer, scroll reveals, `prefers-reduced-motion` support.
- Demo seed data for Kyoto groves and sample travelers.

## Functional entry URIs

| Path | Purpose |
| --- | --- |
| `/` or `index.html` | Public garden / marketing |
| `/login.html` | Traveler & command login |
| `/register.html` | Create Digital Tourist ID |
| `/dashboard.html` | Protected traveler lantern (redirects if unsigned) |
| `/admin.html` | Protected command garden (`role=admin`) |

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Traveler | `hana@sakura.travel` | `traveler` |
| Command | `admin@atithibandhu.jp` | `sakura-admin` |

Client-side session storage is **not a secure login**. Anyone can read the page source. A static site cannot truly protect an admin area.

## Data models

Tables (each includes system `id`):

- **tourists** — profile, `role` (`tourist` \| `admin`), `digitalIdHash`, last `lat`/`lng`, `tracking`, `status`
- **geofences** — `name`, `type` (`safe` \| `danger` \| `restricted`), `riskLevel`, `coordinates` (JSON polygon), `description`
- **sos_alerts** — tourist snapshot, location, `status` (`active` \| `resolved`)
- **anomalies** — geofence / inactivity / SOS reasons for the command feed

REST (relative):

- `GET/POST tables/{table}`
- `GET/PATCH/DELETE tables/{table}/{id}`

## Architecture notes

The uploaded project used React, axios, Socket.IO, and a Node API. This sandbox serves **static HTML/CSS/JS only**, so:

- Auth is a table lookup + `localStorage` session (demo).
- “Sockets” are replaced by Table API writes plus a 5s admin poll.
- Maps use Leaflet from jsDelivr/unpkg CDN (Carto Voyager tiles).

Original source copies remain under `_src/` for reference.

## Not yet implemented

- Real JWT auth, bcrypt, and Socket.IO against a Node backend
- True server-side authorization for `/admin.html`
- Blockchain / hashed ID verification beyond a display hash
- Push notifications, SMS to emergency contacts
- Offline PWA cache

## Recommended next steps

1. Point `js/core.js` at the production Node API (`/auth`, `/geofence`, `/sos`, Socket.IO) when the backend is deployed.
2. Hosted Deploy, then optionally copy seed rows into the live D1 database.
3. Add a dedicated incident timeline and heat map of breaches.

## Public URLs

- Preview: this project’s published static site
- API: relative `tables/*` on the same origin

## Visual language

Soft sakura pink, dusty rose, washi cream, deep plum, and a thread of gold. Typography: Cormorant Garamond + Noto Serif JP for headings, Outfit + Noto Sans JP for body. Petals are CSS/SVG, not a particle library.
