import clsx from 'clsx'

interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  className?: string
  ring?: boolean
}

export function Avatar({ name, color, size = 'md', className, ring }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      title={name}
      className={clsx(
        'flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-sm',
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
