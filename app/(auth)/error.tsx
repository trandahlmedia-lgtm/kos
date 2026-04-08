'use client'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <p className="text-[#999999] mb-4">Something went wrong.</p>
        <button
          onClick={reset}
          className="text-sm text-[#E8732A] hover:text-[#d4621f]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
