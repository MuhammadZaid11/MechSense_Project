# MechSense

Software-simulated industrial machine monitoring platform for a mechanical engineering portfolio.

**Version 1.0 is simulation-only.** MechSense does not connect to physical sensors, does not perform certified diagnostics, and does not claim predictive AI. Demo thresholds used in later phases are configurable teaching values, not universal industrial safety limits.

This repository is currently at **Phase 3**: machine inventory, simulated sensor ingestion, an in-process demo alert engine, and a live-reading panel.

## Purpose

Monitor simulated electric motors, pumps, and conveyors. Phase 3 stores inventory, generates demo temperature/vibration readings, and opens configurable teaching alerts. Later phases add historical charts, interactive alert management, and maintenance records.

## Architecture (Phase 3)

```
Browser (React + Vite, port 5173)
        │  GET /api/health
        │  GET /api/machines
        │  GET /api/monitoring/snapshot
        ▼
Express API (port 3001)
        ├── In-process simulator (optional)
        ├── Reading ingestion + quality checks
        ├── Demo alert engine
        └── PostgreSQL 16 (127.0.0.1:5432)
```

Maintenance, MQTT, full-stack Docker Compose, and CI are **not implemented yet**. Historical charts are reserved for Phase 4.

## Selected versions

| Package | Requested | Installed | Role |
|---|---|---|---|
| Node.js | >= 20.19 | 26.3.1 (this machine) | Runtime |
| npm | 11.x | 11.16.0 (this machine) | Package manager |
| express | 5.3.0 | 5.3.0 | API |
| dotenv | 16.x latest | **18.0.8** | Current latest; `config()` is compatible |
| pg | 8.x latest | 8.23.1 | PostgreSQL client |
| vitest | 5.0.5 | 5.0.5 | Backend and frontend tests |
| supertest | 7.3.1 | 7.3.1 | HTTP assertions |
| @testing-library/react | latest | 16.3.3 | Frontend component tests |
| jsdom | latest | 30.1.3 | Frontend test DOM |
| vite | 8.3.4 | 8.3.4 | Frontend toolchain |
| react / react-dom | 19.3.1 | 19.3.1 | UI |
| recharts | 3.10.1 | 3.10.1 | Charts (unused until Phase 4) |
| PostgreSQL | 16 | postgres:16 image | Inventory database |

## Prerequisites

- Windows 10/11 with PowerShell
- Node.js 20.19 or newer
- npm 11.x
- Git
- Docker Desktop, used only to run PostgreSQL 16

## Environment setup

Do not commit `.env` files. Copy examples if a local file is missing. Do not overwrite an existing `.env` if it already has values you want to keep.

**`backend/.env`**

```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://mechsense:changeme@127.0.0.1:5432/mechsense
POSTGRES_USER=mechsense
POSTGRES_PASSWORD=changeme
POSTGRES_DB=mechsense
SIMULATOR_ENABLED=true
SIMULATOR_INTERVAL_MS=5000
STALE_AFTER_SECONDS=30
```

If `backend/.env` already exists, do not overwrite it. The simulator defaults to on unless `NODE_ENV=test` or `SIMULATOR_ENABLED=false`.

On Windows, prefer `127.0.0.1` instead of `localhost` so the client hits the IPv4 Docker publish address.

**`frontend/.env`**

```
VITE_API_BASE_URL=http://localhost:3001
```

## PostgreSQL startup

From `D:\dovops-prject\MechSense`:

```powershell
# 1. Start Docker Desktop, then wait until `docker info` succeeds.
docker info

# 2. Start only the PostgreSQL service. This does not start the whole app.
docker compose -f docker-compose.postgres.yml up -d

# 3. Confirm the container is healthy
docker compose -f docker-compose.postgres.yml ps
```

Data is stored in the named volume `mechsense-pgdata`. The database port is published on `127.0.0.1:5432` only.

The compose file uses placeholder credentials that match `.env.example`. It does not delete existing containers or volumes.

## Database migrations and seed commands

```powershell
cd D:\dovops-prject\MechSense\backend
npm run migrate
npm run seed
```

- Migrations use `CREATE TABLE IF NOT EXISTS` and a `schema_migrations` ledger. They do not drop tables.
- Seed inserts the three demo machines by unique `code` and demo alert rules. Both use `ON CONFLICT DO NOTHING`.

Demo statuses are teaching values, not live telemetry:

| Code | Name | Type | Location | Demo status |
|---|---|---|---|---|
| MTR-01 | 7.5 kW Induction Motor | motor | Pump House | running |
| PMP-01 | Centrifugal Cooling Pump | pump | Cooling Area | stopped |
| CNV-01 | Belt Conveyor | conveyor | Assembly Line | maintenance |

## Installation

```powershell
cd D:\dovops-prject\MechSense\backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install

cd D:\dovops-prject\MechSense\frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
```

## Run backend and frontend

Use two PowerShell terminals after PostgreSQL is up and migrations/seed have run.

```powershell
# Terminal A — API
cd D:\dovops-prject\MechSense\backend
npm run dev
```

```powershell
# Terminal B — UI
cd D:\dovops-prject\MechSense\frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The health card should show **Connected**. The inventory table lists the three demo machines. The live simulation panel shows latest readings and open demo alerts.

## Test

Backend tests inject a fake machine service. They do not connect to, delete, or change development database data.

```powershell
cd D:\dovops-prject\MechSense\backend
npm test
```

Frontend inventory-state tests:

```powershell
cd D:\dovops-prject\MechSense\frontend
npm test
```

Frontend production build:

```powershell
cd D:\dovops-prject\MechSense\frontend
npm run build
```

Manual API checks:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/health
Invoke-RestMethod -Uri http://localhost:3001/api/machines
Invoke-RestMethod -Uri http://localhost:3001/api/monitoring/snapshot
Invoke-RestMethod -Uri http://localhost:3001/api/readings/latest
```

