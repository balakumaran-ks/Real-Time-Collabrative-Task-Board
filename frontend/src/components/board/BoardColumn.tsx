import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TaskCard } from '@/components/board/TaskCard'
import type { Card, Column, WorkspaceMember } from '@/lib/types'

interface BoardColumnProps {
  column: Column
  cards: Card[]
  members: WorkspaceMember[]
  onCardClick: (card: Card) => void
  onAddCard: (title: string) => void
}

export function BoardColumn({ column, cards, members, onCardClick, onAddCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  function submit() {
    const trimmed = title.trim()
    if (trimmed) onAddCard(trimmed)
    setTitle('')
    setAdding(false)
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-surface-muted">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-sm font-semibold text-ink">{column.name}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg p-2 min-h-16 transition-colors ${isOver ? 'bg-brand-soft' : ''}`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              assignee={members.find((m) => m.userId === card.assigneeId)}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>
      <div className="p-2">
        {adding ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Card title..."
              className="w-full rounded-lg border border-border bg-surface p-2 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="flex gap-2">
              <button
                onClick={submit}
                className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover cursor-pointer"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="rounded-md px-2.5 py-1 text-xs text-ink-muted hover:bg-surface cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-surface hover:text-ink cursor-pointer"
          >
            <Plus size={15} /> Add card
          </button>
        )}
      </div>
    </div>
  )
}
