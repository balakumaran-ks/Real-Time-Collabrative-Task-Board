# ADR-0003: Broadcast real-time events through Redis pub/sub

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

Socket.IO's `io.to(room).emit()` only reaches clients connected to *that*
process. With more than one backend instance behind a load balancer, a change
handled by instance 1 must still reach clients connected to instance 2.

## Decision

Mutations never emit to sockets directly. After a successful write, the
handler **publishes** the event to the Redis channel `board:<id>`. Each
backend instance **subscribes** to the channels of boards that have local
sockets (subscribe on first local `board:join`, unsubscribe when the room
empties) and re-emits received events to its local Socket.IO room.
`notification:new` uses `user:<id>` channels. Presence lives in Redis sets
(`presence:<boardId>`).

## Alternatives considered

| Option | Why not |
|---|---|
| Direct `io.to(room).emit()` | Works on one instance only — a demo, not a scaling story |
| `@socket.io/redis-adapter` | A perfectly good production choice that does exactly this for you. Rejected *for this project* because implementing the publish/subscribe fan-out by hand is the learning goal — and the adapter can replace it later with no API change |
| Sticky sessions + single instance | Caps scale and turns every deploy into a reconnect storm |
| Postgres `LISTEN/NOTIFY` | Viable at small scale (8 KB payload limit, no fan-out to many subscribers efficiently); Redis is already required for presence |
| Kafka / a message broker | Over-engineered for ephemeral UI events |

## Consequences

- ✅ Adding a second (third…) instance requires **zero application changes**.
- ✅ The publisher doesn't know or care where subscribers are.
- ⚠️ Redis pub/sub is **at-most-once and not persistent**: an event published while an instance is disconnected is lost. Mitigation: clients **refetch the board snapshot after any reconnect**, and Postgres remains the truth — events are an optimisation for freshness, not a source of data.
- ⚠️ The originating instance also receives its own message; sockets in its room therefore get exactly one copy (no separate direct emit). Clients still apply events idempotently.
- ⚠️ Per-board channels mean many subscriptions on busy instances; if that becomes a problem, switch to `PSUBSCRIBE board:*` or shard channels.
