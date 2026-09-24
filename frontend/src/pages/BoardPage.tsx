import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { AppShell } from '@/components/layout/AppShell'
import { BoardColumn } from '@/components/board/BoardColumn'
import { CardModal } from '@/components/board/CardModal'
import { PresenceAvatars } from '@/components/board/PresenceAvatars'
import { client } from '@/lib/client'
import { useBoardSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import type { Board, Card, Column, PresenceUser, WorkspaceMember } from '@/lib/types'

export function BoardPage() {
  const { boardId = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [board, setBoard] = useState<Board | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    client.getBoard(boardId).then(({ board, columns, cards }) => {
      setBoard(board ?? null)
      setColumns(columns)
      setCards(cards)
      if (board) client.getMembers(board.workspaceId).then(setMembers)
    })
  }, [boardId])

  const applyRemoteEvent = useCallback((event: Parameters<Parameters<typeof useBoardSocket>[1]>[0]) => {
    switch (event.type) {
      case 'card:created':
        setCards((prev) => (prev.some((c) => c.id === event.card.id) ? prev : [...prev, event.card]))
        break
      case 'card:updated':
        setCards((prev) => prev.map((c) => (c.id === event.card.id ? event.card : c)))
        break
      case 'card:moved':
        setCards((prev) =>
          prev.map((c) => (c.id === event.cardId ? { ...c, columnId: event.columnId, order: event.order } : c)),
        )
        break
      case 'card:deleted':
        setCards((prev) => prev.filter((c) => c.id !== event.cardId))
        break
      case 'comment:created':
        setCards((prev) =>
          prev.map((c) => (c.id === event.comment.cardId ? { ...c, comments: [...c.comments, event.comment] } : c)),
        )
        break
      case 'presence:sync':
        setPresence(event.users)
        break
    }
  }, [])

  useBoardSocket(boardId, applyRemoteEvent)

  const currentRole = useMemo(
    () => members.find((m) => m.userId === user?.id)?.role ?? 'member',
    [members, user],
  )
  const canManageBoard = currentRole === 'owner' || currentRole === 'admin'

  const activeCard = cards.find((c) => c.id === activeCardId) ?? null

  function cardsForColumn(columnId: string) {
    return cards.filter((c) => c.columnId === columnId).sort((a, b) => a.order - b.order)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    // Dropped on a column (empty area) or on another card — resolve target column either way.
    const overColumn = columns.find((c) => c.id === over.id)
    const overCard = cards.find((c) => c.id === over.id)
    const targetColumnId = overColumn?.id ?? overCard?.columnId
    if (!targetColumnId) return

    const targetCards = cardsForColumn(targetColumnId).filter((c) => c.id !== activeCard.id)
    const overIndex = overCard ? targetCards.findIndex((c) => c.id === overCard.id) : targetCards.length
    const newOrder = overIndex === -1 ? targetCards.length : overIndex

    setCards((prev) =>
      prev.map((c) => (c.id === activeCard.id ? { ...c, columnId: targetColumnId, order: newOrder } : c)),
    )
    await client.moveCard(activeCard.id, targetColumnId, newOrder)
  }

  async function handleAddCard(columnId: string, title: string) {
    const card = await client.createCard(boardId, columnId, title)
    setCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]))
  }

  async function handleAddColumn() {
    const name = newColumnName.trim()
    if (!name) return
    const column = await client.createColumn(boardId, name)
    setColumns((prev) => [...prev, column])
    setNewColumnName('')
    setAddingColumn(false)
  }

  async function handleSaveCard(patch: Partial<Pick<Card, 'title' | 'description' | 'assigneeId' | 'labels' | 'dueDate'>>) {
    if (!activeCard) return 'conflict' as const
    const result = await client.updateCard(activeCard.id, patch, activeCard.version)
    if (result.ok) {
      setCards((prev) => prev.map((c) => (c.id === result.card.id ? result.card : c)))
      return 'ok' as const
    }
    // Reconcile with latest server state so the modal shows current data.
    const { cards: freshCards } = await client.getBoard(boardId)
    setCards(freshCards)
    return 'conflict' as const
  }

  async function handleDeleteCard() {
    if (!activeCard) return
    await client.deleteCard(activeCard.id)
    setCards((prev) => prev.filter((c) => c.id !== activeCard.id))
    setActiveCardId(null)
  }

  async function handleAddComment(body: string) {
    if (!activeCard) return
    const comment = await client.addComment(activeCard.id, body)
    setCards((prev) =>
      prev.map((c) => (c.id === activeCard.id ? { ...c, comments: [...c.comments, comment] } : c)),
    )
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-1 flex items-center gap-1 text-sm text-ink-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} /> Boards
          </button>
          <h1 className="text-xl font-semibold text-ink">{board?.name ?? 'Loading…'}</h1>
        </div>
        <PresenceAvatars users={presence} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                cards={cardsForColumn(column.id)}
                members={members}
                onCardClick={(card) => setActiveCardId(card.id)}
                onAddCard={(title) => handleAddCard(column.id, title)}
              />
            ))}

          <div className="w-72 shrink-0">
            {addingColumn ? (
              <div className="space-y-1.5 rounded-xl border border-border bg-surface p-2">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                  placeholder="Column name..."
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingColumn(false)}
                    className="rounded-md px-2.5 py-1 text-xs text-ink-muted hover:bg-surface-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border p-3 text-sm text-ink-muted hover:border-brand hover:text-brand cursor-pointer"
              >
                <Plus size={15} /> Add column
              </button>
            )}
          </div>
        </div>
      </DndContext>

      {activeCard && (
        <CardModal
          card={activeCard}
          members={members}
          canDelete={canManageBoard}
          onClose={() => setActiveCardId(null)}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onAddComment={handleAddComment}
        />
      )}
    </AppShell>
  )
}