## API endpoints

| Method | Path | Success | Notes |
|---|---|---|---|
| GET | `/api/health` | `200` | Service metadata, version `1.0.0-phase3` |
| GET | `/api/machines` | `200` | `{ "data": [machine, ...] }` |
| GET | `/api/machines/:id` | `200` / `400` / `404` | One machine |
| POST | `/api/machines/:id/readings` | `201` | Ingest one simulated reading |
| GET | `/api/machines/:id/readings` | `200` | History. `limit` 1-200, default **50** |
| GET | `/api/readings/latest` | `200` | Latest reading per machine |
| GET | `/api/alerts` | `200` | Optional `?status=active\|acknowledged\|resolved` |
| GET | `/api/alerts/:id` | `200` / `400` / `404` | One alert |
| POST | `/api/alerts/:id/acknowledge` | `200` | `{ "acknowledgedBy": "operator" }` |
| POST | `/api/alerts/:id/resolve` | `200` | Close an open alert |
| GET | `/api/monitoring/snapshot` | `200` | Latest readings, open alerts, simulator status |
| GET | `/api/simulator` | `200` | Simulator status |
| POST | `/api/simulator/start` | `200` | Start the in-process demo loop (no-op if already running) |
| POST | `/api/simulator/stop` | `200` | Stop the loop |

Machine JSON:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "code": "MTR-01",
  "name": "7.5 kW Induction Motor",
  "machineType": "motor",
  "location": "Pump House",
  "status": "running",
  "createdAt": "2026-10-19T15:00:00.000Z",
  "updatedAt": "2026-10-19T15:00:00.000Z"
}
```

Latest reading sample:

```json
{
  "data": [
    {
      "id": 56,
      "machineId": "9f0a1319-c3f7-497f-ad08-a23bc181a61c",
      "machineCode": "MTR-01",
      "temperatureC": 61.4,
      "vibrationMmS": 3.05,
      "isRunning": true,
      "recordedAt": "2026-10-20T17:00:00.000Z",
      "ingestedAt": "2026-10-20T17:00:00.000Z",
      "quality": "fresh"
    }
  ]
}
```

Error JSON:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "id must be a valid UUID",
    "details": [{ "field": "id", "reason": "invalid_uuid" }]
  }
}
```

## Troubleshooting

| Symptom | What to check |
|---|---|
| `docker info` hangs or fails | Start Docker Desktop and wait until the engine is running |
| `DATABASE_UNAVAILABLE` | PostgreSQL container is down, `DATABASE_URL` is wrong, or the client used `localhost`/`::1` instead of `127.0.0.1` |
| Empty inventory | Run `npm run migrate` and `npm run seed` in `backend` |
| Dashboard Disconnected | Start the API with `npm run dev` in `backend` |
| Port 5432 already in use | Another local PostgreSQL is bound to the port. Stop it or point `DATABASE_URL` at that instance. Do not delete unknown volumes or containers |

## Known limitations

- Simulation-only prototype. Not a certified safety, SIL, or diagnostic system.
- Machine inventory statuses are seeded demo values, not live telemetry.
- Simulated readings and alert thresholds are teaching defaults, not ISO or OEM trip settings.
- Health check does not probe PostgreSQL.
- No authentication.
- No physical sensor, PLC, or MQTT integration.

## Simulator usage

The backend can run an in-process simulator. It is **not** physical sensor integration.

```powershell
# Default: enabled in development
cd D:\dovops-prject\MechSense\backend
npm run dev
```

Every 5 seconds (`SIMULATOR_INTERVAL_MS`) it writes one demo reading for MTR-01, PMP-01, and CNV-01 through the same parameterized ingest path. It is software-only. Starting the API twice in one process does not create a second loop. `node --watch` reloads send SIGTERM so the previous interval is cleared.

```powershell
# Optional runtime controls
Invoke-RestMethod -Method POST -Uri http://localhost:3001/api/simulator/stop
Invoke-RestMethod -Method POST -Uri http://localhost:3001/api/simulator/start
```

Disable auto-start with `SIMULATOR_ENABLED=false` in `backend/.env` (do not commit that file). Do not overwrite an existing `.env`.

Demo teaching thresholds (not safety limits):

| Machine | Temp warning / critical | Vibration warning / critical | Stale |
|---|---|---|---|
| MTR-01 | 70 / 85 °C | 4.5 / 7.1 mm/s | 30s |
| PMP-01 | 65 / 80 °C | 4.0 / 6.5 mm/s | 30s |
| CNV-01 | 55 / 70 °C | 3.5 / 6.0 mm/s | 30s |

Reading quality values: `fresh`, `stale`, `invalid`, `out_of_order`. Invalid or missing metrics do not fire numeric alerts. Duplicate `(machine_id, recorded_at)` readings return `409 CONFLICT`. Open alerts are unique per machine + rule while `active` or `acknowledged`.

## Future hardware integration

A later phase may replace the in-process simulator with MQTT messages from real instruments. That work is out of scope until the software monitoring loop is complete and clearly labelled as a prototype.

## Mechanical assumptions

The three seeded machines represent common plant assets: an induction motor, a centrifugal cooling pump, and a belt conveyor. Their statuses are placeholders for the dashboard. They are not live operating states and must not be treated as ISO, OEM, or safety-trip conditions.
