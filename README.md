# Real-Time Collaborative Task Board

[![frontend CI](https://github.com/balakumaran-ks/Real-Time-Collabrative-Task-Board/actions/workflows/frontend.yml/badge.svg)](https://github.com/balakumaran-ks/Real-Time-Collabrative-Task-Board/actions/workflows/frontend.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-source%20of%20truth-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-pub%2Fsub%20%2B%20presence-dc382d?logo=redis&logoColor=white)

A Trello / Linear-style board where a change made by one person shows up live
for everyone else looking at the same board — **no refresh, no stale state,
and no silent data loss when two people edit the same card at once.**

![System design diagram: the React SPA talks REST and WebSocket to a single backend API, which writes to PostgreSQL and uses Redis for pub/sub, presence and caching](docs/assets/architecture-diagram.png)

## Status

| Part | State | Notes |
|---|---|---|
| [`frontend/`](frontend/) | ✅ **Done** | Full React app, fully clickable today against a built-in mock backend |
| [`docs/`](docs/) | ✅ **Done** | System design, C4 / class / ER / sequence / state diagrams, DB schema, REST + WebSocket reference, OpenAPI spec, security notes, test plan, ADRs |
| [`backend/`](backend/) | 🛠️ **To build** | [`backend/README.md`](backend/README.md) is the exact spec — data model, REST contract, WebSocket events, auth, RBAC, and the optimistic-concurrency rule the frontend already expects |

Match the contract and the frontend needs **zero changes** — flip one env var
(`VITE_USE_MOCKS=false`) and the mock disappears.

## Features

**Product (implemented in the frontend)**

- Email/password auth with workspaces and three roles (`owner` / `admin` / `member`)
- Boards with a drag-and-drop kanban (`@dnd-kit`): columns, cards, reordering
- Card details: description, labels, assignee, due date, comments
- **Live presence** avatars — see who else has the board open
- **In-app notifications** (assigned, commented, moved)
- A **conflict banner** when your edit lost a race (`409 version_conflict`)

**Backend concerns this project is designed to exercise**

| Concern | Approach |
|---|---|
| No lost updates | Optimistic concurrency: `UPDATE … WHERE id = ? AND version = ?` → `409` on mismatch ([ADR-0002](docs/adr/0002-optimistic-concurrency-control.md)) |
| Real-time across many servers | Every mutation publishes to Redis pub/sub; each instance re-emits to its local Socket.IO room ([ADR-0003](docs/adr/0003-redis-pubsub-fanout.md)) |
| Auth that survives XSS | 15-min in-memory JWT + rotating httpOnly refresh cookie with reuse detection ([ADR-0004](docs/adr/0004-jwt-access-and-rotating-refresh-cookie.md)) |
| Authorisation | Role read from the `memberships` table on every request — never from the client or a token claim; WebSocket rooms re-check membership on join |
| Presence | Redis sets with per-user socket counters (two tabs ≠ two users) |

## How a concurrent edit is resolved

The scenario worth being able to draw on a whiteboard — full sequence diagram
in [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md#sequence-edit-a-card-optimistic-concurrency):

1. Client A and Client B both have card X open at `version: 3`.
2. A saves → server checks `version === 3`, applies it, bumps to `4`, responds
   `200`, and broadcasts `card:updated` to the board's room.
3. B, still on `version: 3`, saves → server sees the current version is `4` →
   **`409 Conflict`, nothing written.**
4. B's UI shows a conflict banner and refetches the card at `version: 4`; the
   user re-applies their change on top of A's if they still want it.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 · React Router · Zustand · `@dnd-kit` · Tailwind CSS v4 · react-hook-form + zod · axios · socket.io-client · Vite |
| Backend *(recommended, not mandatory)* | Node.js + TypeScript (Express or Fastify) · Socket.IO |
| Database | PostgreSQL 16 — the only source of truth |
| Cache / pub-sub / presence | Redis 7 |
| Tests *(planned)* | Vitest + Testcontainers · Supertest · Playwright |

## Quickstart

**1. Run the frontend (mock mode — no backend needed)**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and sign in with **any** email and password —
mock mode seeds a demo user with sample workspaces, boards and cards.

**2. Start the backend's infrastructure**

```bash
docker compose up -d                 # Postgres :5432 + Redis :6379
cp backend/.env.example backend/.env
```

**3. Build the backend, then point the frontend at it**

Follow [`backend/README.md`](backend/README.md) step by step, then:

```bash
cp frontend/.env.example frontend/.env
# edit frontend/.env → VITE_USE_MOCKS=false
```

Open the app in two browser windows as different users and confirm: moving a
card in one window updates the other live, presence avatars show both users,
and saving the same card from both windows produces a `409` in the second.

## Repository layout

```
.
├── frontend/          React app (done) — talks to lib/client.ts, which is either the real API or a mock
├── backend/           Build guide + .env.example (yours to build)
├── docs/
│   ├── ARCHITECTURE.md    system design and data flows
│   ├── DIAGRAMS.md        C4, class, ER, sequence, state, deployment (Mermaid)
│   ├── DATABASE.md        Postgres DDL, key queries, Redis keys
│   ├── API.md             REST + WebSocket reference
│   ├── openapi.yaml       OpenAPI 3.1 spec of the REST contract
│   ├── SECURITY.md        threat model
│   ├── TESTING.md         test pyramid and headline tests
│   ├── adr/               architecture decision records
│   └── assets/            overview diagram (PNG + HTML source)
├── docker-compose.yml     Postgres + Redis for local development
└── .github/               CI (frontend lint + build) and PR template
```

## Docs

| Doc | What's in it |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the frontend, backend, Postgres and Redis fit together; the exact data flow for opening a board and resolving a concurrent edit |
| [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) | C4 context + container, backend and frontend class diagrams, ER diagram, sequence diagrams (auth, open board, conflict, multi-instance fan-out, notifications), state machines, deployment |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full DDL, the version-guarded `UPDATE`, ordering strategy, Redis keys |
| [`docs/API.md`](docs/API.md) · [`docs/openapi.yaml`](docs/openapi.yaml) | Full REST + WebSocket reference (shapes, status codes, event payloads) and the machine-readable spec |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Access control, WebSocket rooms, token handling, CSRF / CORS |
| [`docs/TESTING.md`](docs/TESTING.md) | Test pyramid; the concurrent-edit and cross-instance tests |
| [`docs/adr/`](docs/adr/) | Why each major decision was made, and what else was considered |
| [`backend/README.md`](backend/README.md) | The backend build guide — what to build, in what order |
| [`frontend/README.md`](frontend/README.md) | Frontend structure and the mock/real seam |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow and conventions |

## Roadmap

- [x] Frontend: auth, workspaces, boards, drag-and-drop kanban, card modal, presence, notifications
- [x] Design docs, diagrams, database schema, OpenAPI spec, ADRs, CI for the frontend
- [ ] Backend 1 — auth + CRUD over REST (register / login / refresh → workspaces → boards → cards → comments)
- [ ] Backend 2 — RBAC middleware on mutating routes
- [ ] Backend 3 — optimistic concurrency on `PATCH /cards/:id`
- [ ] Backend 4 — Socket.IO rooms + Redis pub/sub fan-out
- [ ] Backend 5 — presence and notifications
- [ ] Two backend instances behind a load balancer, proving fan-out works
- [ ] *Stretch:* per-user rate limits · activity log with soft delete · field-level merge on conflict · frontend auto-retry via `/auth/refresh`

## Part of a three-project backend portfolio

This is project 1 of a shortlist of three backend-focused projects picked for
an intermediate developer's placement portfolio — chosen because each forces
real backend concerns (concurrency, caching, real-time delivery, failure
handling) rather than being another CRUD clone.

| # | Project | The hard part |
|---|---|---|
| **1** | **Real-Time Collaborative Task Board** *(this repo)* | Real-time sync without stale or duplicate state |
| 2 | [Distributed URL Shortener + Analytics](https://github.com/balakumaran-ks/Distributed-URL-Shortener-Analytics) | Collision-free IDs at scale; write-heavy analytics without slowing redirects |
| 3 | [Background Job Queue / Scheduler](https://github.com/balakumaran-ks/Background-Job-Queue-Scheduler) | At-least-once delivery, retries with backoff, dead-lettering |

This one was built first: the best ratio of *impressive to demo in an
interview* to *buildable frontend + clear backend contract*.

## License

[MIT](LICENSE)
