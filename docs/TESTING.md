# Testing plan

The claims this project makes — **no lost updates**, **real-time sync across
instances**, **RBAC that can't be bypassed** — each get a test that tries to
break them.

## Test pyramid

| Layer | Scope | Tooling | Examples |
|---|---|---|---|
| **Unit** | Pure logic | Vitest | Role → permission matrix; fractional `position` midpoint + renumbering; `VersionConflictError` mapping to `409`; label validation; event payload builders |
| **Integration** | Service/repository + real Postgres/Redis | Vitest + Testcontainers | The optimistic-lock `UPDATE` (below); refresh-token rotation and family revocation; presence set add/remove with multi-tab counters; comment → notification row + `notification:new` published |
| **API / contract** | HTTP in, HTTP out | Supertest + OpenAPI validator | Every route matches [`openapi.yaml`](openapi.yaml) and the shapes in `frontend/src/lib/types.ts`; auth matrix (no token / expired / other workspace / wrong role) per route |
| **Real-time** | Socket.IO clients against a running server | `socket.io-client` in tests | Client A mutates → Client B (same board) receives the exact event; client in another board receives **nothing**; `presence:sync` on join/leave/disconnect |
| **Multi-instance** | Two backend processes + one Redis | Script / compose | Below |
| **End-to-end** | Real frontend against real backend | Playwright | The scenario in `backend/README.md` → "Testing against the real frontend" |

## The headline tests

### 1. Concurrent edits never lose an update

- 50 concurrent `PATCH /cards/X` requests, all with `version: 1`, each editing a
  *different* field.
- Assert: **exactly 1** returns `200`, **49** return `409`, final `version = 2`,
  and the stored row equals the winner's patch (no partial merge, no torn write).
- Variant: sequential loop where each client refetches after `409` and
  retries → every edit eventually applies; final `version = 1 + 50`.

### 2. Cross-instance fan-out

- Start backend on `:4000` and `:4001` with the same Postgres + Redis.
- Client A (socket on `:4000`) and Client B (socket on `:4001`) join board `b1`.
- A mutates via `:4000` → B must receive `card:updated` / `card:moved`. Repeat
  in the other direction; assert **no duplicate deliveries** to a single socket.
- Kill instance `:4001` mid-run → B reconnects to `:4000`, refetches the board,
  and state converges.

### 3. Authorisation cannot be bypassed

Table-driven: for each `(route × caller)` pair — anonymous, member of another
workspace, `member`, `admin`, `owner` — assert the exact status code
(`401/404/403/2xx`). Include WebSocket: `board:join` on a foreign board yields
no room membership and no events.

## Other cases worth automating

| Area | Case |
|---|---|
| Auth | Reused (already rotated) refresh token → whole family revoked → `401`; expired access token → `401`; register duplicate email → `409` |
| Cards | Move has no version check (last-write-wins); delete requires `owner`/`admin`; a deleted card is removed from every open board via `card:deleted` |
| Presence | Same user, two tabs: closing one keeps them present; server crash leaves stale entries that TTL cleans |
| Notifications | Assign → `assigned`; comment on assigned card → `commented` to assignee only, never to the commenter |
| Idempotent client | Receiving your own broadcast event doesn't duplicate the card (frontend unit test around the reducer) |

## Frontend

The existing app already runs against the in-memory mock, which implements the
same `version` check — useful as an executable contract. CI runs `oxlint` and
`tsc -b && vite build` on every push (see `.github/workflows/frontend.yml`).
Add component tests (Vitest + Testing Library) for `CardModal` conflict-banner
behaviour when the backend lands.

## CI (suggested for the backend)

`lint → typecheck → unit → integration (Testcontainers) → contract → real-time → build image`.
Fail the build if `openapi.yaml` and routes drift.
