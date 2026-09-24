import * as real from '@/lib/api'
import * as mock from '@/lib/mockBackend'

// Single seam the whole app talks to. USE_MOCKS is on by default so the
// UI is fully browsable before backend/ has an implementation. Once the
// real API is up, set VITE_USE_MOCKS=false (and VITE_API_URL) in .env —
// no other file in src/ needs to change.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export const client = {
  login: (email: string, password: string) =>
    USE_MOCKS ? mock.mockLogin(email, password) : real.login(email, password),

  register: (name: string, email: string, password: string) =>
    USE_MOCKS ? mock.mockRegister(name, email, password) : real.register(name, email, password),

  getWorkspaces: () => (USE_MOCKS ? mock.mockGetWorkspaces() : real.getWorkspaces()),

  getMembers: (workspaceId: string) => (USE_MOCKS ? mock.mockGetMembers(workspaceId) : real.getMembers(workspaceId)),

  getBoards: (workspaceId: string) => (USE_MOCKS ? mock.mockGetBoards(workspaceId) : real.getBoards(workspaceId)),

  getBoard: (boardId: string) => (USE_MOCKS ? mock.mockGetBoard(boardId) : real.getBoard(boardId)),

  createColumn: (boardId: string, name: string) =>
    USE_MOCKS ? mock.mockCreateColumn(boardId, name) : real.createColumn(boardId, name),

  createCard: (boardId: string, columnId: string, title: string) =>
    USE_MOCKS ? mock.mockCreateCard(boardId, columnId, title) : real.createCard(boardId, columnId, title),

  moveCard: (cardId: string, columnId: string, order: number) =>
    USE_MOCKS ? mock.mockMoveCard(cardId, columnId, order) : real.moveCard(cardId, columnId, order),

  updateCard: (
    cardId: string,
    patch: Parameters<typeof real.updateCard>[1],
    expectedVersion: number,
  ) => (USE_MOCKS ? mock.mockUpdateCard(cardId, patch, expectedVersion) : real.updateCard(cardId, patch, expectedVersion)),

  deleteCard: (cardId: string) => (USE_MOCKS ? mock.mockDeleteCard(cardId) : real.deleteCard(cardId)),

  addComment: (cardId: string, body: string) =>
    USE_MOCKS ? mock.mockAddComment(cardId, body) : real.addComment(cardId, body),

  getNotifications: () => (USE_MOCKS ? mock.mockGetNotifications() : real.getNotifications()),

  markNotificationRead: (id: string) =>
    USE_MOCKS ? mock.mockMarkNotificationRead(id) : real.markNotificationRead(id),
}
