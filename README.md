# AtithiBandhu — Smart Tourist Safety System (MERN)

A working MERN-stack implementation of the problem statement: blockchain-style
digital tourist ID, AI-assisted geofencing, real-time **live location**
tracking, and one-tap SOS — built with **MongoDB, Express, React, Node.js**,
plus **Socket.io** for real-time streaming and **Leaflet** for maps.

## What's actually implemented

| Feature (from the problem statement)          | How it's implemented                                                                 |
|-------------------------------------------------|----------------------------------------------------------------------------------------|
| Blockchain-based digital ID                     | `backend/utils/blockchain.js` — an append-only SHA-256 hash-chained ledger (`Block` model). Every registration adds a block; `/api/tourist/digital-id/verify` re-walks the whole chain to prove nothing was tampered with. This is a **permissioned, simulated chain** stored in MongoDB — swap in Hyperledger/Polygon later without changing the API shape. |
| AI-based geofencing alerts                      | `backend/utils/geoUtils.js` — point-in-polygon classification of live GPS fixes against admin-defined zones (safe/danger/restricted), pushed to the tourist and to admins over the socket the instant a boundary is crossed. |
| Anomaly detection                                | Same socket handler flags GPS "teleports" (implausible distance jumped in <5s — a common spoofing/bad-fix signature) — a simple, explainable rule-based AI layer you can later replace with a trained model without touching the transport layer. |
| Real-time **live location**                     | Browser `navigator.geolocation.watchPosition()` on the tourist's device streams every fix over Socket.io to the backend, which stores it and rebroadcasts it to the admin's live map — no polling. |
| Emergency SOS integration                        | Big SOS button emits `sos:trigger` over the socket (with a REST fallback for flaky networks); admins get `sos:alert` in real time and can resolve it from the dashboard. |
| Privacy-compliant system                         | Passwords hashed (bcrypt), JWT-based auth, role-gated routes (`tourist` / `admin` / `responder`), only necessary fields are exposed to each role. |
| Works in low-connectivity areas                  | SOS has a REST fallback in addition to the socket path; location logs are timestamped server-side so gaps are visible rather than silently lost. |

## Project structure

```
atithibandhu/
  backend/
    config/db.js            Mongo connection
    models/                 Tourist, Block (ledger), LocationLog, Geofence, SOSAlert
    routes/                 auth, tourist, geofence, sos
    middleware/auth.js      JWT verify + role guard
    utils/blockchain.js     hash-chain ledger (add/verify)
    utils/geoUtils.js       point-in-polygon, haversine distance, zone classification
    sockets/locationSocket.js   real-time location + geofence + SOS + anomaly events
    server.js
  frontend/
    src/pages/Login.js, Register.js
    src/pages/TouristDashboard.js   <- live location tracking + SOS + own map
    src/pages/AdminDashboard.js     <- live multi-tourist map + alerts + zone builder
    src/components/MapView.js, SOSButton.js
    src/services/api.js, socket.js
    src/context/AuthContext.js
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI (local mongod or MongoDB Atlas) and a real JWT_SECRET
npm run dev        # nodemon, or `npm start`
```

Runs on `http://localhost:5000`. Requires a running MongoDB instance
(`mongod` locally, or an Atlas connection string).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Runs on `http://localhost:3000`. The browser **will prompt for location
permission** — accept it on the Tourist Dashboard to start live tracking.
Location access requires either `localhost` or HTTPS in production (browsers
block `navigator.geolocation` on plain HTTP for any non-localhost origin).

### 3. Try it end-to-end

1. Register a normal account (role defaults to `tourist`).
2. Register a **second** account and manually set its role in the DB (or
   temporarily send `"role": "admin"` in the register payload — see the note
   in `routes/auth.js`; in production, seed admins directly in MongoDB
   instead of allowing self-registration as admin).
3. Log in as admin → `Create Geofence Zone`, paste 3+ `lat,lng` points
   (e.g. draw a rough box around your current location).
4. Log in as the tourist in another browser/tab → `Start Live Location
   Sharing`. Move the zone to overlap your real coordinates (or use your
   OS's location simulator) to see the geofence alert fire on both ends.
5. Hit the **SOS** button — it appears instantly on the admin dashboard's
   alert feed.

## Notes on the "blockchain" layer

A full public blockchain is overkill (and too slow) for per-second location
data, so the identity layer uses a **hash-chained ledger pattern** — the same
core idea permissioned chains like Hyperledger Fabric use for identity
records, which is what tourism-department style deployments (this mirrors
the real *Digital Tourist ID* concept behind the "Smart Tourist Safety"
scheme) actually need: tamper-evidence and auditability for the ID itself,
not for high-frequency GPS pings. If a real distributed ledger is required
for the submission, `utils/blockchain.js` is the single seam to swap out —
its `addBlock`/`isChainValid` interface can be re-implemented against
Hyperledger Fabric, Polygon, or any chain SDK without touching routes,
sockets, or the frontend.

## Extending this

- **AI anomaly detection**: the current rule (implausible GPS jump) lives in
  `sockets/locationSocket.js`. Swap it for a trained model (e.g. route
  deviation vs. historical patterns, inactivity clustering) — the socket
  contract (`admin:anomaly` event) doesn't need to change.
- **Offline/low-connectivity**: the Flutter mobile client mentioned in the
  original tech stack could queue location fixes locally (e.g. SQLite) and
  flush them to `/api/sos` or the socket on reconnect.
- **Push notifications**: wire the `sos:alert` and `geofence:alert` socket
  events to FCM/APNs for a native mobile build.
