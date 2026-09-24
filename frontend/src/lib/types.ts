export type Role = 'owner' | 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  avatarColor: string
}

export interface Workspace {
  id: string
  name: string
  role: Role
  memberCount: number
}

export interface WorkspaceMember {
  userId: string
  name: string
  email: string
  role: Role
  avatarColor: string
}

export interface Board {
  id: string
  workspaceId: string
  name: string
  description: string
  updatedAt: string
}

export interface Column {
  id: string
  boardId: string
  name: string
  order: number
}

export type Label = 'bug' | 'feature' | 'design' | 'urgent' | 'chore'

export interface Comment {
  id: string
  cardId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

export interface Card {
  id: string
  boardId: string
  columnId: string
  title: string
  description: string
  assigneeId: string | null
  labels: Label[]
  dueDate: string | null
  order: number
  version: number
  comments: Comment[]
}

export interface PresenceUser {
  userId: string
  name: string
  avatarColor: string
}

export type NotificationKind = 'assigned' | 'commented' | 'moved'

export interface AppNotification {
  id: string
  kind: NotificationKind
  message: string
  read: boolean
  createdAt: string
}

// Real-time event payloads exchanged over the WebSocket connection.
// Mirrors the contract documented in backend/README.md.
export type SocketEvent =
  | { type: 'card:created'; card: Card }
  | { type: 'card:updated'; card: Card }
  | { type: 'card:moved'; cardId: string; columnId: string; order: number }
  | { type: 'card:deleted'; cardId: string }
  | { type: 'comment:created'; comment: Comment }
  | { type: 'presence:sync'; users: PresenceUser[] }
  | { type: 'notification:new'; notification: AppNotification }
