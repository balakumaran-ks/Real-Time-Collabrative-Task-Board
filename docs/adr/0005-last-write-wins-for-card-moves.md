# ADR-0005: Card moves are last-write-wins (no version check)

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

Cards are dragged between and within columns. Two people dragging the same
card at the same instant is rare, and the outcome ("the card ended up
somewhere") is low-stakes and instantly visible to everyone via the
`card:moved` broadcast. Field edits (title, description, assignee, labels, due
date) carry real user-authored content and are protected by ADR-0002.

## Decision

`PATCH /cards/:id/move` takes `{columnId, order}` and applies it
unconditionally (last write wins), responding `204` and broadcasting
`card:moved`. It performs the membership check but no `version` check.

## Alternatives considered

| Option | Why not |
|---|---|
| Version-check moves too | A conflict dialog for a drag gesture is bad UX; users would just drag again |
| Server-side ordering with move operations queued per column | Correct under any interleaving; more machinery than the risk justifies |

## Consequences

- ✅ Drags feel instant; no spurious conflicts while someone has a card modal open.
- ⚠️ Concurrent drags of the *same* card produce an arbitrary-but-consistent winner (the last write) — all clients converge because they all receive both events in commit order.
- ⚠️ **Open question — should a move bump `version`?** The frontend's mock backend *does* increment `version` on move, while [`API.md`](../API.md) specifies no version check for moves. Recommendation: **do not bump** it in the real backend, otherwise a teammate dragging a card invalidates everyone's open edit modal and causes avoidable `409`s. The frontend handles either behaviour (it reads `version` from `card:updated` / refetch), but the mock and the real backend should be aligned — consider changing the mock.
