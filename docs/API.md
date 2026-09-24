# API Reference

Base URL: `http://localhost:4000/api` (set via `VITE_API_URL` on the
frontend). This is the contract the frontend already codes against — see
`frontend/src/lib/api.ts` for the client implementation and
`frontend/src/lib/types.ts` for the canonical TypeScript types. Implementing
this contract in `backend/` is a drop-in: no frontend changes needed.

## Authentication

All routes except `/auth/*` require:

```
Authorization: Bearer <accessToken>
```

The access token is a short-lived JWT (~15 min), returned in the body of
`/auth/login`, `/auth/register`, and `/auth/refresh`. The frontend keeps it
in memory only — it is never persisted, so a page reload requires a
successful `/auth/refresh` call. The refresh token is a longer-lived,
httpOnly, `Secure`, `SameSite` cookie set by the server; it never appears
in a JSON body and the frontend never reads it directly (`withCredentials:
true` on every request lets the browser send it automatically).

On any expired/invalid access token, return `401`. The frontend does not
currently auto-retry with `/auth/refresh` — that wiring is a reasonable
stretch goal on the frontend side once the backend exists (not required to
finish the core project).

## Data models

```ts
type Role = 'owner' | 'admin' | 'member'

User            { id, name, email, avatarColor }
Workspace       { id, name, role, memberCount }        // role = caller's role in this workspace
WorkspaceMember { userId, name, email, role, avatarColor }
Board           { id, workspaceId, name, description, updatedAt }
Column          { id, boardId, name, order }
Label           'bug' | 'feature' | 'design' | 'urgent' | 'chore'
Comment         { id, cardId, authorId, authorName, body, createdAt }
Card            {
                  id, boardId, columnId, title, description,
                  assigneeId: string | null,
                  labels: Label[],
                  dueDate: string | null,   // ISO 8601
                  order: number,
                  version: number,           // starts at 1, increments on every update
                  comments: Comment[]
                }
AppNotification { id, kind: 'assigned' | 'commented' | 'moved', message, read, createdAt }
```

All timestamps are ISO 8601 strings.

## Endpoints

### `POST /auth/register`

Create an account and log in immediately.

Request:
```json
{ "name": "Priya Nair", "email": "priya@example.com", "password": "••••••••" }
```
Response `201`:
```json
{ "user": { "id": "u2", "name": "Priya Nair", "email": "priya@example.com", "avatarColor": "#0ea5e9" },
  "accessToken": "eyJ..." }
```
Sets the refresh-token cookie. `409` if the email is already registered.

### `POST /auth/login`

Request: `{ "email": string, "password": string }`
Response `200`: same shape as register. `401` on bad credentials.

### `POST /auth/refresh`

No body — reads the refresh cookie. Response `200`: `{ "accessToken": "eyJ..." }`,
rotates the refresh cookie. `401` if the refresh token is missing/expired/revoked.

### `GET /workspaces`

Response `200`: `Workspace[]` — only workspaces the caller belongs to.

### `GET /workspaces/:id/members`

Response `200`: `WorkspaceMember[]`. `403` if the caller isn't a member of `:id`.

### `GET /workspaces/:id/boards`

Response `200`: `Board[]`.

### `GET /boards/:id`

Response `200`:
```json
{ "board": Board, "columns": Column[], "cards": Card[] }
```
`404` if the board doesn't exist or the caller can't access its workspace.

### `POST /boards/:id/columns`

Request: `{ "name": string }`
Response `201`: `Column`

### `POST /columns/:id/cards`

Request: `{ "boardId": string, "title": string }`
Response `201`: `Card` (`version: 1`, empty `comments`, `assigneeId: null`, `labels: []`)

Also broadcasts `card:created` (see WebSocket Events) to the board's room.

### `PATCH /cards/:id/move`

Request: `{ "columnId": string, "order": number }`
Response `204`. Broadcasts `card:moved`.

No version check here — reordering/moving is treated as low-stakes and
last-write-wins is acceptable (two people dragging the same card at the
literal same instant is an edge case not worth the friction of a conflict
dialog). Field edits (below) are where correctness actually matters.

### `PATCH /cards/:id`

Optimistic-concurrency-checked update. Any subset of the editable fields,
plus the version the client last saw:

Request:
```json
{ "description": "Updated text", "version": 3 }
```
- If the current row's `version` matches the request's `version`: apply
  the patch, increment `version`, respond `200` with the full updated
  `Card`, broadcast `card:updated`.
- If it doesn't match: respond `409` with no body change to the row.
  ```json
  { "error": "version_conflict" }
  ```

Editable fields: `title`, `description`, `assigneeId`, `labels`, `dueDate`.

### `DELETE /cards/:id`

Response `204`. Broadcasts `card:deleted`. `403` unless the caller's role
in the card's workspace is `owner` or `admin`.

### `POST /cards/:id/comments`

Request: `{ "body": string }`
Response `201`: `Comment`. Broadcasts `comment:created`. Also creates an
`AppNotification` (kind `commented`) for the card's assignee, if any, and
emits `notification:new` to them if they have a live connection.

### `GET /notifications`

Response `200`: `AppNotification[]` — the caller's own, newest first.

### `POST /notifications/:id/read`

Response `204`. `404` if the notification doesn't belong to the caller.

## Error shape

Any non-2xx response should be JSON:
```json
{ "error": "short_machine_readable_code", "message": "optional human-readable detail" }
```
The frontend only branches on HTTP status codes today (specifically `409`
on the card PATCH), so the exact error body isn't load-bearing — keep it
consistent for your own debugging and future-proofing.

## WebSocket events

Socket.IO, default namespace. Client connects and immediately does:

```js
socket.emit('board:join', { boardId })
// on leaving the board view:
socket.emit('board:leave', { boardId })
```

Server puts/removes the socket from room `board:<boardId>`. Every event
below is broadcast to that room (see `docs/ARCHITECTURE.md` for how this
fans out across multiple backend instances via Redis pub/sub).

| Event | Payload | Trigger |
|---|---|---|
| `card:created` | `{ card: Card }` | `POST /columns/:id/cards` |
| `card:updated` | `{ card: Card }` | successful `PATCH /cards/:id` |
| `card:moved` | `{ cardId, columnId, order }` | `PATCH /cards/:id/move` |
| `card:deleted` | `{ cardId }` | `DELETE /cards/:id` |
| `comment:created` | `{ comment: Comment }` | `POST /cards/:id/comments` |
| `presence:sync` | `{ users: PresenceUser[] }` | any `board:join`/`board:leave`/disconnect on the room |
| `notification:new` | `{ notification: AppNotification }` | a notification is created for a currently-connected user |

`PresenceUser` = `{ userId, name, avatarColor }`.

The client applies every event idempotently (checks IDs before
inserting/updating), so broadcasting to the whole room — including the
socket that caused the change — is fine and expected; no need to exclude
the sender.
