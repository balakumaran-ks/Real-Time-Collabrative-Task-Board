# Real-Time Collaborative Task Board

A placement-portfolio project: a Trello/Linear-style board where changes
made by one user show up live for everyone else looking at the same board —
no refresh, no stale state, and no silent data loss when two people edit
the same card at once.

This was picked out of a shortlist of three backend-focused project ideas
curated for an intermediate backend developer's placement portfolio
(real-time task board, distributed URL shortener + analytics, and a
background job queue/scheduler). This one won because it has the best mix
of "demos well in an interview" and "forces you to actually implement
auth, RBAC, WebSockets, and conflict resolution together."

## Status

- **`frontend/`** — done. A full React app: auth, workspaces, boards, a
  drag-and-drop kanban board, card details with comments/labels/assignee,
  live presence avatars, notifications. Currently running against a
  built-in mock backend so it's fully clickable already.
- **`backend/`** — yours to build. `backend/README.md` is the exact spec
  (data model, REST contract, WebSocket events, auth, RBAC, and the
  optimistic-concurrency rule) the frontend already expects. Match it and
  the frontend needs zero changes — just flip `VITE_USE_MOCKS=false`.

## Quickstart

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, log in with any email/password (mock mode
seeds a demo user). Then start on `backend/README.md`.

## Docs

| Doc | What's in it |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design: how the frontend, backend, Postgres, and Redis fit together, and the exact data flow for opening a board and resolving a concurrent edit |
| [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) | C4 context + container, backend and frontend class diagrams, ER diagram, sequence diagrams (auth, open board, conflict, multi-instance fan-out, notifications), state machines, deployment |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full Postgres DDL, the optimistic-lock query, ordering strategy, Redis keys |
| [`docs/API.md`](docs/API.md) · [`docs/openapi.yaml`](docs/openapi.yaml) | Full REST + WebSocket reference (shapes, status codes, event payloads) and the machine-readable OpenAPI 3.1 spec |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model: access control, WebSocket rooms, token handling, CSRF/CORS |
| [`docs/TESTING.md`](docs/TESTING.md) | Test pyramid, the concurrent-edit and cross-instance tests |
| [`docs/adr/`](docs/adr/) | Architecture decision records (why, alternatives, consequences) |
| [`backend/README.md`](backend/README.md) | The backend build guide: what to build and in what order |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow and conventions |

Local infrastructure for the backend: `docker compose up -d` (Postgres + Redis).

## Why this project

Not another e-commerce/blog CRUD clone. The hard part interviewers
actually probe — "what happens when two people edit the same thing at the
same time" — is a first-class requirement here (the `version` field on
every card), not an afterthought. Building it means you can talk through
real-time architecture, WebSocket room broadcast, Redis presence/pub-sub,
and optimistic-concurrency conflict resolution from having shipped it, not
from having read about it.
