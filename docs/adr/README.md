# Architecture Decision Records

Short documents capturing *why* a decision was made, what else was
considered, and what it costs. Format: Context → Decision → Alternatives →
Consequences. New decisions get the next number; superseded ones are marked,
never deleted.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-single-backend-service.md) | One backend service (modular monolith), not microservices | Accepted |
| [0002](0002-optimistic-concurrency-control.md) | Optimistic locking with a `version` column for card edits | Accepted |
| [0003](0003-redis-pubsub-fanout.md) | Broadcast real-time events through Redis pub/sub | Accepted |
| [0004](0004-jwt-access-and-rotating-refresh-cookie.md) | Short-lived in-memory JWT + rotating httpOnly refresh cookie | Accepted |
| [0005](0005-last-write-wins-for-card-moves.md) | Card moves are last-write-wins (no version check) | Accepted |
