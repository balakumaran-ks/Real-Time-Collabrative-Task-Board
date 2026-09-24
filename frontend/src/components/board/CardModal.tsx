import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LabelBadge } from '@/components/ui/Badge'
import type { Card, Label, WorkspaceMember } from '@/lib/types'

const ALL_LABELS: Label[] = ['bug', 'feature', 'design', 'urgent', 'chore']

interface CardModalProps {
  card: Card
  members: WorkspaceMember[]
  canDelete: boolean
  onClose: () => void
  onSave: (patch: Partial<Pick<Card, 'title' | 'description' | 'assigneeId' | 'labels' | 'dueDate'>>) => Promise<'ok' | 'conflict'>
  onDelete: () => void
  onAddComment: (body: string) => Promise<void>
}

export function CardModal({ card, members, canDelete, onClose, onSave, onDelete, onAddComment }: CardModalProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [conflict, setConflict] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description)
    setConflict(false)
  }, [card.id, card.version])

  async function save(patch: Partial<Pick<Card, 'title' | 'description' | 'assigneeId' | 'labels' | 'dueDate'>>) {
    setSaving(true)
    const result = await onSave(patch)
    setSaving(false)
    if (result === 'conflict') setConflict(true)
  }

  function toggleLabel(label: Label) {
    const has = card.labels.includes(label)
    save({ labels: has ? card.labels.filter((l) => l !== label) : [...card.labels, label] })
  }

  return (
    <Modal open onClose={onClose} title="Card details" width="lg">
      {conflict && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Someone else updated this card while you were editing (version conflict). The latest version is shown —
            please redo your change.
          </span>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== card.title && save({ title: title.trim() })}
        className="w-full border-none bg-transparent text-lg font-semibold text-ink outline-none"
      />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== card.description && save({ description })}
              rows={4}
              placeholder="Add a description..."
              className="w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Comments ({card.comments.length})</label>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
              {card.comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <Avatar name={c.authorName} color="#6b7280" size="sm" />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-ink">{c.authorName}</span>
                      <span className="text-xs text-ink-muted">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-ink-muted">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!commentBody.trim()) return
                await onAddComment(commentBody.trim())
                setCommentBody('')
              }}
            >
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand"
              />
              <Button type="submit" size="sm">
                Send
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Assignee</label>
            <select
              value={card.assigneeId ?? ''}
              onChange={(e) => save({ assigneeId: e.target.value || null })}
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Due date</label>
            <input
              type="date"
              value={card.dueDate ? card.dueDate.slice(0, 10) : ''}
              onChange={(e) => save({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
                  className={clsx('cursor-pointer', !card.labels.includes(label) && 'opacity-30 hover:opacity-70')}
                >
                  <LabelBadge label={label} />
                </button>
              ))}
            </div>
          </div>

          {canDelete && (
            <Button variant="danger" size="sm" className="w-full" onClick={onDelete}>
              <Trash2 size={14} /> Delete card
            </Button>
          )}

          {saving && <p className="text-xs text-ink-muted">Saving…</p>}
        </div>
      </div>
    </Modal>
  )
}
