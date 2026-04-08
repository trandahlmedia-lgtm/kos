'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[LeadsPage]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8">
      <AlertCircle size={32} className="text-red-400" />
      <div className="text-center">
        <p className="text-white font-medium">Failed to load leads</p>
        <p className="text-sm text-[#555555] mt-1">Something went wrong. Try refreshing.</p>
      </div>
      <Button onClick={reset} variant="outline" className="border-[#2a2a2a] text-[#999999]">
        Try again
      </Button>
    </div>
  )
}
