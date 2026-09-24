import { type InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={clsx(
        'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors',
        'placeholder:text-ink-muted focus:border-brand',
        error && 'border-danger',
        className,
      )}
      {...props}
    />
    {error && <span className="text-xs text-danger">{error}</span>}
  </div>
))
Input.displayName = 'Input'
