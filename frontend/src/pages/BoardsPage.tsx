import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AppShell } from '@/components/layout/AppShell'
import { client } from '@/lib/client'
import type { Board } from '@/lib/types'

export function BoardsPage() {
  const { workspaceId = '' } = useParams()
  const [boards, setBoards] = useState<Board[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    client.getBoards(workspaceId).then(setBoards)
  }, [workspaceId])

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/workspaces')}
            className="mb-1 flex items-center gap-1 text-sm text-ink-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} /> Workspaces
          </button>
          <h1 className="text-xl font-semibold text-ink">Boards</h1>
        </div>
        <Link
          to={`/workspaces/${workspaceId}/members`}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink hover:bg-surface-muted"
        >
          <Users size={15} /> Members
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => navigate(`/boards/${board.id}`)}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 text-left shadow-sm hover:border-brand/50 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center gap-2 text-brand">
              <LayoutGrid size={16} />
            </div>
            <h3 className="font-semibold text-ink">{board.name}</h3>
            <p className="text-sm text-ink-muted">{board.description}</p>
            <p className="text-xs text-ink-muted">
              Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
            </p>
          </button>
        ))}
      </div>
    </AppShell>
  )
}
