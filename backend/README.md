# Backend — Real-Time Collaborative Task Board

The frontend (`../frontend`) is done and already speaks a specific API
contract — it's currently running against an in-memory mock
(`frontend/src/lib/mockBackend.ts`) so you can see the whole app working
today. Your job is to build a real backend that satisfies the same
contract. When you're done, flip one env var and the mocks disappear:

```
# frontend/.env
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=http://localhost:4000
```

Nothing in `frontend/src` should need to change if you match this doc.
The exact shapes are also readable directly in the frontend source —
`frontend/src/lib/types.ts` (data models + WebSocket events),
`frontend/src/lib/api.ts` (REST calls the UI makes),
`frontend/src/hooks/useSocket.ts` (how it connects to the socket).

Read the full design reasoning in the project brief you already have
(the "what to do / how to do it / skills gained" doc for this project) —
this file is the concrete, implementable spec version of it.

## Tech stack (recommended, not mandatory)

- **API**: Node.js + Express or Fastify (TypeScript strongly recommended —
  you can literally import the shared types from `frontend/src/lib/types.ts`
  if you keep this a monorepo)
- **DB**: PostgreSQL
- **Real-time**: Socket.IO
- **Cache / pub-sub / presence**: Redis
- **Auth**: JWT access token (short-lived) + refresh token (httpOnly cookie)

If you'd rather use Django/FastAPI/Spring/whatever you're stronger in, that's
fine — the contract below is language-agnostic. Just keep the endpoint
shapes and the WebSocket event names identical, since the frontend is fixed.

## Data model

```
User        id, name, email, password_hash, avatar_color
Workspace   id, name
Membership  workspace_id, user_id, role (owner|admin|member)
Board       id, workspace_id, name, description, updated_at
Column      id, board_id, name, order
Card        id, board_id, column_id, title, description,
            assignee_id (nullable), labels (string[]), due_date (nullable),
            order, version (int, starts at 1)
Comment     id, card_id, author_id, body, created_at
Notification id, user_id, kind (assigned|commented|moved), message, read, created_at
```

`version` on `Card` is not decorative — see **Optimistic concurrency** below.
It's the one field that turns this from a toy CRUD app into something worth
discussing in an interview.

## REST API contract

All authenticated routes expect `Authorization: Bearer <accessToken>`.
Base path: `/api`.

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | `{user, accessToken}` | Set refresh token as httpOnly cookie |
| POST | `/auth/login` | `{email, password}` | `{user, accessToken}` | Same |
| POST | `/auth/refresh` | — (cookie) | `{accessToken}` | Rotates the refresh token |
| GET | `/workspaces` | — | `Workspace[]` | Only workspaces the caller belongs to; include their `role` |
| GET | `/workspaces/:id/members` | — | `WorkspaceMember[]` | |
| GET | `/workspaces/:id/boards` | — | `Board[]` | |
| GET | `/boards/:id` | — | `{board, columns, cards}` | |
| POST | `/boards/:id/columns` | `{name}` | `Column` | |
| POST | `/columns/:id/cards` | `{boardId, title}` | `Card` | |
| PATCH | `/cards/:id/move` | `{columnId, order}` | `204` | Also broadcasts `card:moved` |
| PATCH | `/cards/:id` | `{...fields, version}` | `Card` or `409` | See concurrency section |
| DELETE | `/cards/:id` | — | `204` | Requires owner/admin role |
| POST | `/cards/:id/comments` | `{body}` | `Comment` | |
| GET | `/notifications` | — | `AppNotification[]` | Caller's own notifications |
| POST | `/notifications/:id/read` | — | `204` | |

Exact request/response field names must match `frontend/src/lib/types.ts` —
the frontend does zero field-name translation.

## WebSocket contract

Socket.IO. On connect, the client immediately does:

```js
socket.emit('board:join', { boardId })
// ...later, on unmount:
socket.emit('board:leave', { boardId })
```

Your server should put that socket in a room named `board:<boardId>` and
remove it on leave/disconnect. Every mutation handled over REST should also
emit the matching event **to that room**:

