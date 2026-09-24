# ADR-0002: Optimistic locking with a `version` column for card edits

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

Two users can edit the same card at once. Without protection, the second save
silently overwrites the first (lost update). The requirement is *no silent
data loss* without making users wait on locks while a modal is open for
minutes.

## Decision

Every card has an integer `version` (starts at 1). `PATCH /cards/:id` carries
the `version` the client last saw. The server runs a single statement:

```sql
UPDATE cards SET …, version = version + 1 WHERE id = $1 AND version = $2 RETURNING *;
```

- 1 row → success: respond `200` with the card and broadcast `card:updated`.
- 0 rows → respond `409 {error: "version_conflict"}`; nothing was written.

The client shows a conflict banner and refetches the card; the user re-applies
their change on top of the fresh state if they still want it.

## Alternatives considered

| Option | Why not |
|---|---|
| Last-write-wins | Silent data loss — the failure this ADR exists to prevent |
| Pessimistic locks (`SELECT … FOR UPDATE`, or "card is being edited" locks) | Holding a lock across human think-time doesn't work; DB row locks are for milliseconds; app-level locks need expiry/heartbeat machinery and block collaboration |
| Field-level merge (three-way merge) | Better UX, but needs per-field versions and merge rules; a reasonable stretch goal |
| CRDTs / operational transforms | The right answer for character-level co-editing of one text field; heavyweight for card metadata and overkill here |
| ETag / `If-Match` header | Same mechanism, different transport; the body `version` is what the frontend already sends |

## Consequences

- ✅ Cheap: no locks, one indexed statement; correctness is enforced by the database, so it holds across any number of backend instances.
- ✅ Exactly the pattern interviewers probe — easy to explain and to test (50 concurrent writers → 1 winner).
- ⚠️ Users occasionally see a conflict banner and must redo a change. Live `card:updated` events keep open modals fresher, which reduces (not eliminates) conflicts.
- ⚠️ `0 rows` is ambiguous (stale version vs. deleted card) → follow up with a cheap existence check to return `404` vs `409`.
- ⚠️ Whole-card versioning means two edits to *different* fields still conflict; per-field merge is a documented stretch goal.
