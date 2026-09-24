import clsx from 'clsx'
import type { Label, Role } from '@/lib/types'

const labelColors: Record<Label, string> = {
  bug: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  feature: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  design: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  chore: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300',
}

export function LabelBadge({ label }: { label: Label }) {
  return (
    <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize', labelColors[label])}>
      {label}
    </span>
  )
}

const roleColors: Record<Role, string> = {
  owner: 'bg-brand-soft text-brand',
  admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  member: 'bg-surface-muted text-ink-muted',
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize', roleColors[role])}>
      {role}
    </span>
  )
}
