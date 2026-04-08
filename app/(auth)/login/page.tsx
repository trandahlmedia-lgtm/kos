'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Login page.
 *
 * Authentication is handled entirely server-side via loginAction().
 * The Supabase client is NOT imported here — no API keys in the client bundle.
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginAction({ email, password })

    if (!result.success) {
      setError(result.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    // Refresh to pick up the new session cookie, then navigate to dashboard.
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#E8732A]">KOS</h1>
          <p className="text-sm text-[#555555] mt-1">Konvyrt Operating System</p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-[#999999] text-xs font-medium uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                maxLength={320}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#555555] focus-visible:ring-[#E8732A] focus-visible:border-[#E8732A]"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[#999999] text-xs font-medium uppercase tracking-wider"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                maxLength={128}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-[#555555] focus-visible:ring-[#E8732A] focus-visible:border-[#E8732A]"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8732A] hover:bg-[#d4621f] text-white border-0"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#555555] mt-6">
          Access is invite-only.
        </p>
      </div>
    </div>
  )
}
