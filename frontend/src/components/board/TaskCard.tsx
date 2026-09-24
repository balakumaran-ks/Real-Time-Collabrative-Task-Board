import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageSquare, Clock } from 'lucide-react'
import clsx from 'clsx'
import { format, isPast } from 'date-fns'
import { Avatar } from '@/components/ui/Avatar'
import { LabelBadge } from '@/components/ui/Badge'
import type { Card, WorkspaceMember } from '@/lib/types'

interface TaskCardProps {
  card: Card
  assignee: WorkspaceMember | undefined
  onClick: () => void
}

export function TaskCard({ card, assignee, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const overdue = card.dueDate && isPast(new Date(card.dueDate))

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'cursor-grab space-y-2 rounded-lg border border-border bg-surface p-3 text-left shadow-sm active:cursor-grabbing',
        'hover:border-brand/50 hover:shadow-md transition-shadow',
        isDragging && 'opacity-50',
      )}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <LabelBadge key={label} label={label} />
          ))}
        </div>
      )}
      <p className="text-sm font-medium leading-snug text-ink">{card.title}</p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          {card.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {card.comments.length}
            </span>
          )}
          {card.dueDate && (
            <span className={clsx('flex items-center gap-1', overdue && 'text-danger')}>
              <Clock size={12} />
              {format(new Date(card.dueDate), 'MMM d')}
            </span>
          )}
        </div>
        {assignee && <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />}
      </div>
    </div>
  )
}
