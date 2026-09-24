# Database design

**PostgreSQL is the only source of truth.** Redis holds nothing that can't be
regenerated (pub/sub messages, presence sets, cache). The ER diagram is in
[`DIAGRAMS.md`](DIAGRAMS.md#er-diagram).

Naming: the API/JSON uses the field names in
[`frontend/src/lib/types.ts`](../frontend/src/lib/types.ts) (`camelCase`,
`order`); the database uses `snake_case`, and `order` is stored as
`position` because `ORDER` is a reserved SQL word. The backend maps between the two.

## PostgreSQL schema

Requires PostgreSQL ≥ 13 (`gen_random_uuid()` built in) and the `citext` extension.

```sql
CREATE EXTENSION IF NOT EXISTS citext;

-- ── Identity ──────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT   NOT NULL,
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,                       -- bcrypt / argon2id
  avatar_color  TEXT   NOT NULL DEFAULT '#6366f1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id  UUID  NOT NULL,                           -- all rotations of one login share a family
  token_hash BYTEA NOT NULL UNIQUE,                    -- SHA-256 of the opaque cookie value
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

-- ── Tenancy and RBAC ──────────────────────────────────────────────────────
CREATE TABLE workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);   -- "my workspaces"

-- ── Boards, columns, cards ────────────────────────────────────────────────
CREATE TABLE boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX boards_workspace_idx ON boards (workspace_id);

CREATE TABLE columns (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  position  DOUBLE PRECISION NOT NULL                  -- API field: "order"
);
CREATE INDEX columns_board_idx ON columns (board_id, position);

CREATE TABLE cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES boards(id)  ON DELETE CASCADE,   -- denormalised: board-scoped events and queries
  column_id   UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  labels      TEXT[] NOT NULL DEFAULT '{}'
                CHECK (labels <@ ARRAY['bug','feature','design','urgent','chore']),
  due_date    TIMESTAMPTZ,
  position    DOUBLE PRECISION NOT NULL,               -- API field: "order"
  version     INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),   -- optimistic concurrency token
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cards_board_idx    ON cards (board_id);                 -- GET /boards/:id
CREATE INDEX cards_column_idx   ON cards (column_id, position);
CREATE INDEX cards_assignee_idx ON cards (assignee_id) WHERE assignee_id IS NOT NULL;

-- ── Comments and notifications ────────────────────────────────────────────
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_card_idx ON comments (card_id, created_at);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('assigned','commented','moved')),
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
```

## The queries that matter

**Optimistic-concurrency update** — the heart of the project. One statement
does the check and the write; there is no read-then-write race:

```sql
UPDATE cards
   SET description = COALESCE($2, description),
       title       = COALESCE($3, title),
       -- ... other editable fields ...
       version     = version + 1,
       updated_at  = now()
 WHERE id = $1 AND version = $4          -- $4 = the version the client last saw
RETURNING *;
-- 1 row  → success, respond 200 with the row, publish card:updated
-- 0 rows → either the card is gone (404) or the version is stale (409). Disambiguate with a follow-up
--          SELECT 1 FROM cards WHERE id = $1 — it doesn't need to be atomic with the UPDATE.
```

**Board snapshot** (`GET /boards/:id`): three indexed reads (board, columns
by `(board_id, position)`, cards by `board_id`) plus comments for those
cards — or a single `json_agg` query. Always check membership first:

```sql
SELECT m.role FROM memberships m
  JOIN boards b ON b.workspace_id = m.workspace_id
 WHERE b.id = $1 AND m.user_id = $2;      -- no row → 404 (don't leak existence)
```

**RBAC** always reads the role from `memberships` at request time — never
from a JWT claim or client input, so role changes take effect immediately.

**Refresh rotation:** `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING …`
— 0 rows means the token was already used → treat as theft and revoke the
whole `family_id`.

## Ordering strategy

`position` is a `DOUBLE PRECISION`. The frontend computes the new `order` when
dragging; the server stores it. If positions collide or run out of precision
after many midpoint insertions between the same two cards (~50), the server
renumbers the affected column (`0, 1000, 2000, …`) in one transaction and
broadcasts the resulting `card:moved` events. Simple integer indices would
force renumbering half the column on every drag.

## Redis keys

| Key / channel | Type | Purpose | Lifetime |
|---|---|---|---|
| `board:{id}` | pub/sub channel | Every mutation publishes its event here; each backend instance re-emits to its local Socket.IO room | — |
| `user:{id}` | pub/sub channel | Per-user `notification:new` events | — |
| `presence:{boardId}` | Set of `userId` | Who has the board open (`SADD`/`SREM`) | Cleaned on leave/disconnect; safety TTL 24 h refreshed on join |
| `presence:user:{boardId}:{userId}` | Counter | Number of open sockets of that user (same user, two tabs), so closing one tab doesn't drop presence | TTL 24 h |
| `cache:*` | String | Optional read-through cache (workspace member lists) | Short TTL |

## Migrations

Use a plain-SQL migration tool (`node-pg-migrate`, `dbmate`, Flyway). One
migration per change, forward-only in production; never edit an applied
migration. Seed script: one demo user, workspace, board, three columns, a few
cards — mirroring `frontend/src/data/mockData.ts` so the real backend feels the
same as mock mode.
