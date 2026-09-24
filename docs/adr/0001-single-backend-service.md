# ADR-0001: One backend service (modular monolith), not microservices

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The product has auth, workspaces/RBAC, boards/cards, comments, notifications
and real-time sync. It would be easy to split these into services, and just as
easy to regret it: the project is built by one person, and the hard problems
(real-time sync, concurrency) are independent of service boundaries.

## Decision

Build **one deployable backend** with internal modules (`routes`, `middleware`,
`services`, `db`, `redis`, `sockets`) and clear layer boundaries. Postgres is
the only source of truth; Redis holds regenerable state. The app is
**stateless**, so it scales horizontally behind a load balancer without
changing the design.

## Alternatives considered

| Option | Why not |
|---|---|
| Microservices (auth, boards, notifications, realtime) | Adds network hops, distributed transactions (card update + notification + event), deployment/observability overhead — none of it exercises the concurrency and real-time skills this project targets |
| Separate "realtime" service | Plausible at scale, but means duplicating authz and having REST write paths call it; unnecessary before there's a measured need |
| Serverless functions | WebSockets need long-lived connections; awkward fit |

## Consequences

- ✅ One transaction boundary for "write card + create notification row".
- ✅ Simple local dev, simple deploy; the multi-instance story is still real (ADR-0003).
- ⚠️ A hot module (socket fan-out) can't scale independently; acceptable until measured. The `EventPublisher`/`EventSubscriber` seam is where a split would happen.
- ⚠️ Discipline needed to keep module boundaries clean (services don't reach into other modules' repositories) — enforce in code review / lint rules.
