import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: 'you@example.com', password: 'password' } })

  async function onSubmit(values: FormValues) {
    try {
      setServerError('')
      await login(values.email, values.password)
      navigate('/workspaces')
    } catch {
      setServerError('Could not log in. Check your credentials.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold text-ink">
          <LayoutGrid className="text-brand" size={22} />
          TaskBoard
        </div>
        <h1 className="mb-1 text-xl font-semibold text-ink">Welcome back</h1>
        <p className="mb-6 text-sm text-ink-muted">Mock mode: any email/password logs you in as a seeded user.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          {serverError && <p className="text-sm text-danger">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-muted">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
