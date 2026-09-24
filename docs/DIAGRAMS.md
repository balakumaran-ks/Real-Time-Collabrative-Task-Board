# Diagrams

All diagrams are [Mermaid](https://mermaid.js.org/) — they render natively on
GitHub and live as text in the repo, so they diff and review like code. The
polished overview image is
[`assets/architecture-diagram.png`](assets/architecture-diagram.png)
(source: [`assets/architecture-diagram.html`](assets/architecture-diagram.html)).

Contents: [C4 context](#c4-level-1--system-context) ·
[C4 container](#c4-level-2--containers) ·
[Backend class diagram](#class-diagram-backend) ·
[Frontend structure](#class-diagram-frontend) ·
[ER diagram](#er-diagram) ·
[Sequence: sign-in & refresh](#sequence-sign-in-and-token-refresh) ·
[Sequence: open a board](#sequence-open-a-board-and-presence) ·
[Sequence: edit a card](#sequence-edit-a-card-optimistic-concurrency) ·
[Sequence: multi-instance fan-out](#sequence-move-a-card-multi-instance-fan-out) ·
[Sequence: comment → notification](#sequence-comment-and-notification) ·
[Card version state](#state-machine-card-version-under-concurrent-edits) ·
[Client connection state](#state-machine-client-realtime-connection) ·
[Deployment](#deployment)

---

## C4 level 1 — system context

```mermaid
flowchart LR
    member(["Workspace member<br/>creates and moves cards"])
    admin(["Workspace owner / admin<br/>also deletes cards, manages members"])

    system["<b>Real-Time Collaborative Task Board</b><br/>boards, cards, comments,<br/>live sync, presence, notifications"]

    member -- "browser: REST + WebSocket" --> system
    admin -- "browser: REST + WebSocket" --> system
```

## C4 level 2 — containers

```mermaid
flowchart TB
    subgraph browser["Browser"]
        spa["<b>React SPA</b><br/>React 19 · Zustand · dnd-kit<br/>lib/client.ts seam: real API or mock"]
    end

    lb["Load balancer<br/>sticky sessions not required"]

    subgraph app["Backend — stateless, N instances"]
        rest["<b>REST API</b><br/>auth · RBAC · CRUD<br/>optimistic-lock PATCH"]
        ws["<b>Socket.IO gateway</b><br/>rooms: board:id<br/>presence"]
        sub["<b>Redis subscriber</b><br/>re-emits events to local room"]
    end

    subgraph data["Data tier"]
        pg[("<b>PostgreSQL</b><br/>source of truth")]
        redis[("<b>Redis</b><br/>pub/sub board:id · presence sets · cache")]
    end

    spa -- "HTTPS REST" --> lb
    spa -- "WebSocket" --> lb
    lb --> rest
    lb --> ws

    rest -- "SQL: write, WHERE version = ?" --> pg
    rest -- "PUBLISH board:id event" --> redis
    redis -- "SUBSCRIBE" --> sub
    sub --> ws
    ws -- "SADD / SREM presence" --> redis
    ws -- "emit to room" --> spa
```

---

## Class diagram (backend)

Layered: **routes → middleware → services → repositories**, with the real-time
layer (publisher / subscriber / gateway) as a sibling that services call
*after* a successful write. Repositories are interfaces in practice (Postgres
adapters), so services can be unit-tested with fakes. Names are
TypeScript-flavoured; the structure is language-agnostic.

```mermaid
classDiagram
    direction LR

    %% ---------- HTTP layer ----------
    class AuthController {
        +register(dto) AuthResponse
        +login(dto) AuthResponse
        +refresh(cookie) AccessToken
    }
    class WorkspaceController {
        +list(user) Workspace[]
        +members(workspaceId) WorkspaceMember[]
        +boards(workspaceId) Board[]
    }
    class BoardController {
        +get(boardId) BoardSnapshot
        +addColumn(boardId, dto) Column
    }
    class CardController {
        +create(columnId, dto) Card
        +update(cardId, dto, version) Card
        +move(cardId, dto) void
        +remove(cardId) void
    }
    class CommentController {
        +create(cardId, dto) Comment
    }
    class NotificationController {
        +list(user) AppNotification[]
        +markRead(id) void
    }

    class AuthMiddleware {
        +handle(req) void
    }
    class RbacMiddleware {
        +requireRole(minRole) Handler
    }

    %% ---------- Services ----------
    class AuthService {
        +register(dto) User
        +login(email, password) User
    }
    class TokenService {
        +issueAccess(user) string
        +issueRefresh(user) string
        +rotateRefresh(token) string
        +revokeFamily(token) void
    }
    class WorkspaceService {
        +listFor(userId) Workspace[]
        +roleOf(userId, workspaceId) Role
    }
    class BoardService {
        +snapshot(boardId, userId) BoardSnapshot
        +addColumn(boardId, name) Column
    }
    class CardService {
        +create(columnId, boardId, title) Card
        +update(cardId, patch, version) Card
        +move(cardId, columnId, order) void
        +remove(cardId) void
    }
    class CommentService {
        +add(cardId, authorId, body) Comment
    }
    class NotificationService {
        +notify(userId, kind, message) AppNotification
        +listFor(userId) AppNotification[]
        +markRead(id, userId) void
    }
    class PresenceService {
        +join(boardId, user) PresenceUser[]
        +leave(boardId, userId) PresenceUser[]
        +list(boardId) PresenceUser[]
    }

    %% ---------- Real-time ----------
    class EventPublisher {
        +publishBoardEvent(boardId, event) void
        +publishUserEvent(userId, event) void
    }
    class EventSubscriber {
        +subscribeBoard(boardId) void
        +unsubscribeBoard(boardId) void
        -onMessage(channel, event) void
    }
    class SocketGateway {
        +onConnection(socket) void
        -onJoin(socket, boardId) void
        -onLeave(socket, boardId) void
        -onDisconnect(socket) void
        +emitToRoom(boardId, event) void
        +emitToUser(userId, event) void
    }

    %% ---------- Repositories ----------
    class UserRepository {
        <<interface>>
        +findByEmail(email) User
        +insert(user) User
    }
    class RefreshTokenRepository {
        <<interface>>
        +insert(token) void
        +findValid(hash) RefreshToken
        +revoke(id) void
    }
    class MembershipRepository {
        <<interface>>
        +roleOf(userId, workspaceId) Role
        +members(workspaceId) WorkspaceMember[]
    }
    class BoardRepository {
        <<interface>>
        +snapshot(boardId) BoardSnapshot
        +insertColumn(column) Column
    }
    class CardRepository {
        <<interface>>
        +insert(card) Card
        +updateIfVersion(id, patch, version) Card
        +move(id, columnId, order) void
        +delete(id) void
    }
    class CommentRepository {
        <<interface>>
        +insert(comment) Comment
    }
    class NotificationRepository {
        <<interface>>
        +insert(n) AppNotification
        +listFor(userId) AppNotification[]
        +markRead(id, userId) bool
    }

    %% ---------- Domain ----------
    class Role {
        <<enumeration>>
        owner
        admin
        member
    }
    class VersionConflictError {
        <<exception>>
    }
    class User
    class Workspace
    class Membership
    class Board
    class Column
    class Card {
        +id string
        +title string
        +description string
        +assigneeId string
        +labels Label[]
        +dueDate Date
        +order number
        +version int
    }
    class Comment
    class AppNotification

    AuthController --> AuthService
    AuthController --> TokenService
    WorkspaceController --> WorkspaceService
    BoardController --> BoardService
    CardController --> CardService
    CommentController --> CommentService
    NotificationController --> NotificationService

    CardController ..> AuthMiddleware : runs after
    CardController ..> RbacMiddleware : delete needs admin
    RbacMiddleware --> WorkspaceService

    AuthService --> UserRepository
    TokenService --> RefreshTokenRepository
    WorkspaceService --> MembershipRepository
    BoardService --> BoardRepository
    CardService --> CardRepository
    CardService --> EventPublisher
    CardService --> NotificationService
    CardService ..> VersionConflictError : throws
    CommentService --> CommentRepository
    CommentService --> EventPublisher
    CommentService --> NotificationService
    NotificationService --> NotificationRepository
    NotificationService --> EventPublisher

    EventSubscriber --> SocketGateway
    SocketGateway --> PresenceService
    SocketGateway --> EventSubscriber
    EventPublisher ..> EventSubscriber : via Redis pub/sub

    Membership --> Role
    Workspace "1" --> "0..*" Membership
    User "1" --> "0..*" Membership
    Workspace "1" --> "0..*" Board
    Board "1" --> "0..*" Column
    Column "1" --> "0..*" Card
    Card "1" --> "0..*" Comment
    User "1" --> "0..*" AppNotification
```

## Class diagram (frontend)

The frontend is already built. The key structural idea is the **`client.ts`
seam**: pages only ever import `client`, which delegates to either the real
REST client or an in-memory mock with identical signatures — so the backend
can be built later with a one-line env flip.

```mermaid
classDiagram
    direction TB

    class Pages {
        LoginPage
        RegisterPage
        WorkspacesPage
        BoardsPage
        BoardPage
        MembersPage
    }
    class BoardComponents {
        BoardColumn
        TaskCard
        CardModal
        PresenceAvatars
    }
    class UiPrimitives {
        Button
        Input
        Modal
        Avatar
        Badge
    }
    class AppShell {
        +topbar
        +NotificationBell
    }
    class ProtectedRoute
    class AuthStore {
        <<zustand>>
        +user User
        +accessToken string
        +login(email, password) void
        +logout() void
    }
    class client {
        <<seam: lib/client.ts>>
        +login() register() getBoard()
        +createCard() updateCard() moveCard()
        +addComment() listNotifications()
    }
    class api {
        <<axios REST client>>
        VITE_USE_MOCKS=false
    }
    class mockBackend {
        <<in-memory fake>>
        VITE_USE_MOCKS=true
    }
    class useBoardSocket {
        <<hook: hooks/useSocket.ts>>
        +subscribe(boardId, handler)
    }
    class SocketIoClient {
        <<socket.io-client>>
    }
    class eventBus {
        <<mock event bus>>
    }
    class types {
        <<lib/types.ts>>
        Card Board Column Comment
        SocketEvent
    }

    Pages --> BoardComponents
    Pages --> UiPrimitives
    Pages --> client
    Pages --> useBoardSocket
    Pages --> AuthStore
    ProtectedRoute --> AuthStore
    AppShell --> client
    BoardComponents --> client
    client ..> api : when real
    client ..> mockBackend : when mock
    api --> AuthStore : bearer token
    useBoardSocket ..> SocketIoClient : when real
    useBoardSocket ..> eventBus : when mock
    mockBackend --> eventBus : emits
    client ..> types
    useBoardSocket ..> types
```

---

## ER diagram

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : "belongs to workspaces via"
    WORKSPACES ||--o{ MEMBERSHIPS : has
    WORKSPACES ||--o{ BOARDS : contains
    BOARDS ||--o{ COLUMNS : has
    BOARDS ||--o{ CARDS : holds
    COLUMNS ||--o{ CARDS : "currently contains"
    USERS ||--o{ CARDS : "assigned to"
    CARDS ||--o{ COMMENTS : has
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ REFRESH_TOKENS : holds

    USERS {
        uuid id PK
        text name
        citext email UK
        text password_hash
        text avatar_color
        timestamptz created_at
    }
    WORKSPACES {
        uuid id PK
        text name
        timestamptz created_at
    }
    MEMBERSHIPS {
        uuid workspace_id PK
        uuid user_id PK
        text role
        timestamptz joined_at
    }
    BOARDS {
        uuid id PK
        uuid workspace_id FK
        text name
        text description
        timestamptz updated_at
    }
    COLUMNS {
        uuid id PK
        uuid board_id FK
        text name
        double position
    }
    CARDS {
        uuid id PK
        uuid board_id FK
        uuid column_id FK
        text title
        text description
        uuid assignee_id FK
        text_array labels
        timestamptz due_date
        double position
        int version
        timestamptz updated_at
    }
    COMMENTS {
        uuid id PK
        uuid card_id FK
        uuid author_id FK
        text body
        timestamptz created_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text kind
        text message
        boolean read
        timestamptz created_at
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        uuid family_id
        bytea token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
    }
```

---

## Sequence: sign-in and token refresh

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SPA as React SPA
    participant API as REST API
    participant PG as PostgreSQL

    U->>SPA: submit email + password
    SPA->>API: POST /auth/login
    API->>PG: SELECT user WHERE email
    API->>API: verify bcrypt/argon2 hash
    API->>PG: INSERT refresh_token (hash, family_id, expires)
    API-->>SPA: 200 {user, accessToken} + Set-Cookie refresh_token (httpOnly, Secure, SameSite)
    SPA->>SPA: keep accessToken in memory only (Zustand)

    Note over SPA: page reload: memory is gone
    SPA->>API: POST /auth/refresh (cookie sent automatically)
    API->>PG: find token by hash, check not revoked / not expired
    alt valid
        API->>PG: revoke old token, insert rotated token (same family)
        API-->>SPA: 200 {accessToken} + Set-Cookie rotated refresh_token
    else revoked token reused (theft signal)
        API->>PG: revoke entire family
        API-->>SPA: 401
        SPA->>U: redirect to /login
    end
```

## Sequence: open a board and presence

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SPA as React SPA
    participant API as REST API
    participant WS as Socket.IO gateway
    participant R as Redis
    participant PG as PostgreSQL

    U->>SPA: open /boards/b1
    SPA->>API: GET /boards/b1 (Bearer token)
    API->>API: AuthMiddleware verifies JWT, membership check
    API->>PG: board + columns + cards (+ comments)
    API-->>SPA: 200 {board, columns, cards}
    SPA->>WS: connect (auth token) then emit board:join {boardId}
    WS->>WS: socket.join(room board:b1)
    WS->>R: SADD presence:b1 user
    WS->>R: SUBSCRIBE board:b1 (first local socket for this board)
    WS->>R: SMEMBERS presence:b1
    R-->>WS: current users
    WS-->>SPA: broadcast presence:sync {users} to room board:b1
    Note over SPA,WS: from here, changes arrive as events, not polling
    U->>SPA: leave board / close tab
    SPA->>WS: board:leave (or disconnect)
    WS->>R: SREM presence:b1 user
    WS-->>SPA: presence:sync {users} to remaining clients
```

## Sequence: edit a card (optimistic concurrency)

The scenario worth being able to draw on a whiteboard.

```mermaid
sequenceDiagram
    autonumber
    actor A as Client A
    actor B as Client B
    participant API as REST API
    participant PG as PostgreSQL
    participant R as Redis pub/sub

    Note over A,B: Both have card X open at version 3

    A->>API: PATCH /cards/X {description, version: 3}
    API->>PG: UPDATE cards SET description=?, version=version+1 WHERE id=X AND version=3 RETURNING *
    PG-->>API: 1 row (version now 4)
    API->>R: PUBLISH board:b1 card:updated (card v4)
    API-->>A: 200 Card (v4)
    R-->>B: card:updated (card v4) via room broadcast

    Note over B: B had a stale modal open, or the event has not arrived yet
    B->>API: PATCH /cards/X {assigneeId, version: 3}
    API->>PG: UPDATE ... WHERE id=X AND version=3
    PG-->>API: 0 rows (current version is 4)
    API-->>B: 409 {error: version_conflict}
    B->>B: show conflict banner, refetch card (v4)
    B->>API: PATCH /cards/X {assigneeId, version: 4}
    API->>PG: UPDATE ... WHERE id=X AND version=4
    PG-->>API: 1 row (version 5)
    API->>R: PUBLISH board:b1 card:updated (card v5)
    API-->>B: 200 Card (v5)
```

## Sequence: move a card (multi-instance fan-out)

Why broadcasts go through Redis instead of calling `io.to(room).emit()`
directly: a client connected to instance 2 must see a change made through
instance 1.

```mermaid
sequenceDiagram
    autonumber
    actor A as Client A (on instance 1)
    actor B as Client B (on instance 2)
    participant I1 as Backend instance 1
    participant I2 as Backend instance 2
    participant PG as PostgreSQL
    participant R as Redis pub/sub

    Note over I1,I2: both subscribed to channel board:b1
    A->>I1: PATCH /cards/X/move {columnId, order}
    I1->>I1: RBAC: member can move
    I1->>PG: UPDATE cards SET column_id, position
    I1->>R: PUBLISH board:b1 card:moved
    I1-->>A: 204 No Content
    R-->>I1: message (I1 is also subscribed)
    R-->>I2: message
    I1-->>A: emit card:moved to local room board:b1
    I2-->>B: emit card:moved to local room board:b1
    Note over A: client applies events idempotently, so the sender receiving its own event is harmless
```

## Sequence: comment and notification

```mermaid
sequenceDiagram
    autonumber
    actor A as Commenter
    actor T as Assignee (online)
    participant API as REST API
    participant PG as PostgreSQL
    participant R as Redis pub/sub

    A->>API: POST /cards/X/comments {body}
    API->>PG: INSERT comment
    API->>R: PUBLISH board:b1 comment:created
    opt card has an assignee other than the commenter
        API->>PG: INSERT notification (kind=commented, user=assignee)
        API->>R: PUBLISH user:assignee notification:new
    end
    API-->>A: 201 Comment
    R-->>T: comment:created (room broadcast)
    R-->>T: notification:new (their live connection, if any)
    Note over T: if offline, they see it on the next GET /notifications
```

---

## State machine: card version under concurrent edits

```mermaid
stateDiagram-v2
    [*] --> v1 : POST /columns/:id/cards
    v1 --> v2 : PATCH with version=1 succeeds
    v2 --> v3 : PATCH with version=2 succeeds
    v3 --> vN : PATCH with version=current succeeds

    v2 --> v2 : PATCH with version=1 - 409 version_conflict, no write
    v3 --> v3 : PATCH with stale version - 409, client refetches

    vN --> [*] : DELETE (owner or admin only)

    note right of v2
        Every successful field edit does
        version = version + 1 in one UPDATE
        guarded by WHERE version = ?.
        Moves are last-write-wins (see ADR-0005).
    end note
```

## State machine: client realtime connection

```mermaid
stateDiagram-v2
    [*] --> connecting : BoardPage mounts
    connecting --> joined : socket connected then board:join acked by presence:sync
    joined --> joined : card / comment / presence events applied idempotently
    joined --> reconnecting : network drop
    reconnecting --> joined : reconnect then re-emit board:join then refetch board snapshot
    reconnecting --> failed : retries exhausted
    failed --> connecting : user reloads
    joined --> [*] : BoardPage unmounts (board:leave)

    note right of reconnecting
        Missed events cannot be replayed,
        so after reconnect the client refetches
        GET /boards/:id to resync.
    end note
```

## Deployment

```mermaid
flowchart TB
    internet(("Internet"))

    subgraph edge["Edge"]
        cdn["CDN: static SPA assets"]
        lb["Load balancer: TLS, WebSocket upgrade"]
    end

    subgraph compute["Compute - containers"]
        direction LR
        b1["backend #1<br/>REST + Socket.IO"]
        b2["backend #2<br/>REST + Socket.IO"]
    end

    subgraph state["Stateful services - managed or compose"]
        pg[("PostgreSQL primary<br/>+ optional read replica")]
        rd[("Redis<br/>pub/sub, presence, cache")]
    end

    subgraph obs["Observability"]
        logs["Structured logs"]
        metrics["Metrics: connections, event fan-out lag, 409 rate"]
    end

    internet --> cdn
    internet --> lb
    lb --> b1
    lb --> b2
    b1 & b2 --> pg
    b1 & b2 <--> rd
    b1 & b2 -.-> logs
    b1 & b2 -.-> metrics
```
