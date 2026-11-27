# Smart Ambulance Tracking & Emergency Response System

A full-stack implementation of the System Design Document (ABES Engineering College, v1.0):
patients request an ambulance, dispatchers assign the nearest suitable unit, drivers share
their live location, and everyone watches the trip progress in real time.

| Layer | Technology (per SDD §2.5) |
|---|---|
| Frontend | React 18 + Vite, React Router, Leaflet (OpenStreetMap) |
| Backend | Python FastAPI, SQLAlchemy 2 |
| Database | PostgreSQL 16 (SQLite fallback for quick local runs) |
| Auth | JWT (HS256) + PBKDF2-SHA256 password hashing |
| Real time | WebSockets |
| Location | Browser Geolocation API |

```
Ambulance tracker/
├── backend/            FastAPI service (app/, tests/, requirements.txt, Dockerfile)
├── frontend/           React app (src/, package.json, Dockerfile)
├── docker-compose.yml  PostgreSQL + API + web app in one command
└── README.md
```

---

## Quick start (Docker, easiest)

```bash
docker compose up --build
```

* Web app: http://localhost:5173
* API docs (Swagger): http://localhost:8000/docs

## Quick start (manual)

**1. Database** – create a PostgreSQL database:

```sql
CREATE USER ambulance WITH PASSWORD 'ambulance';
CREATE DATABASE smart_ambulance OWNER ambulance;
```