| Event | Payload | Fired when |
|---|---|---|
| `card:created` | `{ card }` | a card is created |
| `card:updated` | `{ card }` | title/description/assignee/labels/dueDate change |
| `card:moved` | `{ cardId, columnId, order }` | a card changes column/position |
| `card:deleted` | `{ cardId }` | a card is deleted |
| `comment:created` | `{ comment }` | a comment is added |
| `presence:sync` | `{ users: PresenceUser[] }` | someone joins/leaves the board room |
| `notification:new` | `{ notification }` | a notification is created for an online user |

`PresenceUser` is `{ userId, name, avatarColor }`. Maintain the presence set
per board in Redis (`SADD`/`SREM` on join/leave/disconnect) and broadcast
the full current list on every change — the frontend just replaces its
local list, it doesn't diff.

**Gotcha the frontend already accounts for, so you don't have to hack
around it**: the client that performs a mutation gets both the HTTP
response and the room broadcast. Don't worry about deduping — the frontend
applies events idempotently (checks `card.id` before adding). You do NOT
need to exclude the emitting socket from the broadcast; keep the server
logic simple and broadcast to the whole room including the sender.

## Auth

- Hash passwords with bcrypt (or argon2).
- Access token: JWT, ~15 min expiry, sent in the `Authorization` header,
  returned in the login/register/refresh response body (the frontend
  stores it in memory, not localStorage — don't rely on it persisting;
  the refresh flow is what survives a page reload).
- Refresh token: longer-lived (e.g. 7 days), stored as an **httpOnly,
  secure, sameSite cookie**, rotated on every use (issue a new one, in
  validate the old one is invalidated — simplest approach is a `refresh_tokens`
  table with a `revoked_at` column).
- Every protected route: middleware that verifies the access token,
  attaches `req.user`.

## RBAC

Three roles per workspace: `owner`, `admin`, `member`.

- Any member can: view boards/cards, create cards, move cards, comment,
  create columns.
- Only `owner`/`admin` can: delete a card, delete a board, change another
  member's role, remove a member.
- Check the role from the `Membership` row for `(workspace_id, user_id)` —
  don't trust anything the client sends about the caller's role.

## Optimistic concurrency (the part worth doing properly)

The frontend sends the `version` it last saw whenever it PATCHes a card
(see `updateCard` in `frontend/src/lib/api.ts`). Your handler must:

1. Load the card.
2. If `card.version !== request.version`, respond `409 Conflict` and do
   **not** apply the patch.
3. Otherwise, apply the patch, increment `version`, save, respond `200`
   with the full updated card, and broadcast `card:updated`.

The frontend already handles the 409 case (shows a banner, refetches the
board). You just need to enforce it server-side — this is a `WHERE id = ?
AND version = ?` in your UPDATE query, check the affected row count, that's
it. Don't skip this to save time; it's the single most interview-relevant
piece of this whole backend.

## Build order

1. **Auth + plain CRUD first.** Register/login/refresh, then workspaces →
   boards → columns → cards → comments, all over REST, no sockets yet. Get
   this fully correct and manually tested (Postman/curl/Thunder Client)
   before adding real-time — debugging WebSocket bugs on top of broken CRUD
   is miserable.
2. **RBAC middleware.** Add the role check to the mutating routes.
3. **Optimistic concurrency** on the card PATCH route.
4. **WebSocket layer.** Socket.IO server, room join/leave, emit the 7
   events above from your existing REST handlers.
5. **Presence** via Redis set + `presence:sync` broadcast.
6. **Notifications.** Insert a row on assign/comment, emit
   `notification:new` if the target user has an active socket in that
   workspace, otherwise they just see it next time they call
   `GET /notifications`.
7. Point the frontend at you: `VITE_USE_MOCKS=false`, run both, click
   through the whole app.

## Testing against the real frontend

```
cd backend && <run your server on :4000>
cd frontend
cp .env.example .env   # then edit: VITE_USE_MOCKS=false
npm run dev
```

Open the app in two browser windows (or one normal + one incognito) logged
in as different seeded users, open the same board in both, and confirm:
moving a card in one window updates the other live, presence avatars show
both users, and editing the same card in both windows triggers a 409 in
the second save.

## Stretch goals (only after the above works end-to-end)

- Rate limit the comment/card-creation endpoints per user
- Soft-delete + an "activity log" per board
- Move from a single backend instance to two, prove pub/sub still works
  (Redis is already in the design for exactly this reason)