(Skip this to use SQLite: just don't set `DATABASE_URL`.)

**2. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit DATABASE_URL / JWT_SECRET if needed
uvicorn app.main:app --reload --port 8000
```

Tables are created and demo data is seeded automatically on first start.

**3. Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                        # http://localhost:5173
```

> Want to show the UI without a backend? Set `VITE_USE_MOCK_DATA=true` in `frontend/.env`.
> The app then runs on built-in demo data stored in the browser.

---

## Demo accounts

Every seeded account uses the password **`demo1234`**. The sign-in page also has one-click demo buttons.

| Role | Email |
|---|---|
| Patient | patient@smartambulance.demo |
| Driver | driver@smartambulance.demo (also rohan.k@, suresh.v@, imran.q@, kavya.r@) |
| Dispatcher (admin) | admin@smartambulance.demo |

New patients can register from the sign-in page. Drivers are created by the dispatcher
(Drivers page); their default password is `demo1234` unless one is set.

## Try the full workflow (SDD §4.1)

Open three browser windows (or one normal + two private windows):

1. **Patient** → *Request an ambulance* → pick an emergency type → *Detect GPS location* → send.
2. **Dispatcher** → the request appears instantly with a notification → *Allocate* → the allocation
   service ranks every unit (nearest eligible first, with reasons for any it skipped) → *Dispatch ambulance*.
3. **Driver** (the one shown on the chosen unit) → *Assignments* → *Accept* → on the trip screen press
   *Share live GPS* (real device location) or *Simulate drive* (moves the ambulance toward the pickup).
4. The **patient** and **dispatcher** maps update live. The driver steps through
   *En route → Arrived → In transit → Completed*; the ambulance becomes available again.

---

## How the design document maps to the code

| SDD section | Where |
|---|---|
| §3.1 Authentication, roles | `backend/app/routers/auth.py`, `deps.py`, `security.py` |
| §3.2 Emergency requests + status flow | `backend/app/routers/requests.py` |
| §3.3 Ambulance management | `backend/app/routers/fleet.py` |
| §3.4 Allocation (Haversine, category filter, ranking) | `backend/app/geo.py`, `POST /api/assignments/recommend` |
| §3.5 GPS tracking + freshness | `POST /api/location/update`, `GET /api/location/{id}` (`isStale`) |
| §3.6 Trip management | `PATCH /api/trips/{id}/status` (strict order, history kept) |
| §3.7 Admin dashboard / reports | `GET /api/dashboard/stats`, `GET /api/activity` |
| §3.8 Notifications | WebSocket events with notification payloads (`backend/app/realtime.py`) |
| §5 Database (8 tables) | `backend/app/models.py` (+ `trip_events`, `activity_logs`) |
| §5.4 No double allocation | row locks + active-assignment check in `confirm_assignment` |
| §6.6 WebSockets | `/ws/updates`, `/ws/admin`, `/ws/ambulance/{id}`, `/ws/requests/{id}` |
| §8.2 RBAC | patients see only their own requests; drivers only their trips |
| §8.4 Location privacy | patients can only see the ambulance assigned to them |
| §11 Testing | `backend/tests/` (unit + integration + WebSocket) |

### Status vocabularies

* **Request:** PENDING → ASSIGNED → ACCEPTED → EN_ROUTE → ARRIVED → IN_TRANSIT → COMPLETED
  (also CANCELLED, NO_AMBULANCE_AVAILABLE)
* **Ambulance:** AVAILABLE, ASSIGNED, EN_ROUTE, ON_TRIP, OUT_OF_SERVICE
* **Ambulance type required** is derived from the emergency type (Cardiac → CCU; Trauma, Stroke,
  Respiratory → ALS; others → BLS). A higher-capability unit can serve a lower requirement.

## API summary

| Method | Endpoint | Who |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | public |
| GET / PATCH | `/api/auth/me` | signed in |
| POST / GET | `/api/requests` | patient creates; list is role-filtered |
| GET | `/api/requests/{id}` | owner, assigned driver, admin |
| PATCH | `/api/requests/{id}/status` | admin |
| POST | `/api/requests/{id}/cancel` | owner or admin |
| GET / POST / PATCH | `/api/ambulances`, `/api/ambulances/available`, `/api/ambulances/{id}` | admin (read filtered by role) |
| GET / POST / PATCH | `/api/drivers`, `/api/drivers/{id}`, `/{id}/availability`, `/{id}/gps` | admin; drivers for self |
| GET / POST / PUT / DELETE | `/api/hospitals` | admin writes |
| POST | `/api/assignments/recommend` | admin |
| POST / GET | `/api/assignments`, `/api/assignments/{id}` | admin confirms |
| PATCH / POST | `/api/assignments/{id}/status`, `/accept`, `/reject` | assigned driver |
| GET / PATCH | `/api/trips`, `/api/trips/{id}/status` | driver (own) / admin |
| POST / GET | `/api/location/update`, `/api/location/{ambulance_id}` | driver posts |
| GET | `/api/tracking/{request_id}` | patient snapshot |

Full interactive docs: http://localhost:8000/docs

## Running the tests

```bash
cd backend
pytest -q                                         # uses a temporary SQLite database
DATABASE_URL=postgresql+psycopg://ambulance:ambulance@localhost:5432/smart_ambulance_test pytest -q
```

17 tests cover Haversine distance, type filtering, allocation ranking, password hashing, JWT,
the complete request → completion workflow, rejection and cancellation, double-allocation
prevention, role-based access, location privacy, fleet CRUD and WebSocket delivery.

## Deployment (Render / Railway)

* **Database:** create a managed PostgreSQL instance; copy its URL.
* **Backend:** deploy `backend/` (Dockerfile provided). Set `DATABASE_URL`, a long random `JWT_SECRET`,
  and `CORS_ORIGINS` to your frontend URL. Set `SEED_DEMO_DATA=false` for a clean production database.
* **Frontend:** deploy `frontend/` as a static site (`npm run build`, publish `dist/`) with
  `VITE_USE_MOCK_DATA=false`, `VITE_API_BASE_URL=https://your-api`, `VITE_WS_BASE_URL=wss://your-api`.
  Add a rewrite of `/*` to `/index.html` so deep links work.

## Notes and limits

* An academic prototype: it does not connect to government dispatch (108/112) systems.
* Distances are straight-line (Haversine). Road-based ETAs could use Google Routes API (SDD §3.4).
* Map tiles come from the free CARTO/OpenStreetMap service and need an internet connection.
* Password reset returns a confirmation but sends no email (no mail gateway configured).
